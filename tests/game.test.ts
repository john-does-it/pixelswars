import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertConnectedRoads, assertWaterShores } from './map-assertions.ts'
import { readFileSync } from 'node:fs'
import { initialState, neighbors, reachableCells, canAttack, canCapture, purchaseStatus, movementCost, movementCostForDomain, applyDamage } from '../src/lib/game/model.ts'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import * as actions from '../src/lib/game/actions.ts'
import { createController } from '../src/lib/game/controller.ts'
import type { Cell, GameMap, GameState, Player, Unit, UnitTypeId } from '../src/lib/game/types.ts'

const maps: GameMap[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => JSON.parse(readFileSync(new URL(`../src/lib/data/board-${id}.json`, import.meta.url), 'utf8')) as GameMap)
const additionalMaps = maps.slice(2)
const fixture = () => initialState(maps[0])
const spawn = (state: GameState, type: UnitTypeId, player: Player, cell: number): Unit => {
	const unit = createUnit(type, player, cell, state.nextId++)
	state.units.push(unit)
	return unit
}

test('water costs two for ships, one for aircraft and is impassable to ground units', () => {
	const state = fixture()
	const water = state.cells.find((cell) => cell.terrain === 'water')
	assert.ok(water)
	assert.equal(water.cost, 2)
	assert.equal(movementCostForDomain('naval', water), 2)
	assert.equal(movementCostForDomain('air', water), 1)
	assert.equal(movementCostForDomain('ground', water), Infinity)
	assert.equal(movementCost(state.units[1], water), Infinity)
})

for (const map of additionalMaps) {
	test(`${map.name}: balanced armies and reachable objectives with an asymmetric layout`, () => {
		const state = initialState(map)
		const armies = [1, 2].map((player) => state.units.filter((unit) => unit.player === player))
		assert.equal(armies[0].length, armies[1].length)
		assert.deepEqual(armies[0].map((unit) => unit.type).sort(), armies[1].map((unit) => unit.type).sort())
		for (const building of ['city', 'factory', 'hospital'] as const) {
			if (map.id === '8' && building === 'city') {
				// Two cities near each deployment; the inland objectives are oil fields.
				assert.deepEqual(
					state.cells.filter((cell) => cell.building === 'city').map((cell) => cell.index),
					[16, 28, 101, 113]
				)
				continue
			}
			const top = state.cells.slice(0, Math.floor(state.cells.length / 2)).filter((cell) => cell.building === building).length
			const bottom = state.cells.slice(Math.ceil(state.cells.length / 2)).filter((cell) => cell.building === building).length
			assert.equal(top, bottom, building)
		}
		const expectedAirports = ['4', '5', '7'].includes(map.id) ? 0 : ['3', '6', '8'].includes(map.id) ? 2 : 1
		const airports = state.cells.filter((cell) => cell.building === 'airport')
		assert.equal(airports.length, expectedAirports)
		if (expectedAirports === 2) {
			assert.equal(airports.filter((cell) => cell.index < state.cells.length / 2).length, 1)
			assert.equal(airports.filter((cell) => cell.index > state.cells.length / 2).length, 1)
		}
		if (Number(map.id) >= 5 && Number(map.id) <= 8) {
			if (map.id !== '5') assert.ok(state.cells.every((cell) => cell.terrain !== 'water'))
			assertConnectedRoads(state, map.id === '6')
		}
		if (map.id === '9') assert.ok(state.cells.filter((cell) => cell.terrain === 'water').length >= 40)
		if (map.id === '7') {
			for (const building of state.cells.filter((cell) => cell.building)) {
				assert.ok(
					neighbors(state, building.index).some((index) => state.cells[index].terrain === 'road'),
					`building ${building.index} must have road access`
				)
			}
		}
		assert.ok(state.cells.some((cell, index) => cell.classes.join(' ') !== state.cells.at(-index - 1)?.classes.join(' ')))

		for (const army of armies) {
			const visited = new Set([army.find((unit) => unit.type === 'infantry')!.cell])
			const pending = [...visited]
			while (pending.length) {
				const index = pending.pop()!
				for (const next of [index - state.cols, index + state.cols, ...(index % state.cols ? [index - 1] : []), ...(index % state.cols < state.cols - 1 ? [index + 1] : [])]) {
					if (state.cells[next] && movementCostForDomain('ground', state.cells[next]) <= unitTypes.infantry.movement && !visited.has(next)) {
						visited.add(next)
						pending.push(next)
					}
				}
			}
			assert.ok(state.cells.filter((cell) => cell.building).every((cell) => visited.has(cell.index)))
		}
	})
}

for (const map of maps) {
	test(`map ${map.id}: dimensions, initial armies and isolated sessions`, () => {
		const firstSession = initialState(map),
			secondSession = initialState(map)
		assert.equal(firstSession.cells.length, firstSession.cols * firstSession.rows)
		assert.equal(firstSession.units.length, 10)
		assert.ok(firstSession.units.every((unit) => unit.cell >= 0 && unit.cell < firstSession.cells.length))
		firstSession.units[0].health = 1
		firstSession.cells[0].owner = 2
		firstSession.money[1] = 1000
		assert.equal(secondSession.units[0].health, 120)
		assert.equal(secondSession.cells[0].owner, 0)
		assert.equal(secondSession.money[1], 0)
	})
	test(`map ${map.id}: movement, occupancy, edge wrapping and cancellation`, () => {
		const state = initialState(map)
		const unit = state.units[1]
		actions.select(state, unit.id)
		assert.ok(!reachableCells(state).includes(0))
		const destination = unit.cell + state.cols
		assert.ok(actions.move(state, destination))
		assert.equal(unit.movement, unitTypes[unit.type].movement - state.cells[destination].cost)
		actions.cancelMove(state)
		assert.equal(unit.cell, 1)
		assert.equal(unit.movement, 5)
		actions.select(state, unit.id)
		unit.cell = state.cols - 1
		assert.equal(actions.move(state, state.cols), false)
		unit.movement = 0
		assert.deepEqual(reachableCells(state), [])
	})
}

test('rectangular map keeps equal armies, terrain budgets and symmetric reachable objectives', () => {
	const state = initialState(maps[1])
	assert.ok(state.units.some((unit) => unit.player === 1 && unit.type === 'infantry-rocket' && unit.cell === 4))
	assert.ok(state.units.some((unit) => unit.player === 2 && unit.type === 'infantry-rocket' && unit.cell === 91))
	for (const cell of state.cells) {
		const opposite = state.cells[state.cells.length - 1 - cell.index]
		if (cell.building !== 'airport' && opposite.building !== 'airport') assert.equal(cell.building, opposite.building)
		assert.equal(cell.owner, 0)
	}
	assert.equal(state.cells.filter((cell) => cell.terrain === 'water').length, 4)
	for (const terrain of ['moutain', 'road', 'forest']) {
		const count = (cells: Cell[]) => cells.filter((cell) => cell.terrain === terrain).length
		assert.ok(Math.abs(count(state.cells.slice(0, 48)) - count(state.cells.slice(48))) <= (terrain === 'forest' ? 1 : 0))
	}
	for (const unit of state.units) {
		assert.ok(state.units.some((other) => other.player !== unit.player && other.type === unit.type && other.cell === 95 - unit.cell))
	}
	// Every objective can be reached by infantry without crossing water or mountains.
	const visited = new Set([1])
	const pending = [1]
	while (pending.length) {
		const index = pending.pop()!
		for (const next of [index - 12, index + 12, ...(index % 12 ? [index - 1] : []), ...(index % 12 < 11 ? [index + 1] : [])]) {
			if (state.cells[next] && movementCostForDomain('ground', state.cells[next]) <= 3 && !visited.has(next)) {
				visited.add(next)
				pending.push(next)
			}
		}
	}
	assert.equal(state.cells.filter((cell) => cell.building).length, 9)
	assert.ok(state.cells.filter((cell) => cell.building).every((cell) => visited.has(cell.index)))
})

test('map 4 has a continuous central road without an airport', () => {
	const state = initialState(maps[3])
	assert.equal(state.cells[48].terrain, 'road')
	assert.equal(state.cells[48].building, null)
	assertConnectedRoads(state)
})

test('map 6 buildings follow the sketched moves and keep their new roadside access', () => {
	const state = initialState(maps[5])
	for (const [index, building] of [
		[19, 'factory'],
		[21, 'hospital'],
		[32, 'city'],
		[66, 'city'],
		[77, 'hospital'],
		[79, 'factory']
	] as const)
		assert.equal(state.cells[index].building, building)
	for (const index of [10, 12, 14, 84, 86, 88]) assert.equal(state.cells[index].building, null)
	assert.equal(state.cells[61].terrain, 'moutain')
	assert.equal(state.cells[60].terrain, 'grass')
	for (const index of [26, 46, 47, 48, 49, 50, 51, 52, 72]) assert.equal(state.cells[index].terrain, 'road')
	for (const index of [45, 53]) assert.equal(state.cells[index].terrain, 'grass')
	assert.deepEqual(state.cells[49].classes, ['-road', '-cross'])
	assertConnectedRoads(state, true)
})

test('small corner ponds preserve deployment cells and secondary roads connect on maps 2, 3 and 5', () => {
	for (const map of maps.filter((candidate) => ['2', '3', '5'].includes(candidate.id))) {
		const state = initialState(map)
		assert.equal(state.cells.filter((cell) => cell.terrain === 'water').length, map.id === '5' ? 8 : 4)
		if (map.id === '2') for (const index of [72, 73, 84, 85]) assert.notEqual(state.cells[index].terrain, 'water')
		if (map.id === '3') for (const index of [9, 10, 20, 21]) assert.notEqual(state.cells[index].terrain, 'water')
		assertWaterShores(state)
		assertConnectedRoads(state)
		for (const unit of state.units) {
			assert.ok(Number.isFinite(movementCost(unit, state.cells[unit.cell])))
			assert.ok(reachableCells(state, unit).length > 0)
		}
	}
})

test('capture requires infantry on an enemy/neutral building; two turns transfer ownership', () => {
	const state = fixture(),
		unit = state.units[1],
		cell = state.cells[8]
	unit.cell = 8
	actions.select(state, unit.id)
	assert.ok(canCapture(state))
	assert.ok(actions.capture(state))
	assert.equal(cell.capturePoints, 10)
	assert.equal(cell.owner, 0)
	assert.equal(actions.capture(state), false)
	actions.endTurn(state)
	actions.endTurn(state)
	actions.select(state, unit.id)
	assert.ok(actions.capture(state))
	assert.equal(cell.owner, 1)
	assert.equal(cell.capturePoints, 20)
	assert.equal(canCapture(state), false)
	actions.cancelMove(state)
	assert.equal(unit.cell, 8)
	unit.cell = 11
	actions.select(state, unit.id)
	unit.capture = 1
	assert.equal(canCapture(state), false)
})

test('capture feedback does not award income until the next owner turn', () => {
	const state = fixture()
	const unit = state.units[1]
	unit.cell = 10
	actions.endTurn(state)
	actions.endTurn(state)
	actions.select(state, unit.id)
	actions.capture(state)
	assert.deepEqual(state.capturedCells, [])
	unit.capture = 1
	actions.capture(state)
	assert.deepEqual(state.capturedCells, [10])
	assert.deepEqual(state.incomeCells, [])
	assert.equal(state.money[1], 0)
	actions.endTurn(state)
	assert.deepEqual(state.capturedCells, [])
	assert.equal(state.money[1], 0)
	actions.endTurn(state)
	assert.deepEqual(state.incomeCells, [10])
	assert.equal(state.money[1], 200)
})

test('factories enforce budget, ownership and occupancy, including exact price', () => {
	const state = fixture(),
		cell = state.cells[8]
	actions.openProduction(state, 8)
	assert.equal(state.productionIndex, null)
	cell.owner = 1
	actions.openProduction(state, 8)
	assert.equal(purchaseStatus(state, 'infantry').missing, 200)
	assert.equal(actions.buy(state, 'infantry'), false)
	state.money[1] = 200
	assert.ok(purchaseStatus(state, 'infantry').available)
	const count = state.units.length
	assert.ok(actions.buy(state, 'infantry'))
	assert.equal(state.units.length, count + 1)
	assert.equal(state.money[1], 0)
	assert.equal(state.productionIndex, null)
	actions.openProduction(state, 8)
	state.money[1] = 10000
	assert.ok(purchaseStatus(state, 'tank').occupied)
	assert.equal(actions.buy(state, 'tank'), false)
	assert.equal(actions.buy(state, 'unknown'), false)
	state.player = 2
	assert.equal(actions.buy(state, 'infantry'), false)
	assert.equal(state.money[2], 0)
})

test('turns pay only the incoming player, reset capacities and heal owned hospitals', () => {
	const state = fixture(),
		unit = state.units[1]
	state.cells[10].owner = 1
	state.cells[54].owner = 2
	state.cells[9].owner = 1
	unit.cell = 9
	unit.health = 60
	unit.movement = unit.attacks = unit.capture = 0
	actions.endTurn(state)
	assert.deepEqual(state.money, { 1: 0, 2: 200 })
	assert.equal(unit.health, 60)
	assert.deepEqual(state.healedCells, {})
	actions.endTurn(state)
	assert.deepEqual(state.money, { 1: 200, 2: 200 })
	assert.equal(unit.health, 100)
	assert.deepEqual(state.healedCells, { 9: 40 })
	assert.equal(unit.movement, 5)
	assert.equal(unit.attacks, 2)
	assert.equal(unit.capture, 1)
	actions.endTurn(state)
	assert.deepEqual(state.healedCells, {})
	actions.endTurn(state)
	assert.equal(unit.health, 100)
	assert.deepEqual(state.healedCells, {})
	unit.health = 20
	actions.endTurn(state)
	actions.endTurn(state)
	assert.equal(unit.health, 70)
	assert.deepEqual(state.healedCells, { 9: 50 })
})

test('real controller combat applies health-scaled retaliation and locks actions until completion', async () => {
	const state = fixture()
	state.units = []
	const attacker = spawn(state, 'infantry', 1, 18),
		defender = spawn(state, 'infantry', 2, 19)
	state.cells[18].defense = state.cells[19].defense = 0
	const pending: Array<() => void> = []
	const game = createController(state, { delay: () => new Promise((resolve) => pending.push(resolve)) })
	game.select(attacker.id)
	const fight = game.fight(defender)
	assert.equal(defender.health, 61)
	assert.equal(state.fighting, true)
	assert.equal(state.combatTargetIndex, defender.cell)
	game.move(26)
	game.cancel()
	game.confirm()
	game.endTurn()
	assert.equal(attacker.cell, 18)
	assert.equal(state.selectedId, attacker.id)
	assert.equal(state.round, 1)
	pending.shift()!()
	await Promise.resolve()
	assert.equal(attacker.health, 76)
	assert.equal(state.combatTargetIndex, attacker.cell, 'Retaliation highlights its actual recipient')
	pending.shift()!()
	await fight
	assert.equal(attacker.attacks, 1)
	assert.equal(defender.attacks, 2)
	assert.equal(state.fighting, false)
	assert.equal(state.combatTargetIndex, null)
})

for (const type of ['artillery', 'infantry-sniper', 'anti-air'] as const) {
	test(`${type}: the last shot keeps its target visible until combat completes`, async () => {
		const state = fixture()
		state.units = []
		const attacker = spawn(state, type, 1, 18)
		const defender = spawn(state, type === 'anti-air' ? 'helicopter' : 'infantry', 2, type === 'artillery' ? 21 : 20)
		attacker.attacks = 1
		let release: () => void = () => {}
		let firstDelay = true
		const game = createController(state, {
			delay: () => {
				if (!firstDelay) return Promise.resolve()
				firstDelay = false
				return new Promise((resolve) => (release = resolve))
			}
		})
		game.select(attacker.id)
		const combat = game.fight(defender)
		assert.equal(attacker.attacks, 0)
		assert.equal(state.combatTargetIndex, defender.cell)
		release()
		await combat
		assert.equal(state.combatTargetIndex, null)
		game.dispose()
	})
}

test('vehicle combat uses each unit’s maximum health for its first shot and retaliation', async () => {
	const state = fixture()
	state.units = []
	const attacker = spawn(state, 'tank', 1, 18)
	const defender = spawn(state, 'jeep', 2, 19)
	state.cells[18].defense = state.cells[19].defense = 0
	const game = createController(state, { delay: async () => {} })
	game.select(attacker.id)
	await game.fight(defender)
	assert.equal(defender.health, 23)
	assert.equal(attacker.health, 176)
	assert.equal(attacker.attacks, 1)
	game.dispose()
})

test('artillery leaves all infantry equally wounded and healthy vehicles alive after one shot', async () => {
	const remainingHealth: Partial<Record<UnitTypeId, number>> = { infantry: 20, 'infantry-rocket': 20, 'infantry-sniper': 20, jeep: 41, 'anti-air': 49, tank: 90 }
	for (const [type, health] of Object.entries(remainingHealth)) {
		const state = fixture()
		state.units = []
		const artillery = spawn(state, 'artillery', 1, 18)
		const defender = spawn(state, type as UnitTypeId, 2, 22)
		state.cells[22].defense = 0
		assert.equal(unitTypes.artillery.cost, 1600)
		const game = createController(state, { delay: async () => {} })
		game.select(artillery.id)
		await game.fight(defender)
		assert.equal(defender.health, health, type)
		assert.equal(artillery.health, 120)
		assert.equal(artillery.attacks, 0)
		assert.ok(state.units.includes(defender))
		game.dispose()
	}
})

test('full-health infantry leaves artillery at 60 HP after two shots and rockets leave 40 HP after one', async () => {
	for (const [attackerType, remainingHealthAfterShots] of [
		['infantry', [90, 60]],
		['infantry-rocket', [40]]
	] as const) {
		const state = fixture()
		state.units = []
		const attacker = spawn(state, attackerType, 1, 18)
		const artillery = spawn(state, 'artillery', 2, 19)
		state.cells[artillery.cell].defense = 0
		const game = createController(state, { delay: async () => {} })
		game.select(attacker.id)
		for (const remainingHealth of remainingHealthAfterShots) {
			await game.fight(artillery)
			assert.equal(artillery.health, remainingHealth, attackerType)
			assert.equal(attacker.health, 100, 'adjacent artillery cannot retaliate')
		}
		assert.equal(attacker.attacks, 0)
		game.dispose()
	}
})

test('tanks cross three grass cells per turn while infantry crosses two and jeeps four', () => {
	for (const [type, steps] of [
		['tank', 3],
		['infantry', 2],
		['jeep', 4]
	] as const) {
		const state = fixture()
		state.units = []
		for (const cell of state.cells) Object.assign(cell, { terrain: 'grass', cost: 2 })
		const unit = spawn(state, type, 1, 0)
		actions.select(state, unit.id)
		for (let destination = 1; destination <= steps; destination++) assert.equal(actions.move(state, destination), true)
		assert.equal(actions.move(state, steps + 1), false)
		actions.cancelMove(state)
		assert.equal(unit.cell, 0)
		assert.equal(unit.movement, unitTypes[type].movement)
	}
})

test('artillery damage stays equal across infantry types with cover and reduced attacker health', () => {
	for (const type of ['infantry', 'infantry-rocket', 'infantry-sniper'] as const) {
		for (const [attackerHealth, terrainDefense, remainingHealth] of [
			[120, 50, 27],
			[60, 0, 60],
			[60, 50, 64]
		]) {
			const state = fixture()
			const artillery = createUnit('artillery', 1, 18, 100)
			const defender = createUnit(type, 2, 22, 101)
			artillery.health = attackerHealth
			state.cells[22].defense = terrainDefense
			applyDamage(state, artillery, defender)
			assert.equal(defender.health, remainingHealth, `${type}, ${attackerHealth} attacker HP, ${terrainDefense} cover`)
		}
	}
})

test('planes defeat helicopters and damage armor heavily but remain vulnerable to anti-air', async () => {
	for (const [attackerType, defenderType, remainingHealth] of [
		['plane', 'helicopter', 0],
		['plane', 'tank', 66],
		['anti-air', 'plane', 53]
	] as const) {
		const state = fixture()
		state.units = []
		const attacker = spawn(state, attackerType, 1, 18)
		const defender = spawn(state, defenderType, 2, attackerType === 'anti-air' ? 20 : 19)
		state.cells[defender.cell].defense = 0
		const game = createController(state, { delay: async () => {} })
		game.select(attacker.id)
		await game.fight(defender)
		assert.equal(defender.health, remainingHealth)
		if (attackerType === 'anti-air') {
			assert.ok(attacker.health > 0)
			await game.fight(defender)
			assert.equal(defender.health, 0, 'Anti-air can finish the plane with two shots from outside retaliation range')
		}
		game.dispose()
	}
})

test('artillery dead zone, attack bonuses and forbidden targets', async () => {
	const state = fixture()
	state.units = []
	const attacker = spawn(state, 'artillery', 1, 18),
		defender = spawn(state, 'tank', 2, 19)
	const game = createController(state, { delay: async () => {} })
	game.select(attacker.id)
	await game.fight(defender)
	assert.equal(defender.health, 180)
	assert.equal(attacker.attacks, 1)
	defender.cell = 20
	await game.fight(defender)
	assert.equal(defender.health, 180)
	assert.equal(attacker.attacks, 1)
	defender.cell = 21
	state.cells[21].defense = 0
	await game.fight(defender)
	assert.equal(defender.health, 90)
	assert.equal(attacker.health, 120)
	assert.equal(attacker.attacks, 0)
	defender.type = 'plane'
	attacker.type = 'tank'
	defender.cell = 19
	assert.equal(canAttack(state, attacker, defender), false)
})

test('death clears selection, declares a winner and prevents subsequent actions', async () => {
	const state = fixture()
	state.units = []
	const attacker = spawn(state, 'jeep', 1, 18),
		defender = spawn(state, 'tank', 2, 19)
	attacker.health = 1
	const game = createController(state, { delay: async () => {} })
	game.select(attacker.id)
	await game.fight(defender)
	assert.equal(state.units.length, 1)
	assert.equal(state.selectedId, null)
	assert.equal(state.winner, 2)
	game.endTurn()
	assert.equal(state.round, 1)
})

test('attack commits position; stale and friendly targets never consume ammunition', async () => {
	const state = fixture()
	state.units = []
	const attacker = spawn(state, 'infantry', 1, 18),
		defender = spawn(state, 'artillery', 2, 19)
	const game = createController(state, { delay: async () => {} })
	game.select(attacker.id)
	attacker.cell = 26
	await game.fight(defender)
	game.cancel()
	assert.equal(attacker.cell, 26)
	game.select(attacker.id)
	const ammo = attacker.attacks
	defender.cell = 63
	await game.fight(defender)
	await game.fight(attacker)
	assert.equal(attacker.attacks, ammo)
})

test('disposing a game during a pending fight stops later damage and sounds', async () => {
	const state = fixture()
	state.units = []
	const attacker = spawn(state, 'infantry', 1, 18),
		defender = spawn(state, 'infantry', 2, 19)
	let resolve: () => void = () => {}
	const sounds: string[] = []
	const game = createController(state, { sound: (name) => sounds.push(name), delay: () => new Promise((resolveDelay) => (resolve = resolveDelay)) })
	game.select(attacker.id)
	const fight = game.fight(defender)
	game.dispose()
	const count = sounds.length
	resolve()
	await fight
	assert.equal(attacker.health, 100)
	assert.equal(sounds.length, count)
})

test('owners secure contested buildings once per action without income or ownership changes', () => {
	for (const index of [8, 9, 10]) {
		const state = fixture()
		const unit = state.units[1]
		const cell = state.cells[index]
		cell.owner = 1
		cell.capturePoints = 10
		unit.cell = index
		actions.select(state, unit.id)
		assert.ok(canCapture(state))
		assert.ok(actions.capture(state))
		assert.equal(cell.owner, 1)
		assert.equal(cell.capturePoints, 20)
		assert.equal(unit.capture, 0)
		assert.deepEqual(state.money, { 1: 0, 2: 0 })
		assert.deepEqual(state.securedCells, [index])
		assert.deepEqual(state.capturedCells, [])
		assert.equal(actions.capture(state), false)
		actions.cancelMove(state)
		assert.equal(unit.cell, index)
		unit.capture = 1
		actions.select(state, unit.id)
		assert.equal(canCapture(state), false)
		cell.capturePoints = 10
		unit.capture = 0
		assert.equal(canCapture(state), false)
		actions.endTurn(state)
		assert.deepEqual(state.securedCells, [])
	}
})

test('airport produces air units while factories produce rocket infantry', () => {
	assert.equal(unitTypes['infantry-rocket'].cost, 400)
	assert.equal(unitTypes['infantry-rocket'].movement, 4)
	const state = initialState(maps[1])
	const airport = state.cells.find((cell) => cell.building === 'airport')
	assert.ok(airport)
	assert.equal(state.cells.filter((cell) => cell.building === 'airport').length, 1)
	assert.ok([41, 42, 53, 54].includes(airport.index))
	airport.owner = 1
	actions.openProduction(state, airport.index)
	state.money[1] = 1799
	assert.equal(purchaseStatus(state, 'helicopter').missing, 1)
	assert.equal(actions.buy(state, 'helicopter'), false)
	state.money[1] = 1800
	assert.equal(actions.buy(state, 'infantry-rocket'), false)
	assert.ok(actions.buy(state, 'helicopter'))
	assert.equal(state.money[1], 0)
	state.units.pop()
	actions.openProduction(state, airport.index)
	state.money[1] = 2999
	assert.equal(purchaseStatus(state, 'plane').missing, 1)
	assert.equal(actions.buy(state, 'plane'), false)
	state.money[1] = 3000
	assert.equal(actions.buy(state, 'infantry-rocket'), false)
	assert.ok(actions.buy(state, 'plane'))
	assert.equal(state.money[1], 0)
	actions.openProduction(state, airport.index)
	state.money[1] = 10000
	assert.equal(actions.buy(state, 'plane'), false)
	const factory = state.cells.find((cell) => cell.building === 'factory')
	assert.ok(factory)
	factory.owner = 1
	actions.openProduction(state, factory.index)
	assert.equal(actions.buy(state, 'plane'), false)
	assert.equal(actions.buy(state, 'helicopter'), false)
	assert.ok(actions.buy(state, 'infantry-rocket'))
})

test('factories produce anti-air units with range 1–2 and ground attacks receive no retaliation', async () => {
	const state = fixture()
	state.units = []
	const antiAir = spawn(state, 'anti-air', 1, 18)
	const infantry = spawn(state, 'infantry', 2, 19)
	const plane = spawn(state, 'plane', 2, 20)
	assert.ok(canAttack(state, antiAir, plane))
	assert.equal(canAttack(state, antiAir, infantry), false)
	assert.equal(canAttack(state, infantry, antiAir), true)

	state.player = 2
	const game = createController(state, { delay: async () => {} })
	game.select(infantry.id)
	const health = infantry.health
	await game.fight(antiAir)
	assert.equal(infantry.health, health)

	const factory = state.cells.find((cell) => cell.building === 'factory')
	assert.ok(factory)
	state.units = state.units.filter((unit) => unit.cell !== factory.index)
	factory.owner = 2
	actions.openProduction(state, factory.index)
	state.money[2] = unitTypes['anti-air'].cost
	assert.ok(actions.buy(state, 'anti-air'))
	assert.ok(state.units.some((unit) => unit.type === 'anti-air' && unit.cell === factory.index))
})

test('air units use their increased movement capacities', () => {
	assert.equal(unitTypes.plane.movement, 10)
	assert.equal(unitTypes.helicopter.movement, 8)
	assert.equal(unitTypes['anti-air'].movement, 6)
	assert.equal(unitTypes['anti-air'].attacks, 2)
	assert.equal(unitTypes['anti-air'].cost, 1000)
	assert.equal(unitTypes['anti-air'].selectSound, unitTypes.artillery.selectSound)
	assert.equal(unitTypes['anti-air'].fightSound, unitTypes.artillery.fightSound)
	assert.equal(unitTypes['anti-air'].exclusion + 1, 1)
	assert.equal(unitTypes['anti-air'].range, 2)
})

test('planes move at one point per terrain and cannot be attacked by ground units', () => {
	const state = fixture()
	state.units = []
	const plane = spawn(state, 'plane', 1, 20)
	actions.select(state, plane.id)
	for (const cost of [1, 2, 3, 5, 10]) {
		plane.cell = 20
		plane.movement = 1
		state.cells[21].cost = cost
		assert.ok(actions.move(state, 21))
		assert.equal(plane.movement, 0)
	}
	for (const type of ['infantry', 'infantry-rocket', 'jeep', 'tank', 'artillery'] as const) {
		const enemy = spawn(state, type, 2, 22)
		assert.equal(canAttack(state, enemy, plane), false)
		assert.ok(canAttack(state, plane, enemy))
		state.units.pop()
	}
	const enemyPlane = spawn(state, 'plane', 2, 22)
	assert.ok(canAttack(state, enemyPlane, plane))
	plane.cell = 8
	state.cells[8].owner = 0
	assert.equal(canCapture(state), false)
})

test('helicopters ignore terrain costs, attack ground and air, and cannot capture', () => {
	const state = fixture()
	state.units = []
	const helicopter = spawn(state, 'helicopter', 1, 20)
	actions.select(state, helicopter.id)
	for (const cost of [1, 2, 3, 5, 10]) {
		helicopter.cell = 20
		helicopter.movement = 1
		state.cells[21].cost = cost
		assert.ok(actions.move(state, 21))
		assert.equal(helicopter.movement, 0)
	}
	for (const type of ['infantry', 'infantry-rocket', 'jeep', 'tank', 'artillery'] as const) {
		const enemy = spawn(state, type, 2, 22)
		assert.equal(canAttack(state, enemy, helicopter), false)
		assert.ok(canAttack(state, helicopter, enemy))
		state.units.pop()
	}
	const enemyPlane = spawn(state, 'plane', 2, 22)
	assert.ok(canAttack(state, helicopter, enemyPlane))
	assert.ok(canAttack(state, enemyPlane, helicopter))
	helicopter.cell = 8
	state.cells[8].owner = 0
	assert.equal(canCapture(state), false)
})

test('selecting each air unit plays its dedicated engine sound', () => {
	const state = fixture()
	state.units = []
	const plane = spawn(state, 'plane', 1, 20)
	const helicopter = spawn(state, 'helicopter', 1, 22)
	const sounds: string[] = []
	const game = createController(state, { sound: (name) => sounds.push(name) })
	game.select(plane.id)
	game.select(helicopter.id)
	assert.deepEqual(sounds, ['plane-engine', 'helico-engine'])
})

test('the sound preference suppresses game effects', () => {
	const state = fixture()
	const sounds: string[] = []
	const game = createController(state, { sound: (name) => sounds.push(name) })
	state.sound = false
	game.select(state.units[0]!.id)
	assert.deepEqual(sounds, [])
	state.sound = true
	game.select(state.units[0]!.id)
	assert.equal(sounds.length, 1)
})

test('ground units cannot retaliate against a plane and air units get no terrain defense', async () => {
	const state = fixture()
	state.units = []
	const plane = spawn(state, 'plane', 1, 20)
	const jeep = spawn(state, 'jeep', 2, 21)
	const game = createController(state, { delay: async () => {} })
	game.select(plane.id)
	await game.fight(jeep)
	assert.equal(plane.health, unitTypes.plane.maxHealth)
	assert.ok(jeep.health < unitTypes.jeep.maxHealth)
	assert.equal(plane.attacks, 0)
	const second = spawn(state, 'plane', 2, 21)
	const full = second.health
	state.cells[21].defense = 50
	const { applyDamage } = await import('../src/lib/game/model.ts')
	applyDamage(state, plane, second)
	const damage = full - second.health
	second.health = full
	state.cells[21].defense = 0
	applyDamage(state, plane, second)
	assert.equal(full - second.health, damage)
})
