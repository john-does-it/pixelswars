import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDevMap } from '../src/lib/game/dev-map.ts'
import { unitTypes } from '../src/lib/game/catalog.ts'
import { initialState, movementCost } from '../src/lib/game/model.ts'

test('development field has every unit for both teams on suitable terrain on a 23x23 grid', () => {
	const map = createDevMap()
	assert.equal(map.id, 'dev')
	assert.equal(map.cols, 23)
	assert.equal(map.rows, 23)
	assert.equal(map.cells.length, 529)
	assert.equal(map.units.length, 58)
	assert.ok(map.cells.some((cell) => cell.classes.includes('-bridge') && cell.classes.includes('-h')))
	assert.ok(map.cells.some((cell) => cell.classes.includes('-bridge') && cell.classes.includes('-v')))
	assert.equal(new Set(map.units.map((unit) => unit.cell)).size, map.units.length)
	const state = initialState(map)
	for (const unit of state.units) assert.ok(Number.isFinite(movementCost(unit, state.cells[unit.cell])))
	for (const player of [1, 2] as const) {
		assert.deepEqual([...new Set(map.units.filter((unit) => unit.player === player).map((unit) => unit.type))].sort(), Object.keys(unitTypes).sort())
	}
})
