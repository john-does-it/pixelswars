import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import { initialState, movementCostForDomain, reachableCells } from '../src/lib/game/model.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import { move, select } from '../src/lib/game/actions.ts'
import { deploymentCells } from '../src/lib/game/transport.ts'
import { mapJson, newMap, paintCell, readMap } from '../src/lib/map-editor/model.ts'
import type { UnitTypeId } from '../src/lib/game/types.ts'

const blocker = { kind: 'terrain', classes: ['-blocker', '-ongrass'], owner: 0 } as const
function barrierMap() {
	const map = newMap(3, 3)
	for (const index of [1, 4, 7]) paintCell(map, index, { ...blocker, classes: [...blocker.classes] })
	return map
}

test('obstacles block every ground unit and naval movement, while aircraft can cross', () => {
	for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
		const state = initialState(barrierMap())
		const unit = createUnit(type, 1, 3, 0)
		state.units = [unit]
		select(state, unit.id)
		const flying = unitTypes[type].domain === 'air'
		assert.equal(state.cells[4].terrain, 'blocker')
		assert.equal(reachableCells(state, unit).includes(4), flying, type)
		assert.equal(pathsFrom(state, unit).has(5), flying, type)
		assert.equal(move(state, 4), flying, type)
		assert.equal(unit.cell, flying ? 4 : 3)
		if (flying) assert.equal(unit.movement, unitTypes[type].movement - 1)
	}
	assert.equal(movementCostForDomain('naval', { terrain: 'blocker', cost: 1 }), Infinity)
})

test('transport passengers cannot unload onto an obstacle', () => {
	const state = initialState(barrierMap())
	const transport = createUnit('transport', 1, 3, 0)
	const passenger = createUnit('infantry', 1, 3, 1)
	transport.cargo = [passenger]
	state.units = [transport]
	assert.deepEqual(deploymentCells(state, transport, passenger).sort(), [0, 6])
})

test('editor obstacles preserve air units, remove ground units and survive JSON round trips', () => {
	const map = newMap(3, 3)
	paintCell(map, 4, { kind: 'unit', type: 'infantry', player: 1 })
	paintCell(map, 4, { ...blocker, classes: [...blocker.classes] })
	assert.equal(map.units.length, 0)
	assert.throws(() => paintCell(map, 4, { kind: 'unit', type: 'tank', player: 1 }), /map_editor_error_blocker/)
	for (const type of ['plane', 'helicopter'] as const) {
		paintCell(map, 4, { kind: 'unit', type, player: 1 })
		paintCell(map, 4, { ...blocker, classes: [...blocker.classes] })
		assert.equal(map.units[0].type, type)
		assert.deepEqual(readMap(mapJson(map)), map)
	}
	map.units[0].type = 'infantry'
	assert.throws(() => readMap(JSON.stringify(map)), /map_editor_error_blocker/)
	map.units = []
	map.cells[4].classes.push('-road')
	assert.throws(() => readMap(JSON.stringify(map)), /map_editor_error_cell/)
})
