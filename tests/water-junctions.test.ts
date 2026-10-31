import assert from 'node:assert/strict'
import test from 'node:test'
import { newMap, paintCell, readMap, mapJson, mirrorMap } from '../src/lib/map-editor/model.ts'
import { initialState, movementCostForDomain } from '../src/lib/game/model.ts'
import { reconnectWaterJunctions, waterJunctionClasses, waterJunctionModifiers } from '../src/lib/game/water-junctions.ts'
import { readFileSync } from 'node:fs'
import { readMapFixture } from './map-fixtures.ts'

const marker = '-junction-nw-se'
const paint = (map: ReturnType<typeof newMap>, index: number, classes: string[]) => paintCell(map, index, { kind: 'terrain', classes, owner: 0 })
function junctionMap() {
	const map = newMap(5, 5)
	for (const index of [7, 8, 10, 11, 12, 15, 16]) paint(map, index, ['-water'])
	return map
}

test('painting and erasing diagonal land updates the junction without repainting its water cell', () => {
	const map = junctionMap()
	assert.ok(map.cells[12].classes.includes(marker))
	paint(map, 6, ['-water'])
	assert.ok(!map.cells[12].classes.includes(marker))
	paint(map, 6, ['-forest', '-ongrass'])
	assert.ok(map.cells[12].classes.includes(marker))
	paint(map, 13, ['-water'])
	assert.ok(!map.cells[12].classes.includes(marker))
})

test('bridges, bridge supports and map edges never create a false shore junction', () => {
	for (const classes of [
		['-road', '-bridge', '-v'],
		['-water', '-under-bridge', '-h']
	]) {
		const map = junctionMap()
		map.cells[6].classes = classes
		assert.ok(!waterJunctionClasses(map, 12).includes(marker))
	}
	const map = junctionMap()
	for (const index of [7, 11, 12]) {
		const copy = structuredClone(map)
		copy.cells[index].classes = ['-water', '-under-bridge', '-h']
		assert.ok(!waterJunctionClasses(copy, 12).includes(marker))
	}
	for (const index of [0, 4, 5, 9, 20, 24]) {
		map.cells[index].classes = ['-water', marker]
		assert.ok(!waterJunctionClasses(map, index).includes(marker))
	}
})

test('old imports and game maps receive the artwork without changing naval movement or source objects', () => {
	const map = junctionMap()
	map.cells[12].classes = map.cells[12].classes.filter((name) => name !== marker)
	const original = structuredClone(map)
	const state = initialState(map)
	assert.ok(state.cells[12].classes.includes(marker))
	assert.equal(state.cells[12].terrain, 'water')
	assert.equal(movementCostForDomain('naval', state.cells[12]), 1)
	assert.equal(movementCostForDomain('ground', state.cells[12]), Infinity)
	assert.deepEqual(map, original)
	const imported = readMap(JSON.stringify(map))
	assert.ok(imported.cells[12].classes.includes(marker))
	assert.deepEqual(readMap(mapJson(imported)), imported)
	reconnectWaterJunctions(imported)
	assert.deepEqual(readMap(mapJson(imported)), imported)
})

test('mirroring recomputes the directional artwork instead of copying it to the opposite shore', () => {
	const map = newMap(9, 9)
	for (const index of [12, 13, 19, 20, 21, 28, 29]) paint(map, index, ['-water'])
	assert.ok(map.cells[21].classes.includes(marker))
	const mirrored = mirrorMap(map, 'rotation')
	assert.ok(mirrored.cells[21].classes.includes(marker))
	assert.ok(!mirrored.cells[59].classes.includes(marker))
	assert.deepEqual(mirrorMap(mirrored, 'rotation'), mirrored)
})

test('existing affected maps use the junction consistently in the editor and on the board', () => {
	for (const id of [17, 18, 19]) {
		const map = readMapFixture(id)
		const imported = readMap(JSON.stringify(map))
		const state = initialState(map)
		assert.ok(state.cells.some((cell) => cell.classes.includes(marker)))
		assert.deepEqual(
			imported.cells.map((cell) => cell.classes),
			state.cells.map((cell) => cell.classes)
		)
	}
})

const configurations: [string, number[]][] = [
	['open-nw', [6]],
	['open-ne', [8]],
	['open-nw-ne', [6, 8]],
	['east-nw', [6, 13]],
	['east-nw-narrow', [6, 8, 13]],
	['west-ne', [8, 11]],
	['west-ne-narrow', [6, 8, 11]],
	['south-nw', [6, 17]],
	['south-ne', [8, 17]],
	['south-nw-ne', [6, 8, 17]],
	['southwest-ne', [8, 11, 17]],
	['southwest-ne-narrow', [6, 8, 11, 17]]
]

test('river bends, T junctions and open-water corners select the matching bank and river width', () => {
	for (const [variant, land] of configurations) {
		const map = newMap(5, 5)
		for (const cell of map.cells) cell.classes = ['-water']
		for (const index of land) paint(map, index, ['-grass'])
		assert.deepEqual(
			map.cells[12].classes.filter((name) => waterJunctionModifiers.includes(name)),
			[`-junction-${variant}`],
			variant
		)
		assert.deepEqual(readMap(mapJson(map)), map, variant)
		const state = initialState(map)
		assert.equal(state.cells[12].terrain, 'water', variant)
		assert.equal(movementCostForDomain('naval', state.cells[12]), 1, variant)
		const before = structuredClone(state)
		// Removing both diagonal land corners restores the unmodified water art.
		for (const index of [6, 8]) paint(map, index, ['-water'])
		assert.ok(!map.cells[12].classes.some((name) => waterJunctionModifiers.includes(name)), variant)
		assert.deepEqual(state, before, 'editor painting must not mutate the running game')
	}
})

test('diagonal corrections work on the bottom edge without reading across row boundaries', () => {
	const map = newMap(5, 5)
	for (const cell of map.cells) cell.classes = ['-water']
	paint(map, 16, ['-grass'])
	assert.ok(map.cells[22].classes.includes('-junction-open-nw'))
	paint(map, 9, ['-grass'])
	assert.ok(!map.cells[15].classes.some((name) => waterJunctionModifiers.includes(name)))
})

test('every new junction has a correctly sized sprite, shimmer mask and CSS rule', () => {
	const css = readFileSync(new URL('../src/lib/app.css', import.meta.url), 'utf8')
	for (const [variant] of configurations) {
		const name = `cell-water-junction-${variant}`
		const sprite = Buffer.from(readFileSync(new URL(`../assets/cells/water/${name}@2x.png.base64`, import.meta.url), 'utf8'), 'base64')
		const mask = readFileSync(new URL(`../assets/cells/water-shimmer/${name}.png`, import.meta.url))
		for (const png of [sprite, mask]) {
			assert.equal(png.subarray(1, 4).toString(), 'PNG')
			assert.equal(png.readUInt32BE(16), 250)
			assert.equal(png.readUInt32BE(20), 250)
		}
		assert.ok(css.includes(`&.-junction-${variant} {`))
		assert.ok(css.includes(`/assets/cells/water/${name}@2x.png`))
		assert.ok(css.includes(`/assets/cells/water-shimmer/${name}.png`))
	}
})
