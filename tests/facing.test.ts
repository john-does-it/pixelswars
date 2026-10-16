import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import { initialState } from '../src/lib/game/model.ts'
import { newMap } from '../src/lib/map-editor/model.ts'
import { select, move, deselect, endTurn } from '../src/lib/game/actions.ts'
import { createController } from '../src/lib/game/controller.ts'
import { embark, deploy } from '../src/lib/game/transport.ts'
import { applySnapshot, matchSnapshot } from '../src/lib/game/online.ts'
import type { UnitTypeId } from '../src/lib/game/types.ts'

const fixture = () => initialState(newMap(5, 5))

test('starting armies face their opponents regardless of team, including every unit type', () => {
	for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
		for (const player of [1, 2] as const) {
			const map = newMap(5, 5)
			map.units = [
				{ type, player, cell: 6 },
				{ type, player: player === 1 ? 2 : 1, cell: 18 }
			]
			const before = structuredClone(map)
			const state = initialState(map)
			assert.deepEqual(
				state.units.map((unit) => unit.facing),
				['right', 'left'],
				type
			)
			assert.deepEqual(map, before)
			// Starting direction is not reapplied on subsequent turns.
			state.units[0].facing = 'left'
			endTurn(state)
			assert.equal(state.units[0].facing, 'left')
		}
	}
})

test('initial facing chooses the nearest lateral enemy and tolerates vertical or absent opponents', () => {
	const map = newMap(7, 5)
	map.units = [
		{ type: 'infantry', player: 1, cell: 17 },
		{ type: 'infantry', player: 2, cell: 20 },
		{ type: 'infantry', player: 2, cell: 16 },
		{ type: 'infantry', player: 2, cell: 10 }
	]
	assert.equal(initialState(map).units[0].facing, 'left')
	map.units = [map.units[0], map.units[3]]
	assert.deepEqual(
		initialState(map).units.map((unit) => unit.facing),
		['right', 'right']
	)
	map.units.pop()
	assert.equal(initialState(map).units[0].facing, 'right')
	map.units = []
	assert.deepEqual(initialState(map).units, [])
})

test('every unit keeps its last horizontal facing through vertical movement, selection and turns', () => {
	for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
		const state = fixture()
		if (unitTypes[type].domain === 'naval') for (const cell of state.cells) Object.assign(cell, { terrain: 'water', cost: 2, classes: ['-water'] })
		const unit = createUnit(type, 1, 12, 0)
		unit.movement = 20
		state.units = [unit]
		select(state, unit.id)
		assert.equal(move(state, 11), true)
		assert.equal(unit.facing, 'left', type)
		assert.equal(move(state, 6), true)
		assert.equal(unit.facing, 'left', type)
		assert.equal(move(state, 7), true)
		assert.equal(unit.facing, 'right', type)
		assert.equal(move(state, 24), false)
		assert.equal(unit.facing, 'right', type)
		deselect(state)
		endTurn(state)
		assert.equal(unit.facing, 'right', type)
	}
})

for (const enemyCell of [11, 13, 7]) {
	test(`combat faces both units toward cell ${enemyCell}, retaining facing after retaliation`, async () => {
		const state = fixture()
		const attacker = createUnit('infantry', 1, 12, 0)
		const defender = createUnit('infantry', 2, enemyCell, 1)
		attacker.facing = 'left'
		state.units = [attacker, defender]
		select(state, attacker.id)
		const expected = enemyCell === 13 ? ['right', 'left'] : ['left', 'right']
		const sources: number[] = []
		const controller = createController(state, {
			delay: async () => {
				assert.deepEqual([attacker.facing, defender.facing], expected)
				sources.push(state.combatSourceIndex!)
			}
		})
		await controller.fight(defender)
		assert.deepEqual(sources, [12, enemyCell])
		assert.deepEqual([attacker.facing, defender.facing], expected)
		controller.dispose()
	})
}

test('boarding and unloading face the passenger toward the destination from the transport', () => {
	const state = fixture()
	const transport = createUnit('transport-helicopter', 1, 12, 0)
	const passenger = createUnit('infantry-sniper', 1, 13, 1)
	state.units = [transport, passenger]
	select(state, transport.id)
	assert.equal(embark(state, passenger.id), true)
	assert.equal(passenger.facing, 'left')
	// Passenger's old cell stays at 13 while the vehicle travels.
	transport.cell = 6
	assert.equal(deploy(state, passenger.id, 7), true)
	assert.equal(passenger.facing, 'right')
	assert.equal(transport.facing, 'right')
})

test('online snapshots preserve unit and passenger facing and reject invalid directions', () => {
	const state = fixture()
	const vehicle = createUnit('transport', 1, 12, 0)
	vehicle.facing = 'left'
	vehicle.cargo = [createUnit('infantry', 1, 13, 1)]
	vehicle.cargo[0].facing = 'left'
	state.units = [vehicle]
	const guest = fixture()
	assert.equal(applySnapshot(guest, matchSnapshot(state)), true)
	assert.equal(guest.units[0].facing, 'left')
	assert.equal(guest.units[0].cargo?.[0].facing, 'left')
	for (const passenger of [false, true]) {
		const invalid = matchSnapshot(state)
		Object.assign(passenger ? invalid.units[0].cargo![0] : invalid.units[0], { facing: 'up' })
		assert.equal(applySnapshot(guest, invalid), false)
	}
	const legacy = matchSnapshot(state)
	delete legacy.units[0].facing
	delete legacy.units[0].cargo![0].facing
	assert.equal(applySnapshot(guest, legacy), true)
})
