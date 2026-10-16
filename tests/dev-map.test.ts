import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDevMap } from '../src/lib/game/dev-map.ts'
import { unitTypes } from '../src/lib/game/catalog.ts'
import { initialState } from '../src/lib/game/model.ts'
import { canEmbark } from '../src/lib/game/transport.ts'

test('development field has every unit for both teams on suitable terrain on a 16x16 grid', () => {
	const map = createDevMap()
	assert.equal(map.cols, 16)
	assert.equal(map.rows, 16)
	assert.equal(map.cells.length, 256)
	assert.deepEqual(map.cells[51].classes, ['-blocker', '-ongrass'])
	assert.equal(map.cells.filter((cell) => cell.classes.includes('-water')).length, 64)
	for (const unit of map.units) assert.equal(map.cells[unit.cell].classes.includes('-water'), unitTypes[unit.type].domain === 'naval')
	assert.ok(map.units.every((unit) => unit.cell !== 51))
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
		const ship = state.units.find((unit) => unit.type === 'transport-ship' && unit.player === player)!
		const tank = state.units.find((unit) => unit.type === 'tank' && unit.player === player)!
		assert.ok(canEmbark(state, ship, tank))
	}
})
