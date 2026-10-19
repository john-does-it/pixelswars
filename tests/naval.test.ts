import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import { initialState, movementCost, canAttack, canRetaliate, purchaseStatus, productionBuilding } from '../src/lib/game/model.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import { boardingPaths, canCarry, canEmbark, embark, deploy, deploymentCells } from '../src/lib/game/transport.ts'
import { select, endTurn, buy, capture, move, cancelMove, openProduction } from '../src/lib/game/actions.ts'
import { choosePurchase } from '../src/lib/game/ai.ts'
import { createController } from '../src/lib/game/controller.ts'
import { matchSnapshot, applySnapshot } from '../src/lib/game/online.ts'
import { newMap, paintCell, paintMirroredCell, readMap, mapJson } from '../src/lib/map-editor/model.ts'
import type { UnitTypeId } from '../src/lib/game/types.ts'

function fixture() {
	const map = newMap(5, 5)
	for (let index = 10; index < 20; index++) map.cells[index].classes = ['-water']
	map.units = [
		{ type: 'transport-ship', player: 1, cell: 12 },
		{ type: 'tank', player: 1, cell: 7 },
		{ type: 'attack-ship', player: 2, cell: 18 }
	]
	return initialState(map)
}

test('passengers cannot be selected without a landing tile, and deployment never traps friendly-unit selection', () => {
	const state = fixture()
	const ship = state.units[0]
	const tank = state.units[1]
	select(state, ship.id)
	assert.ok(embark(state, tank.id))
	const other = createUnit('infantry', 1, 0, state.nextId++)
	state.units.push(other)
	const game = createController(state)
	try {
		state.cells[7].terrain = 'water'
		game.selectPassenger(tank.id)
		assert.equal(state.deployingPassengerId, null)
		state.cells[7].terrain = 'grass'
		other.cell = 7
		game.selectPassenger(tank.id)
		assert.equal(state.deployingPassengerId, null, 'occupied land is not a landing tile')
		other.cell = 0
		game.selectPassenger(tank.id)
		assert.equal(state.deployingPassengerId, tank.id)
		for (const blocked of [false, true]) {
			state.cells[7].terrain = blocked ? 'water' : 'grass'
			state.selectedId = ship.id
			state.deployingPassengerId = tank.id
			game.clickCell(other.cell)
			assert.equal(state.selectedId, other.id)
			assert.equal(state.deployingPassengerId, null)
			assert.deepEqual(ship.cargo, [tank])
			assert.ok(!state.units.includes(tank))
		}
	} finally {
		game.dispose()
	}
})

test('captured naval bases use normal production, occupancy and budgets; ships sail out without repairs or income', () => {
	const state = fixture()
	Object.assign(state.cells[5], { classes: ['-building', '-naval-base', '-ongrass'], terrain: 'building', building: 'naval-base', cost: 2 })
	state.units.push(createUnit('infantry', 1, 5, state.nextId++))
	select(state, state.units.at(-1)!.id)
	assert.ok(capture(state))
	endTurn(state)
	endTurn(state)
	select(state, state.units.at(-1)!.id)
	assert.ok(capture(state))
	assert.equal(state.cells[5].owner, 1)
	state.money[1] = 2800
	openProduction(state, 5)
	assert.equal(purchaseStatus(state, 'attack-ship').occupied, true)
	assert.equal(buy(state, 'attack-ship'), false)
	select(state, state.units.at(-1)!.id)
	assert.ok(move(state, 0))
	openProduction(state, 5)
	assert.equal(buy(state, 'infantry'), false)
	assert.equal(buy(state, 'plane'), false)
	assert.ok(buy(state, 'attack-ship'))
	const ship = state.units.at(-1)!
	assert.equal(ship.cell, 5)
	assert.equal(state.money[1], 1200)
	ship.health = 80
	endTurn(state)
	endTurn(state)
	assert.equal(ship.health, 80)
	assert.equal(state.money[1], 1200)
	select(state, ship.id)
	assert.ok(move(state, 10))
	assert.ok(move(state, 5))
	assert.ok(move(state, 10))
	assert.equal(ship.movement, 0)
	openProduction(state, 5)
	assert.equal(purchaseStatus(state, 'attack-ship').missing, 400)
	assert.ok(buy(state, 'transport-ship'))
	assert.equal(state.money[1], 0)
	const peer = fixture()
	assert.ok(applySnapshot(peer, matchSnapshot(state)))
	assert.deepEqual(peer.units, state.units)
	state.player = 2
	state.productionIndex = 5
	assert.equal(purchaseStatus(state, 'transport-ship').available, false)
})

test('all AI levels can recruit attack ships at naval bases instead of unnecessary transports', () => {
	const state = fixture()
	Object.assign(state.cells[5], { building: 'naval-base', terrain: 'building', owner: 1 })
	state.units = state.units.filter((unit) => unit.player === 2)
	state.money[1] = 1600
	for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) {
		assert.equal(choosePurchase(state, 5, difficulty), 'attack-ship', difficulty)
	}
})

test('editor preserves ships on naval bases, including mirrored owners and import/export', () => {
	const map = newMap(5, 5)
	paintMirroredCell(map, 5, { kind: 'terrain', classes: ['-building', '-naval-base', '-ongrass'], owner: 1 }, 'rotation')
	paintMirroredCell(map, 5, { kind: 'unit', type: 'attack-ship', player: 1 }, 'rotation')
	assert.equal(map.cells[19].owner, 2)
	assert.equal(map.units.length, 2)
	assert.deepEqual(readMap(mapJson(map)), map)
	paintCell(map, 5, { kind: 'terrain', classes: ['-building', '-naval-base', '-ongrass'], owner: 2 })
	assert.equal(map.units.length, 2)
})

test('ships can stop on water and bridge supports but never on road decks', () => {
	const state = fixture()
	const ship = state.units[0]
	state.cells[13].classes = ['-water', '-under-bridge', '-h']
	assert.equal(movementCost(ship, state.cells[13]), 1)
	assert.ok(pathsFrom(state, ship).has(19))
	assert.equal(pathsFrom(state, ship).has(2), false)
	state.cells[13].terrain = 'road'
	state.cells[13].classes = ['-road', '-bridge', '-h']
	state.cells[13].cost = 1
	assert.equal(movementCost(ship, state.cells[13]), Infinity)
	assert.equal(pathsFrom(state, ship).has(13), false)
	state.cells[13].classes = ['-road', '-h']
	assert.equal(movementCost(ship, state.cells[13]), Infinity)
	assert.equal(pathsFrom(state, ship).has(13), false)
})

test('vehicles board through the controller, refresh aboard and deploy with remaining actions', async () => {
	const state = fixture()
	const [ship, tank] = state.units
	assert.deepEqual(boardingPaths(state, tank).get(12), { cost: 1, path: [12] })
	const game = createController(state, { delay: async () => {} })
	game.select(tank.id)
	game.clickCell(ship.cell)
	await new Promise((resolve) => setImmediate(resolve))
	assert.equal(ship.cargo?.[0], tank)
	assert.equal(tank.movement, unitTypes.tank.movement - 1)
	assert.equal(ship.movement, unitTypes['transport-ship'].movement)
	game.cancel()
	assert.equal(ship.cargo?.[0], tank)
	tank.attacks = 0
	tank.movement = 0
	endTurn(state)
	endTurn(state)
	assert.equal(tank.attacks, unitTypes.tank.attacks)
	assert.equal(tank.movement, unitTypes.tank.movement)
	select(state, ship.id)
	assert.deepEqual(deploymentCells(state, ship, tank), [7])
	assert.equal(deploy(state, tank.id, 13), false)
	assert.equal(deploy(state, tank.id, 7), true)
	assert.equal(tank.movement, unitTypes.tank.movement)
	assert.equal(tank.attacks, unitTypes.tank.attacks)
	game.dispose()
})

test('naval cargo accepts ground units, caps at three and rejects nested cargo, enemies and exhausted passengers', () => {
	const state = fixture()
	const [ship, tank] = state.units
	for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
		const passenger = createUnit(type, 1, 7, 100)
		assert.equal(canCarry(ship, passenger), (unitTypes[type].domain ?? 'ground') === 'ground', type)
	}
	assert.equal(canCarry(ship, ship), false)
	tank.movement = 0
	assert.equal(canEmbark(state, ship, tank), false)
	tank.movement = 1
	tank.player = 2
	assert.equal(canEmbark(state, ship, tank), false)
	tank.player = 1
	ship.cargo = Array.from({ length: 3 }, (_, index) => createUnit('infantry', 1, 7, 10 + index))
	assert.equal(canEmbark(state, ship, tank), false)
	ship.cargo = []
	const jeep = createUnit('transport', 1, 7, 20)
	jeep.cargo = [createUnit('infantry', 1, 7, 21)]
	assert.equal(canCarry(ship, jeep), false)
	jeep.cargo = []
	assert.equal(canCarry(ship, jeep), true)
	assert.equal(canCarry(jeep, tank), false)
	const aircraft = createUnit('transport-helicopter', 1, 7, 22)
	assert.equal(canCarry(aircraft, tank), false)
})

test('naval cargo survives network snapshots and invalid payloads are rejected', () => {
	const state = fixture()
	const [ship, tank] = state.units
	select(state, ship.id)
	assert.ok(embark(state, tank.id))
	const snapshot = matchSnapshot(state)
	const guest = fixture()
	assert.equal(applySnapshot(guest, snapshot), true)
	assert.equal(guest.units[0].cargo?.[0].type, 'tank')
	const invalid = structuredClone(snapshot)
	invalid.units[0].cargo![0].type = 'plane'
	assert.equal(applySnapshot(guest, invalid), false)
	invalid.units[0].cargo![0].type = 'tank'
	invalid.units[0].cargo![0].cargo = [createUnit('infantry', 1, 7, 50)]
	assert.equal(applySnapshot(guest, invalid), false)
})

test('attack ships fire and retaliate at short range; transports are unarmed and sink with their cargo', async () => {
	const state = fixture()
	const attacker = createUnit('attack-ship', 1, 12, 10)
	const defender = createUnit('attack-ship', 2, 13, 11)
	state.units = [attacker, defender]
	assert.ok(canAttack(state, attacker, defender))
	assert.ok(canRetaliate(state, defender, attacker))
	defender.cell = 14
	assert.equal(canAttack(state, attacker, defender), false)
	defender.cell = 13
	defender.type = 'plane'
	assert.equal(canAttack(state, attacker, defender), false)
	defender.type = 'transport-ship'
	assert.equal(canAttack(state, defender, attacker), false)
	defender.health = 1
	defender.cargo = [createUnit('tank', 2, 8, 12)]
	select(state, attacker.id)
	const game = createController(state, { delay: async () => {} })
	await game.fight(defender)
	assert.equal(state.units.length, 1)
	assert.equal(state.units[0].attacks, 1)
	assert.equal(state.winner, 1)
	game.dispose()
})

test('ships cannot be bought at factories, airports or an empty water tile and do not heal at bases', () => {
	const state = fixture()
	state.money[1] = 100000
	state.productionIndex = 0
	state.cells[0].owner = 1
	for (const building of ['factory', 'airport', null] as const) {
		state.cells[0].building = building
		for (const type of ['attack-ship', 'transport-ship', 'artillery-ship'] as const) {
			assert.equal(productionBuilding(type), 'naval-base')
			assert.equal(purchaseStatus(state, type).available, false)
			assert.equal(buy(state, type), false)
		}
	}
	const ship = state.units[0]
	ship.health = 80
	endTurn(state)
	endTurn(state)
	assert.equal(ship.health, 80)
})

test('editor preserves ships on water and removes them when painting bridges or land', () => {
	const map = newMap(5, 5)
	assert.throws(() => paintCell(map, 1, { kind: 'unit', type: 'attack-ship', player: 1 }), /map_editor_error_naval/)
	paintMirroredCell(map, 1, { kind: 'terrain', classes: ['-water'], owner: 0 }, 'rotation')
	paintMirroredCell(map, 1, { kind: 'unit', type: 'attack-ship', player: 1 }, 'rotation')
	assert.deepEqual(map.units, [
		{ type: 'attack-ship', player: 1, cell: 1 },
		{ type: 'attack-ship', player: 2, cell: 23 }
	])
	assert.deepEqual(readMap(mapJson(map)), map)
	paintCell(map, 1, { kind: 'terrain', classes: ['-water'], owner: 0 })
	assert.equal(map.units.length, 2)
	const invalid = structuredClone(map)
	invalid.cells[1].classes = ['-grass']
	assert.throws(() => readMap(JSON.stringify(invalid)), /map_editor_error_naval/)
	paintMirroredCell(map, 1, { kind: 'terrain', classes: ['-road', '-bridge', '-h'], owner: 0 }, 'rotation')
	assert.equal(map.units.length, 0)
	assert.throws(() => paintCell(map, 1, { kind: 'unit', type: 'attack-ship', player: 1 }), /map_editor_error_naval/)
	assert.deepEqual(readMap(mapJson(map)), map)
	paintMirroredCell(map, 1, { kind: 'terrain', classes: ['-road', '-h'], owner: 0 }, 'rotation')
	assert.equal(map.units.length, 0)
})

for (const axis of ['-h', '-v']) {
	for (const type of ['attack-ship', 'transport-ship', 'artillery-ship'] as const) {
		test(type + ' crosses ' + axis + ' bridges atomically beneath ground units', () => {
			const map = newMap(5, 5)
			const [start, finish] = axis === '-h' ? [7, 17] : [11, 13]
			for (const index of [start, finish]) map.cells[index].classes = ['-water']
			map.cells[12].classes = ['-road', '-bridge', axis]
			map.units = [
				{ type, player: 1, cell: start },
				{ type: 'infantry', player: 2, cell: 24 }
			]
			const state = initialState(map)
			const ship = state.units[0]
			if (type === 'transport-ship') ship.cargo = [createUnit('infantry', 1, start, state.nextId++)]
			assert.deepEqual(pathsFrom(state, ship).get(finish), { cost: 2, path: [finish] })
			assert.equal(pathsFrom(state, ship).has(12), false)
			assert.equal(pathsFrom(state, ship, 1).has(finish), false)
			select(state, ship.id)
			ship.movement = 1
			assert.equal(move(state, finish), false)
			assert.equal(move(state, 12), false)
			ship.movement = unitTypes[type].movement
			for (const player of [1, 2] as const) {
				const guard = createUnit('infantry', player, 12, state.nextId++)
				state.units.push(guard)
				select(state, ship.id)
				assert.ok(move(state, finish))
				assert.equal(ship.movement, unitTypes[type].movement - 2)
				assert.equal(guard.cell, 12)
				const peer = initialState(map)
				assert.ok(applySnapshot(peer, matchSnapshot(state)))
				assert.equal(peer.units[0].cell, finish)
				assert.equal(peer.units[0].cargo?.length ?? 0, type === 'transport-ship' ? 1 : 0)
				cancelMove(state)
				assert.equal(ship.cell, start)
				state.units.pop()
			}
			state.units.push(createUnit('attack-ship', 2, finish, state.nextId++))
			assert.equal(pathsFrom(state, ship).has(finish), false)
			state.units.pop()
			state.cells[12].classes = ['-road', '-bridge', axis === '-h' ? '-v' : '-h']
			assert.equal(pathsFrom(state, ship).has(finish), false)
			state.cells[12].terrain = 'void'
			assert.equal(pathsFrom(state, ship).has(finish), false)
		})
	}
}

test('ships cross multiple bridge tiles only with enough movement to exit', () => {
	const map = newMap(5, 5)
	map.cells[5].classes = ['-water']
	map.cells[6].classes = ['-road', '-bridge', '-v']
	map.cells[7].classes = ['-road', '-bridge', '-v']
	map.cells[8].classes = ['-water']
	map.units = [{ type: 'transport-ship', player: 1, cell: 5 }]
	const state = initialState(map)
	const ship = state.units[0]
	assert.deepEqual(pathsFrom(state, ship).get(8), { cost: 3, path: [8] })
	assert.equal(pathsFrom(state, ship, 2).has(8), false)
	select(state, ship.id)
	assert.ok(move(state, 8))
	assert.equal(ship.movement, 1)
	state.cells[8].classes = ['-road', '-bridge', '-v']
	state.cells[8].terrain = 'road'
	state.cells[9].classes = ['-road', '-bridge', '-v']
	state.cells[9].terrain = 'road'
	cancelMove(state)
	assert.equal(pathsFrom(state, ship).size, 1)
})

for (const interrupted of [false, true]) {
	test('bridge animation keeps ground selection separate and ' + (interrupted ? 'can be interrupted safely' : 'finishes on the opposite bank'), async () => {
		const map = newMap(5, 5)
		map.cells[7].classes = ['-water']
		map.cells[12].classes = ['-road', '-bridge', '-h']
		map.cells[17].classes = ['-water']
		map.units = [
			{ type: 'attack-ship', player: 1, cell: 7 },
			{ type: 'infantry', player: 1, cell: 12 }
		]
		const state = initialState(map)
		let release!: () => void
		const game = createController(state, {
			delay: () =>
				new Promise<void>((resolve) => {
					release = resolve
				})
		})
		game.select(0)
		const crossing = game.move(17)
		assert.deepEqual(state.bridgeTransit, { unitId: 0, cell: 12 })
		assert.equal(state.units[0].cell, 7)
		assert.equal(state.units[1].cell, 12)
		game.select(1)
		game.endTurn()
		assert.equal(state.selectedId, 0)
		assert.equal(state.round, 1)
		const peer = initialState(map)
		assert.ok(applySnapshot(peer, matchSnapshot(state)))
		assert.deepEqual(peer.bridgeTransit, state.bridgeTransit)
		const invalid = matchSnapshot(state)
		invalid.bridgeTransit = { unitId: 1, cell: 12 }
		assert.equal(applySnapshot(peer, invalid), false)
		if (interrupted) game.dispose()
		release()
		await crossing
		assert.equal(state.bridgeTransit, null)
		assert.equal(state.moving, false)
		assert.equal(state.units[0].cell, interrupted ? 7 : 17)
		assert.equal(state.units[0].movement, unitTypes['attack-ship'].movement - (interrupted ? 0 : 2))
		game.dispose()
	})
}
