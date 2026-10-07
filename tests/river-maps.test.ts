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
	[
		14,
		12,
		12,
		7,
		[
			[50, 62],
			[81, 93]
		]
	]
] as const) {
	const map: GameMap = readMapFixture(id)
	test(`${map.name}: two one-cell-wide grass passages are the only routes between banks`, () => {
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
		assert.equal(connectedLand(state, blue.cell, passages.flat()).has(red.cell), false, 'no unintended route bypasses the river')
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
			assert.equal(cell.terrain, opposite.terrain)
			assert.equal(cell.building, opposite.building)
			assert.equal(cell.owner, 0)
			if (cell.building) assert.ok(neighbors(state, cell.index).some((index) => state.cells[index].terrain === 'road'))
		}
	})
}
