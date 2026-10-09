import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState, canAttack, attackCells, unitAt, canCapture } from '../src/lib/game/model.ts'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import * as actions from '../src/lib/game/actions.ts'
import { canEmbark, deploymentCells, embark, deploy, boardingPaths, selectedPassenger } from '../src/lib/game/transport.ts'
import { createController } from '../src/lib/game/controller.ts'
import { applySnapshot, matchSnapshot, validCommand } from '../src/lib/game/online.ts'
import { runAiTurn } from '../src/lib/game/ai.ts'
import { projectExpertDecision } from '../src/lib/game/expert-ai.ts'
import { readMap, mapJson } from '../src/lib/map-editor/model.ts'
import type { GameMap } from '../src/lib/game/types.ts'

const map: GameMap = {
	id: '1',
	name: 'Transport test',
	cols: 5,
	rows: 5,
	cells: Array.from({ length: 25 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })),
	units: [
		{ type: 'transport', player: 1, cell: 12 },
		{ type: 'infantry', player: 1, cell: 7 },
		{ type: 'infantry-rocket', player: 1, cell: 11 },
		{ type: 'infantry-sniper', player: 1, cell: 13 },
		{ type: 'infantry', player: 1, cell: 17 },
		{ type: 'tank', player: 2, cell: 24 }
	]
}
function fixture() {
	const state = initialState(map)
	actions.select(state, 0)
	return state
}

test('clicking a reachable jeep follows the route and loads infantry, charging the final terrain cost', async () => {
	const state = fixture()
	const passenger = state.units[1]
	passenger.cell = 2
	passenger.movement = 3
	assert.equal(boardingPaths(state, passenger).has(12), false)
	passenger.movement = 4
	assert.deepEqual(boardingPaths(state, passenger).get(12), { cost: 4, path: [7, 12] })
	const steps: number[] = []
	const game = createController(state, { delay: async () => {}, onChange: () => steps.push(passenger.cell) })
	game.select(passenger.id)
	game.clickCell(12)
	await new Promise((resolve) => setImmediate(resolve))
	assert.ok(steps.includes(7))
	assert.equal(state.selectedId, 0)
	assert.equal(state.units[0].cargo?.[0], passenger)
	assert.equal(state.units.includes(passenger), false)
	assert.equal(passenger.movement, 0)
	assert.equal(state.moving, false)
	game.cancel()
	assert.equal(state.units[0].cargo?.length, 1)
})

test('boarding routes reject full or enemy vehicles and cannot use a jeep as a shortcut', () => {
	const state = fixture()
	const passenger = state.units[1]
	state.cells.forEach((cell) => {
		if (![2, 7, 12, 17, 22].includes(cell.index)) cell.terrain = 'water'
	})
	state.units = state.units.filter((unit) => unit.id === 0 || unit.id === 1)
	const secondTransport = createUnit('transport', 1, 22, 20)
	state.units.push(secondTransport)
	assert.equal(boardingPaths(state, passenger).has(22), false)
	state.units[0].cargo = [createUnit('infantry', 1, 0, 21), createUnit('infantry', 1, 1, 22), createUnit('infantry', 1, 2, 23)]
	assert.equal(boardingPaths(state, passenger).size, 0)
	state.units[0].cargo = []
	state.units[0].player = 2
	assert.equal(boardingPaths(state, passenger).size, 0)
})

test('select a passenger, cancel without undoing jeep movement, then deploy by clicking or directional movement', () => {
	const state = fixture()
	const game = createController(state)
	game.select(1)
	game.move(12)
	assert.equal(state.selectedId, 0)
	game.move(7)
	const movement = state.units[0].movement
	game.selectPassenger(1)
	assert.equal(selectedPassenger(state)?.id, 1)
	game.cancel()
	assert.equal(state.units[0].cell, 7)
	assert.equal(state.units[0].movement, movement)
	game.selectPassenger(1)
	state.cells[2].terrain = 'water'
	game.clickCell(2)
	game.clickCell(7)
	assert.equal(state.deployingPassengerId, 1)
	game.move(6)
	assert.equal(unitAt(state, 6)?.id, 1)
	assert.equal(state.deployingPassengerId, null)
	assert.equal(state.units[0].movement, movement)
	game.move(12)
	assert.equal(state.units[0].cell, 12, 'the jeep can continue moving after deployment')
	assert.equal(state.units[0].movement, movement - 2)
	game.cancel()
	assert.equal(state.units[0].cell, 7, 'cancel only undoes movement after deployment')
	assert.equal(state.units[0].movement, movement)
})

test('transport has jeep durability, movement, price and vulnerabilities but no attack, ammo or retaliation', async () => {
	for (const key of ['movement', 'defense', 'maxHealth', 'cost'] as const) assert.equal(unitTypes.transport[key], unitTypes.jeep[key])
	assert.equal(unitTypes.transport.attack, 0)
	assert.equal(unitTypes.transport.attacks, 0)
	const state = fixture()
	const transport = state.units[0]
	const enemy = state.units[5]
	enemy.cell = 18
	assert.deepEqual(attackCells(state, transport), [])
	assert.equal(canAttack(state, transport, enemy), false)
	state.player = 2
	actions.select(state, enemy.id)
	await createController(state, { delay: async () => {} }).fight(transport)
	assert.equal(enemy.health, unitTypes.tank.maxHealth)
	assert.ok(transport.health < 125)
})

test('three infantry variants can embark; cargo is hidden and capacity, team, distance, fuel and locks are enforced', () => {
	const state = fixture()
	const transport = state.units[0]
	for (const id of [1, 2, 3]) assert.equal(embark(state, id), true)
	assert.equal(transport.cargo?.length, 3)
	assert.equal(embark(state, 4), false)
	assert.equal(unitAt(state, 7), undefined)
	actions.select(state, 1)
	assert.equal(state.selectedId, transport.id)
	const empty = fixture()
	const passenger = empty.units[1]
	passenger.movement = 1
	assert.equal(embark(empty, passenger.id), false)
	passenger.movement = 5
	passenger.player = 2
	assert.equal(embark(empty, passenger.id), false)
	passenger.player = 1
	passenger.type = 'jeep'
	assert.equal(embark(empty, passenger.id), false)
	passenger.type = 'infantry'
	passenger.cell = 6
	assert.equal(embark(empty, passenger.id), false)
	passenger.cell = 7
	for (const lock of ['moving', 'fighting'] as const) {
		empty[lock] = true
		assert.equal(embark(empty, passenger.id), false)
		empty[lock] = false
	}
})

test('deployment forbids water, occupied cells, diagonals and map wrapping; bridges are valid', () => {
	const state = fixture()
	const transport = state.units[0]
	assert.equal(embark(state, 1), true)
	const passenger = transport.cargo![0]
	state.cells[7].terrain = 'water'
	assert.deepEqual(deploymentCells(state, transport, passenger), [])
	for (const cell of [-1, 25, 7, 11, 13, 17, 6, 12]) assert.equal(deploy(state, passenger.id, cell), false)
	state.cells[7].terrain = 'road'
	state.cells[7].classes = ['-road', '-bridge', '-h']
	assert.deepEqual(deploymentCells(state, transport, passenger), [7])
	transport.cell = 10
	assert.ok(!deploymentCells(state, transport, passenger).includes(9))
	transport.cell = 12
	state.player = 2
	assert.equal(deploy(state, passenger.id, 7), false)
	state.player = 1
	state.winner = 1
	assert.equal(deploy(state, passenger.id, 7), false)
})

test('deployment preserves health, ammo and remaining movement without undoing the boarding cost', () => {
	const state = fixture()
	const transport = state.units[0]
	state.units[1].health = 42
	embark(state, 1)
	const passenger = transport.cargo![0]
	assert.equal(deploy(state, 1, 7), true)
	assert.equal(passenger.health, 42)
	assert.equal(transport.movement, 8)
	assert.deepEqual([passenger.movement, passenger.attacks, passenger.capture], [3, 2, 1])
	assert.equal(canEmbark(state, transport, passenger), true)
	assert.equal(deploy(state, 1, 7), false)
	actions.cancelMove(state)
	assert.equal(transport.movement, 8)
	assert.equal(transport.cell, 12)
	actions.select(state, passenger.id)
	assert.equal(actions.move(state, 6), true)
	assert.equal(passenger.movement, 1)
	actions.cancelMove(state)
	assert.equal(passenger.cell, 7)
	assert.equal(passenger.movement, 3)
	actions.select(state, passenger.id)
	assert.equal(canCapture(state), false)
	actions.endTurn(state)
	actions.endTurn(state)
	assert.equal(passenger.movement, 5)
	assert.equal(passenger.attacks, 2)
	assert.equal(passenger.capture, 1)
})

test('boarding and deployment preserve both available and spent captures, including repeated trips', () => {
	for (const remainingCapture of [0, 1]) {
		const state = fixture()
		const passenger = state.units[1]
		passenger.capture = remainingCapture
		state.cells[7].building = 'city'
		for (let trip = 0; trip < 2; trip++) {
			actions.select(state, state.units.find((unit) => unit.type === 'transport')!.id)
			assert.equal(embark(state, passenger.id), true)
			assert.equal(passenger.capture, remainingCapture)
			assert.equal(deploy(state, passenger.id, 7), true)
			actions.select(state, passenger.id)
			assert.equal(passenger.capture, remainingCapture)
			assert.equal(canCapture(state), remainingCapture === 1)
		}
		actions.capture(state)
		assert.equal(state.cells[7].capturePoints, remainingCapture === 1 ? 10 : 20)
		assert.equal(passenger.capture, 0)
	}
})

test('boarding spends the destination terrain cost and repeated boarding never restores movement', () => {
	for (const [terrain, cost] of [
		['road', 1],
		['grass', 2],
		['moutain', 4]
	] as const) {
		const state = fixture()
		state.cells[12].terrain = terrain
		state.cells[12].cost = cost
		const passenger = state.units[1]
		assert.equal(embark(state, passenger.id), true)
		assert.equal(passenger.movement, 5 - cost)
		assert.equal(deploy(state, passenger.id, 7), true)
		assert.equal(passenger.movement, 5 - cost)
		while (passenger.movement >= cost) {
			const remaining = passenger.movement
			assert.equal(embark(state, passenger.id), true)
			assert.equal(deploy(state, passenger.id, 7), true)
			assert.equal(passenger.movement, remaining - cost)
		}
		assert.equal(embark(state, passenger.id), false)
	}
})

test('a boarding route charges approach and entry once, retaining unused movement after deployment', async () => {
	const state = fixture()
	const passenger = state.units[1]
	passenger.cell = 2
	const game = createController(state, { delay: async () => {} })
	game.select(passenger.id)
	game.clickCell(12)
	await new Promise((resolve) => setImmediate(resolve))
	assert.equal(passenger.movement, 1)
	assert.equal(deploy(state, passenger.id, 7), true)
	assert.equal(passenger.movement, 1)
})

test('transport preserves each infantry type’s remaining attacks and deployed units can fire only those shots', async () => {
	for (const type of ['infantry', 'infantry-rocket', 'infantry-sniper'] as const) {
		for (let remaining = 0; remaining <= unitTypes[type].attacks; remaining++) {
			const state = fixture()
			const passenger = createUnit(type, 1, 7, 1)
			const enemy = createUnit('transport', 2, type === 'infantry-sniper' ? 9 : 6, 5)
			passenger.attacks = remaining
			state.units = [state.units[0], passenger, enemy]
			assert.equal(embark(state, passenger.id), true)
			assert.equal(state.units[0].cargo![0].attacks, remaining)
			assert.equal(deploy(state, passenger.id, 7), true)
			assert.equal(passenger.attacks, remaining)
			const game = createController(state, { delay: async () => {} })
			game.select(passenger.id)
			const initialHealth = enemy.health
			for (let shot = 0; shot < remaining; shot++) await game.fight(enemy)
			assert.equal(passenger.attacks, 0)
			if (remaining) assert.ok(enemy.health < initialHealth)
			else assert.equal(enemy.health, initialHealth)
			const healthAfterShots = enemy.health
			await game.fight(enemy)
			assert.equal(enemy.health, healthAfterShots)
		}
	}
})

test('destroying the last transport also eliminates its passengers and ends the match', async () => {
	const state = fixture()
	for (const id of [1, 2, 3]) embark(state, id)
	const transport = state.units[0]
	state.units = state.units.filter((unit) => unit.id !== 4)
	const enemy = state.units.find((unit) => unit.player === 2)!
	enemy.cell = 18
	transport.health = 1
	state.player = 2
	actions.select(state, enemy.id)
	await createController(state, { delay: async () => {} }).fight(transport)
	assert.equal(state.winner, 2)
	assert.deepEqual(
		state.units.map((unit) => unit.id),
		[enemy.id]
	)
})

test('loaded passengers do not capture, heal in hospitals or appear in movement paths', () => {
	const state = fixture()
	state.units[1].health = 25
	state.units[1].capture = 0
	embark(state, 1)
	state.cells[12].building = 'hospital'
	state.cells[12].owner = 1
	state.cells[7].building = 'hospital'
	state.cells[7].owner = 1
	actions.endTurn(state)
	actions.endTurn(state)
	assert.equal(state.units[0].cargo![0].health, 25)
	assert.equal(state.units[0].cargo![0].capture, 0)
})

test('online snapshots preserve cargo and reject duplicate IDs, enemy passengers, nested cargo and overcapacity', () => {
	const state = fixture()
	embark(state, 1)
	const snapshot = matchSnapshot(state)
	const guest = fixture()
	assert.equal(applySnapshot(guest, snapshot), true)
	assert.deepEqual(matchSnapshot(guest), snapshot)
	for (const mutate of [(passenger: any) => (passenger.id = 0), (passenger: any) => (passenger.player = 2), (passenger: any) => (passenger.type = 'tank'), (passenger: any) => (passenger.cargo = []), (passenger: any) => (passenger.health = -1)]) {
		const broken = structuredClone(snapshot)
		mutate(broken.units[0].cargo![0])
		assert.equal(applySnapshot(guest, broken), false)
	}
	const broken = structuredClone(snapshot)
	broken.units[0].cargo = [30, 31, 32, 33].map((id) => createUnit('infantry', 1, 7, id))
	assert.equal(applySnapshot(guest, broken), false)
	assert.equal(validCommand({ action: 'deploy', value: 1, destination: 7 }, state), true)
	assert.equal(validCommand({ action: 'deploy', value: 1, destination: 25 }, state), false)
	assert.equal(validCommand({ action: 'deploy', value: 5, destination: 7 }, state), false)
})

test('transport is available in map JSON and factories', () => {
	assert.deepEqual(readMap(mapJson(map)), map)
	const state = fixture()
	state.cells[0].building = 'factory'
	state.cells[0].owner = 1
	state.money[1] = 600
	actions.openProduction(state, 0)
	assert.equal(actions.buy(state, 'transport'), true)
	assert.equal(unitAt(state, 0)?.attacks, 0)
})

test('AI delivers infantry and expert simulations never mutate real cargo', async () => {
	const state = fixture()
	embark(state, 1)
	state.cells[0].building = 'city'
	const before = JSON.stringify(state)
	await projectExpertDecision(state, { kind: 'deploy', unitId: 0, passengerId: 1, destination: 7 }, new Set(), new Set(), () => false)
	assert.equal(JSON.stringify(state), before)
	const game = createController(state, { delay: async () => {} })
	await runAiTurn(
		game,
		'easy',
		() => true,
		async () => {}
	)
	assert.equal(state.player, 2)
	assert.equal(state.units.find((unit) => unit.id === 0)?.cargo?.length, 0)
	assert.ok(state.units.some((unit) => unit.id === 1))
})
