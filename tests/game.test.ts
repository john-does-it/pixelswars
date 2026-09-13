import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState, reachableCells, canAttack, canCapture, purchaseStatus, movementCost, movementCostForDomain } from '../src/lib/game/model.ts'
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
	test(`${map.name}: balanced objectives with an asymmetric layout`, () => {
		const state = initialState(map)
		const armies = [1, 2].map((player) => state.units.filter((unit) => unit.player === player))
		assert.equal(armies[0].length, armies[1].length)
		assert.deepEqual(armies[0].map((unit) => unit.type).sort(), armies[1].map((unit) => unit.type).sort())
		for (const building of ['city', 'factory', 'hospital'] as const) {
			const top = state.cells.slice(0, Math.floor(state.cells.length / 2)).filter((cell) => cell.building === building).length
			const bottom = state.cells.slice(Math.ceil(state.cells.length / 2)).filter((cell) => cell.building === building).length
			assert.equal(top, bottom, building)
		}
		const expectedAirports = ['5', '7'].includes(map.id) ? 0 : ['6', '8'].includes(map.id) ? 2 : 1
		const airports = state.cells.filter((cell) => cell.building === 'airport')
		assert.equal(airports.length, expectedAirports)
		if (expectedAirports === 2) {
			assert.equal(airports.filter((cell) => cell.index < state.cells.length / 2).length, 1)
			assert.equal(airports.filter((cell) => cell.index > state.cells.length / 2).length, 1)
		}
		if (Number(map.id) >= 5 && Number(map.id) <= 8) {
			assert.ok(state.cells.every((cell) => cell.terrain !== 'water'))
			const isRoad = (index: number) => state.cells[index]?.terrain === 'road'
			for (const cell of state.cells.filter((candidate) => candidate.terrain === 'road')) {
				const left = cell.index % state.cols > 0 && isRoad(cell.index - 1)
				const right = cell.index % state.cols < state.cols - 1 && isRoad(cell.index + 1)
				const above = isRoad(cell.index - state.cols)
				const below = isRoad(cell.index + state.cols)
				if (cell.classes.includes('-corner') && cell.classes.includes('-bottom')) assert.ok(left && below)
				else if (cell.classes.includes('-corner') && cell.classes.includes('-top')) assert.ok(above && right)
				else if (cell.classes.includes('-v')) assert.ok(above && below)
				else assert.ok((left || cell.index % state.cols === 0) && (right || cell.index % state.cols === state.cols - 1))
			}
		}
		if (map.id === '9') assert.ok(state.cells.filter((cell) => cell.terrain === 'water').length >= 40)
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
	assert.ok(state.cells.every((cell) => cell.terrain !== 'water'))
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
			if (state.cells[next]?.cost <= 3 && !visited.has(next)) {
				visited.add(next)
				pending.push(next)
			}
		}
	}
	assert.equal(state.cells.filter((cell) => cell.building).length, 9)
	assert.ok(state.cells.filter((cell) => cell.building).every((cell) => visited.has(cell.index)))
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
	actions.endTurn(state)
	assert.deepEqual(state.money, { 1: 200, 2: 200 })
	assert.equal(unit.health, 85)
	assert.equal(unit.movement, 5)
	assert.equal(unit.attacks, 2)
	assert.equal(unit.capture, 1)
	actions.endTurn(state)
	actions.endTurn(state)
	assert.equal(unit.health, 100)
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
	pending.shift()!()
	await fight
	assert.equal(attacker.attacks, 1)
	assert.equal(defender.attacks, 2)
	assert.equal(state.fighting, false)
})

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
	state.cells[20].defense = 0
	await game.fight(defender)
	assert.equal(defender.health, 96)
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
