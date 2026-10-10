import { readMapFixture } from './map-fixtures.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState, neighbors, movementCostForDomain, canAttack, reachableCells } from '../src/lib/game/model.ts'
import { assertConnectedRoads, assertWaterShores } from './map-assertions.ts'
import type { GameMap, GameState } from '../src/lib/game/types.ts'

function connectedLand(state: GameState, start: number, closedPassages: number[] = []): Set<number> {
	const visited = new Set([start])
	const pending = [start]
	while (pending.length) {
		for (const neighbor of neighbors(state, pending.pop()!)) {
			if (!visited.has(neighbor) && !closedPassages.includes(neighbor) && Number.isFinite(movementCostForDomain('ground', state.cells[neighbor]))) {
				visited.add(neighbor)
				pending.push(neighbor)
			}
		}
	}
	return visited
}

for (const [id, cols, rows, unitsPerSide, passages] of [
	[
		13,
		10,
		8,
		5,
		[
			[32, 42],
			[37, 47]
		]
	],
	[14, 12, 12, 7, []]
] as const) {
	const map: GameMap = readMapFixture(id)
	test(`${map.name}: crossings connect both armies to every objective`, () => {
		const state = initialState(map)
		assert.equal(state.cols, cols)
		assert.equal(state.rows, rows)
		assert.equal(state.cells.length, cols * rows)
		assertWaterShores(state)
		assertConnectedRoads(state, true)
		const blue = state.units.find((unit) => unit.player === 1)!
		const red = state.units.find((unit) => unit.player === 2)!
		for (const passage of passages) {
			for (const index of passage) {
				assert.equal(state.cells[index].terrain, 'grass')
				assert.equal(state.cells[index - 1].terrain, 'water')
				assert.equal(state.cells[index + 1].terrain, 'water')
			}
			assert.ok(connectedLand(state, blue.cell, [...passage]).has(red.cell), 'either crossing can carry the whole army')
		}
		if (id === 13) assert.equal(connectedLand(state, blue.cell, passages.flat()).has(red.cell), false, 'no unintended route bypasses the river')
		else {
			assert.deepEqual(
				state.cells.filter((cell) => cell.classes.includes('-bridge')).map((cell) => cell.index),
				[53, 65, 75, 76, 90]
			)
			for (const index of [53, 65, 90]) assert.deepEqual(state.cells[index].classes, ['-road', '-bridge', '-v'])
			for (const index of [75, 76]) assert.deepEqual(state.cells[index].classes, ['-road', '-bridge', '-h'])
		}
		for (const army of [1, 2]) {
			const start = state.units.find((unit) => unit.player === army)!
			const reachable = connectedLand(state, start.cell)
			assert.ok(state.cells.filter((cell) => cell.building).every((cell) => reachable.has(cell.index)))
		}
	})
	test(`${map.name}: both armies and objectives start balanced with usable deployment cells`, () => {
		const state = initialState(map)
		assert.equal(state.units.length, unitsPerSide * 2)
		assert.equal(new Set(state.units.map((unit) => unit.cell)).size, state.units.length)
		for (const unit of state.units) {
			assert.ok(state.units.some((opponent) => opponent.player !== unit.player && opponent.type === unit.type && opponent.cell === cols * rows - 1 - unit.cell))
			assert.ok(reachableCells(state, unit).length > 0)
			assert.ok(state.units.every((opponent) => !canAttack(state, unit, opponent)))
		}
		for (const cell of state.cells) {
			const opposite = state.cells.at(-cell.index - 1)!
			if (id === 13) assert.equal(cell.terrain, opposite.terrain)
			if (id === 13) assert.equal(cell.building, opposite.building)
			assert.equal(cell.owner, 0)
			if (cell.building) assert.ok(neighbors(state, cell.index).some((index) => state.cells[index].terrain === 'road'))
		}
		// Which Way Across has asymmetric city positions, with equal objectives on each side.
		const objectives = (cells: GameState['cells']) => cells.flatMap((cell) => (cell.building ? [cell.building] : [])).sort()
		assert.deepEqual(objectives(state.cells.slice(0, (cols * rows) / 2)), objectives(state.cells.slice((cols * rows) / 2)))
	})
}
