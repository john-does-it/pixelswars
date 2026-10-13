import { mapIds, readMapFixture } from './map-fixtures.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newMap, paintCell, readMap, mapJson, mirrorMap, mirroredIndex, paintMirroredCell, validateMirrorDimensions } from '../src/lib/map-editor/model.ts'
import { initialState, movementCostForDomain } from '../src/lib/game/model.ts'
import { assertConnectedRoads } from './map-assertions.ts'

test('bridges retain their axis, connect road ends and round-trip as passable roads', () => {
	for (const axis of ['-h', '-v']) {
		const map = newMap(7, 7)
		for (let index = 0; index < map.cells.length; index++) paintCell(map, index, { kind: 'terrain', classes: ['-water'], owner: 0 })
		paintCell(map, 24, { kind: 'terrain', classes: ['-road', '-bridge', axis], owner: 0 })
		assert.deepEqual(map.cells[17].classes, ['-water'])
		const approach = axis === '-h' ? 23 : 17
		paintCell(map, approach, { kind: 'terrain', classes: ['-road', '-h'], owner: 0 })
		assert.deepEqual(map.cells[approach].classes, ['-road', axis === '-h' ? '-endleft' : '-endtop'])
		assert.deepEqual(map.cells[24].classes, ['-road', '-bridge', axis])
		paintCell(map, 24, { kind: 'unit', type: 'tank', player: 1 })
		const imported = readMap(mapJson(map))
		assert.deepEqual(imported, map)
		assert.equal(initialState(imported).cells[24].terrain, 'road')
		paintCell(map, approach, { kind: 'terrain', classes: ['-grass'], owner: 0 })
		assert.deepEqual(map.cells[24].classes, ['-road', '-bridge', axis])
	}
})

test('editor draws connected road junctions and repairs neighboring sprites when erasing', () => {
	const map = newMap(7, 7)
	const road = { kind: 'terrain', classes: ['-road', '-h'], owner: 0 } as const
	for (let column = 0; column < 7; column++) paintCell(map, 21 + column, { ...road, classes: [...road.classes] })
	for (let row = 0; row < 7; row++) paintCell(map, row * 7 + 3, { ...road, classes: [...road.classes] })
	assert.deepEqual(map.cells[24].classes, ['-road', '-cross'])
	assertConnectedRoads(initialState(map))
	paintCell(map, 17, { kind: 'terrain', classes: ['-grass'], owner: 0 })
	assert.deepEqual(map.cells[24].classes, ['-road', '-junction', '-south'])
	assert.deepEqual(map.cells[10].classes, ['-road', '-endbottom'])
})

test('water below a bridge preserves its sprite and remains impassable to ground units', () => {
	const map = newMap(5, 5)
	const classes = ['-water', '-under-bridge', '-h']
	paintCell(map, 12, { kind: 'unit', type: 'infantry', player: 1 })
	paintCell(map, 12, { kind: 'terrain', classes, owner: 0 })
	assert.equal(map.units.length, 0)
	paintCell(map, 7, { kind: 'terrain', classes: ['-road', '-bridge', '-h'], owner: 0 })
	paintCell(map, 17, { kind: 'terrain', classes: ['-water'], owner: 0 })
	assert.deepEqual(map.cells[12].classes, classes)
	assert.ok(!map.cells[17].classes.includes('-top'))
	assert.throws(() => paintCell(map, 12, { kind: 'unit', type: 'tank', player: 1 }), /map_editor_error_ground/)
	paintCell(map, 12, { kind: 'unit', type: 'helicopter', player: 1 })
	assert.deepEqual(readMap(mapJson(map)), map)
	const cell = initialState(map).cells[12]
	assert.equal(cell.terrain, 'water')
	assert.equal(movementCostForDomain('ground', cell), Infinity)
	assert.equal(movementCostForDomain('air', cell), 1)
	const invalid = structuredClone(map)
	invalid.cells[12].classes = ['-road', '-under-bridge', '-h']
	assert.throws(() => readMap(JSON.stringify(invalid)), /map_editor_error_cell/)
})

test('editor updates shores, enforces one unit per cell and prevents ground units on water', () => {
	const map = newMap(6, 6)
	paintCell(map, 14, { kind: 'unit', type: 'infantry', player: 1 })
	paintCell(map, 14, { kind: 'unit', type: 'tank', player: 2 })
	assert.deepEqual(map.units, [{ type: 'tank', player: 2, cell: 14 }])
	for (const index of [14, 15, 20, 21]) paintCell(map, index, { kind: 'terrain', classes: ['-water'], owner: 0 })
	assert.deepEqual(map.units, [])
	assert.deepEqual(map.cells[14].classes, ['-water', '-grass', '-top', '-right', '-corner'])
	assert.throws(() => paintCell(map, 14, { kind: 'unit', type: 'infantry', player: 1 }), /map_editor_error_ground/)
	paintCell(map, 14, { kind: 'unit', type: 'helicopter', player: 2 })
	assert.equal(map.units.length, 1)
	paintCell(map, 14, { kind: 'erase-unit' })
	assert.equal(map.units.length, 0)
	assert.ok(map.cells[14].classes.includes('-water'))
})

test('editor exports owned buildings and armies in the actual game schema', () => {
	const map = newMap(8, 8)
	map.id = '15'
	map.name = 'My battlefield'
	paintCell(map, 20, { kind: 'terrain', classes: ['-building', '-oil-field', '-ongrass'], owner: 2 })
	paintCell(map, 0, { kind: 'unit', type: 'infantry', player: 1 })
	paintCell(map, 63, { kind: 'unit', type: 'infantry-rocket', player: 2 })
	const imported = readMap(mapJson(map))
	assert.deepEqual(imported, map)
	const state = initialState(imported)
	assert.equal(state.cells[20].building, 'oil-field')
	assert.equal(state.cells[20].owner, 2)
	assert.equal(state.units.length, 2)
	assert.throws(() => readMap(JSON.stringify({ ...map, cells: [] })), /map_editor_error_cells/)
	assert.throws(() => readMap(JSON.stringify({ ...map, units: [map.units[0], map.units[0]] })), /map_editor_error_unit/)
	assert.throws(() => newMap(0, 20), /dimensions/)
})

test('editor can round-trip all existing maps without changing their terrain or armies', () => {
	for (const mapId of mapIds) {
		const source = JSON.stringify(readMapFixture(mapId))
		assert.deepEqual(JSON.parse(mapJson(readMap(source))), JSON.parse(source), `map ${mapId}`)
	}
})

test('rotation requires odd dimensions and enabling it copies one half with opposing armies', () => {
	for (const [cols, rows] of [
		[4, 5],
		[5, 4],
		[4, 4]
	]) {
		assert.throws(() => mirrorMap(newMap(cols, rows), 'rotation'), /map_editor_mirror_dimensions/)
		assert.doesNotThrow(() => validateMirrorDimensions(cols, rows, 'off'))
	}
	const original = newMap(5, 3)
	paintCell(original, 1, { kind: 'terrain', classes: ['-building', '-factory', '-ongrass'], owner: 1 })
	paintCell(original, 5, { kind: 'terrain', classes: ['-building', '-city', '-ongrass'], owner: 2 })
	paintCell(original, 7, { kind: 'terrain', classes: ['-building', '-city', '-ongrass'], owner: 1 })
	for (const cell of [1, 7, 14]) paintCell(original, cell, { kind: 'unit', type: 'infantry', player: 1 })
	const before = structuredClone(original)
	const mirrored = mirrorMap(original, 'rotation')
	assert.deepEqual(original, before)
	assert.deepEqual(mirrored.cells[13], { ...original.cells[1], owner: 2 })
	assert.equal(mirrored.cells[9].owner, 1)
	assert.equal(mirrored.cells[7].owner, 0)
	assert.deepEqual(mirrored.units, [
		{ type: 'infantry', player: 1, cell: 1 },
		{ type: 'infantry', player: 2, cell: 13 }
	])
	for (let index = 0; index < mirrored.cells.length; index++) {
		assert.equal(mirroredIndex(mirrored, mirroredIndex(mirrored, index, 'rotation'), 'rotation'), index)
	}
	assert.deepEqual(mirrorMap(mirrored, 'rotation'), mirrored)
	assert.deepEqual(readMap(mapJson(mirrored)), mirrored)
})

test('mirrored painting works from either side, keeps a neutral centre and erases both units', () => {
	const map = newMap(5, 5)
	paintMirroredCell(map, 24, { kind: 'terrain', classes: ['-building', '-city', '-ongrass'], owner: 1 }, 'rotation')
	assert.equal(map.cells[24].owner, 1)
	assert.equal(map.cells[0].owner, 2)
	paintMirroredCell(map, 24, { kind: 'unit', type: 'infantry', player: 2 }, 'rotation')
	assert.deepEqual(map.units, [
		{ type: 'infantry', player: 2, cell: 24 },
		{ type: 'infantry', player: 1, cell: 0 }
	])
	paintMirroredCell(map, 0, { kind: 'erase-unit' }, 'rotation')
	assert.deepEqual(map.units, [])
	paintMirroredCell(map, 12, { kind: 'terrain', classes: ['-building', '-factory', '-ongrass'], owner: 2 }, 'rotation')
	assert.equal(map.cells[12].owner, 0)
	assert.throws(() => paintMirroredCell(map, 12, { kind: 'unit', type: 'helicopter', player: 1 }, 'rotation'), /map_editor_mirror_centre_unit/)
	paintMirroredCell(map, 1, { kind: 'unit', type: 'tank', player: 1 }, 'rotation')
	paintMirroredCell(map, 1, { kind: 'terrain', classes: ['-water'], owner: 0 }, 'rotation')
	assert.deepEqual(map.units, [])
	// An invalid opposite destination must not leave half of a placement behind.
	paintCell(map, 23, { kind: 'terrain', classes: ['-grass'], owner: 0 })
	const before = structuredClone(map)
	assert.throws(() => paintMirroredCell(map, 23, { kind: 'unit', type: 'tank', player: 1 }, 'rotation'), /map_editor_error_ground/)
	assert.deepEqual(map, before)
	paintMirroredCell(map, 3, { kind: 'unit', type: 'tank', player: 1 }, 'off')
	assert.deepEqual(map.units, [{ type: 'tank', player: 1, cell: 3 }])
})

test('rotation reconnects opposite road corners and shores while preserving bridge axes', () => {
	const map = newMap(7, 7)
	for (const index of [8, 9, 16]) paintMirroredCell(map, index, { kind: 'terrain', classes: ['-road', '-h'], owner: 0 }, 'rotation')
	assert.deepEqual(map.cells[9].classes, ['-road', '-corner', '-bottom'])
	assert.deepEqual(map.cells[39].classes, ['-road', '-corner', '-top'])
	for (const index of [23, 24]) paintMirroredCell(map, index, { kind: 'terrain', classes: ['-road', '-h'], owner: 0 }, 'rotation')
	assertConnectedRoads(initialState(map))
	for (const index of [0, 1, 7, 8]) paintMirroredCell(map, index, { kind: 'terrain', classes: ['-water'], owner: 0 }, 'rotation')
	assert.deepEqual(map.cells[8].classes, ['-water', '-grass', '-left', '-bottom', '-corner'])
	assert.deepEqual(map.cells[40].classes, ['-water', '-grass', '-top', '-right', '-corner'])
	for (const [index, axis] of [
		[10, '-h'],
		[11, '-v']
	] as const) {
		paintMirroredCell(map, index, { kind: 'terrain', classes: ['-road', '-bridge', axis], owner: 0 }, 'rotation')
		assert.deepEqual(map.cells[48 - index].classes, ['-road', '-bridge', axis])
	}
	assert.deepEqual(mirrorMap(map, 'rotation'), map)
	assert.deepEqual(readMap(mapJson(map)), map)
})
