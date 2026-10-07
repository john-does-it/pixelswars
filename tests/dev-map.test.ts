import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDevMap } from '../src/lib/game/dev-map.ts'
import { unitTypes } from '../src/lib/game/catalog.ts'
import { initialState } from '../src/lib/game/model.ts'
import { canEmbark } from '../src/lib/game/transport.ts'

test('development field has every unit for both teams on a clear 8x8 grid', () => {
	const map = createDevMap()
	assert.equal(map.cols, 8)
	assert.equal(map.rows, 8)
	assert.equal(map.cells.length, 64)
	assert.ok(map.cells.every((cell) => cell.classes.join() === '-grass'))
	assert.equal(new Set(map.units.map((unit) => unit.cell)).size, map.units.length)
	const state = initialState(map)
	for (const player of [1, 2] as const) {
		state.player = player
		assert.deepEqual(
			map.units
				.filter((unit) => unit.player === player)
				.map((unit) => unit.type)
				.sort(),
			Object.keys(unitTypes).sort()
		)
		const transport = state.units.find((unit) => unit.type === 'transport' && unit.player === player)!
		assert.equal(state.units.filter((unit) => canEmbark(state, transport, unit)).length, 3)
	}
})
