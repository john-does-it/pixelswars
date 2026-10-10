import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import { initialState, attackCells, productionBuilding } from '../src/lib/game/model.ts'
import { newMap, readMap, mapJson } from '../src/lib/map-editor/model.ts'
import { embark, canEmbark, deploy, deploymentCells } from '../src/lib/game/transport.ts'
import { buy, select, move, openProduction } from '../src/lib/game/actions.ts'
import { createController } from '../src/lib/game/controller.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import rules from '../src/lib/game/combat-rules.ts'
import { planExpertProduction } from '../src/lib/game/ai-economy.ts'

test('transport helicopter matches helicopter characteristics but cannot attack or retaliate', async () => {
	const type = 'transport-helicopter'
	for (const key of ['movement', 'maxHealth', 'defense', 'cost', 'domain', 'production', 'delay', 'selectSound'] as const) assert.equal(unitTypes[type][key], unitTypes.helicopter[key])
	assert.equal(unitTypes[type].capacity, 3)
	assert.equal(unitTypes[type].attack, 0)
	assert.equal(unitTypes[type].attacks, 0)
	for (const attacker of Object.keys(unitTypes)) {
		assert.equal(rules.typeModifier(attacker, type), rules.typeModifier(attacker, 'helicopter'))
		assert.equal(rules.canTarget(type, attacker), false)
	}
	const state = initialState(newMap(5, 5))
	const transport = createUnit(type, 1, 12, 0)
	const enemy = createUnit('helicopter', 2, 13, 1)
	state.units = [transport, enemy]
	assert.deepEqual(attackCells(state, transport), [])
	state.player = 2
	select(state, enemy.id)
	await createController(state, { delay: async () => {} }).fight(transport)
	assert.ok(transport.health < 110)
	assert.equal(enemy.health, 110)
})

test('air transport carries three infantry variants over water and blockers and unloads only onto land', () => {
	const map = newMap(5, 5)
	map.cells[18].classes = ['-water']
	map.cells[19].classes = ['-blocker', '-ongrass']
	map.units = [
		{ type: 'transport-helicopter', player: 1, cell: 12 },
		{ type: 'infantry', player: 1, cell: 7 },
		{ type: 'infantry-sniper', player: 1, cell: 11 },
		{ type: 'infantry-rocket', player: 1, cell: 13 },
		{ type: 'infantry', player: 1, cell: 17 }
	]
	assert.deepEqual(readMap(mapJson(map)), map)
	const state = initialState(map)
	const transport = state.units[0]
	select(state, transport.id)
	for (const id of [1, 2, 3]) assert.equal(embark(state, id), true)
	assert.equal(
		canEmbark(
			state,
			transport,
			state.units.find((unit) => unit.id === 4)!
		),
		false
	)
	assert.equal(transport.cargo?.length, 3)
	assert.ok(pathsFrom(state, transport).has(19))
	for (const cell of [13, 18, 19, 18]) assert.equal(move(state, cell), true)
	const passenger = transport.cargo![0]
	assert.equal(deploymentCells(state, transport, passenger).includes(19), false)
	assert.equal(deploy(state, passenger.id, 19), false)
	assert.equal(deploy(state, passenger.id, 13), true)
	assert.equal(transport.cargo?.length, 2)
	assert.equal(passenger.cell, 13)
})

test('transport helicopter is produced at airports', () => {
	const state = initialState(newMap(5, 5))
	Object.assign(state.cells[12], { building: 'airport', owner: 1 })
	openProduction(state, 12)
	state.money[1] = 1800
	assert.equal(productionBuilding('transport-helicopter'), 'airport')
	assert.equal(buy(state, 'transport-helicopter'), true)
	assert.equal(state.money[1], 0)
	assert.equal(state.units[0].type, 'transport-helicopter')
})

test('destroying an air transport loses its passengers and eliminates the army', async () => {
	const state = initialState(newMap(5, 5))
	const transport = createUnit('transport-helicopter', 1, 12, 0)
	transport.health = 1
	transport.cargo = [createUnit('infantry', 1, 12, 2)]
	const enemy = createUnit('plane', 2, 13, 1)
	state.units = [transport, enemy]
	state.player = 2
	select(state, enemy.id)
	await createController(state, { delay: async () => {} }).fight(transport)
	assert.equal(state.winner, 2)
	assert.ok(!state.units.some((unit) => unit.player === 1 && unit.health > 0))
})

test('expert AI can recruit an air transport to reach an island objective', () => {
	const map = newMap(7, 5)
	for (let row = 0; row < 5; row++) map.cells[row * 7 + 3].classes = ['-water']
	map.cells[8] = { classes: ['-building', '-airport', '-ongrass'], owner: 1, capturePoints: 20 }
	map.cells[12] = { classes: ['-building', '-city', '-ongrass'], owner: 0, capturePoints: 20 }
	map.units = [{ type: 'infantry', player: 1, cell: 7 }]
	const state = initialState(map)
	state.money[1] = 1800
	assert.equal(planExpertProduction(state)?.type, 'transport-helicopter')
})
