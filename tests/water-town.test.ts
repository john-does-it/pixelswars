import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState, neighbors, movementCostForDomain, reachableCells } from '../src/lib/game/model.ts'
import { assertConnectedRoads } from './map-assertions.ts'
import type { GameMap } from '../src/lib/game/types.ts'

test('Water Town: matching armies can reach every neutral objective through connected land', () => {
	const map: GameMap = JSON.parse(readFileSync(new URL('../src/lib/data/board-15.json', import.meta.url), 'utf8'))
	const state = initialState(map)
	assert.equal(state.cells.length, 98)
	assert.equal(state.units.length, 8)
	assert.equal(state.cells.filter((cell) => cell.building === 'oil-field').length, 2)
	assertConnectedRoads(state)
	for (const player of [1, 2]) {
		const army = state.units.filter((unit) => unit.player === player)
		assert.deepEqual(army.map((unit) => unit.type).sort(), ['infantry', 'infantry-rocket', 'jeep', 'tank'])
		assert.ok(army.every((unit) => reachableCells(state, unit).length > 0))
		const visited = new Set([army[0].cell])
		const pending = [...visited]
		for (const index of pending) {
			for (const neighbor of neighbors(state, index)) {
				if (!visited.has(neighbor) && Number.isFinite(movementCostForDomain('ground', state.cells[neighbor]))) {
					visited.add(neighbor)
					pending.push(neighbor)
				}
			}
		}
		for (const cell of state.cells.filter((cell) => cell.building)) {
			assert.equal(cell.owner, 0)
			assert.ok(visited.has(cell.index), `player ${player} can reach building ${cell.index}`)
		}
	}
})
