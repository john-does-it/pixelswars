import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import { attackCells, initialState, movementCost, reachableCells } from '../src/lib/game/model.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import { move, select } from '../src/lib/game/actions.ts'
import { deploymentCells } from '../src/lib/game/transport.ts'
import { mapJson, newMap, paintCell, paintMirroredCell, readMap } from '../src/lib/map-editor/model.ts'
import type { Brush } from '../src/lib/map-editor/model.ts'
import type { UnitTypeId } from '../src/lib/game/types.ts'

const voidBrush: Brush = { kind: 'terrain', classes: ['-void'], owner: 0 }
const types = Object.keys(unitTypes) as UnitTypeId[]

test('void blocks every unit, including aircraft and naval pathfinding', () => {
	for (const type of types) {
		const map = newMap(3, 3)
		if (unitTypes[type].domain === 'naval') {
			for (let index = 0; index < 9; index++) paintCell(map, index, { kind: 'terrain', classes: ['-water'], owner: 0 })
		}
		for (const index of [1, 4, 7]) paintCell(map, index, voidBrush)
		const state = initialState(map)
		const unit = createUnit(type, 1, 3, 0)
		state.units = [unit]
		select(state, unit.id)
		assert.equal(movementCost(unit, state.cells[4]), Infinity, type)
		assert.equal(reachableCells(state, unit).includes(4), false, type)
		assert.equal(pathsFrom(state, unit).has(5), false, type)
		assert.equal(move(state, 4), false, type)
		assert.equal(unit.cell, 3, type)
		assert.equal(
			attackCells(state, unit).some((index) => state.cells[index].terrain === 'void'),
			false,
			type
		)
	}
})

test('transports cannot deploy passengers into void', () => {
	const map = newMap(3, 3)
	for (const index of [1, 3, 5, 7]) paintCell(map, index, voidBrush)
	const state = initialState(map)
	for (const type of ['transport', 'transport-helicopter', 'transport-ship'] as const) {
		const transport = createUnit(type, 1, 4, 0)
		const passenger = createUnit('infantry', 1, 4, 1)
		transport.cargo = [passenger]
		state.units = [transport]
		assert.deepEqual(deploymentCells(state, transport, passenger), [], type)
	}
})

test('painting void removes every unit and placement or import cannot put one back', () => {
	for (const type of types) {
		const map = newMap(3, 3)
		if (unitTypes[type].domain === 'naval') paintCell(map, 0, { kind: 'terrain', classes: ['-water'], owner: 0 })
		paintCell(map, 0, { kind: 'unit', type, player: 1 })
		paintMirroredCell(map, 0, voidBrush, 'rotation')
		assert.equal(map.units.length, 0, type)
		assert.deepEqual(map.cells[0], map.cells[8])
		assert.deepEqual(readMap(mapJson(map)), map)
		assert.throws(() => paintCell(map, 0, { kind: 'unit', type, player: 1 }), /map_editor_error_void/)
		map.units.push({ type, player: 1, cell: 0 })
		assert.throws(() => readMap(JSON.stringify(map)), /map_editor_error_void/)
	}
})

test('void has no owner or mixed terrain and does not create grassy water shores', () => {
	const map = newMap(3, 3)
	for (let index = 0; index < 9; index++) paintCell(map, index, voidBrush)
	paintCell(map, 4, { kind: 'terrain', classes: ['-water'], owner: 0 })
	assert.deepEqual(map.cells[4].classes, ['-water'])
	map.cells[0].owner = 1
	assert.throws(() => readMap(JSON.stringify(map)), /map_editor_error_cell/)
	map.cells[0].owner = 0
	map.cells[0].classes.push('-grass')
	assert.throws(() => readMap(JSON.stringify(map)), /map_editor_error_cell/)
})
