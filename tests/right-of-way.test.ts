import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState, neighbors } from '../src/lib/game/model.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import type { GameMap } from '../src/lib/game/types.ts'
import { assertConnectedRoads } from './map-assertions.ts'

const map = JSON.parse(readFileSync(new URL('../src/lib/data/right-of-way.json', import.meta.url), 'utf8')) as GameMap

test('Right of Way has a centered, connected road network serving every building', () => {
	const state = initialState(map)
	assertConnectedRoads(state)
	for (const cell of state.cells) {
		const opposite = state.cells[state.cells.length - 1 - cell.index]
		assert.equal(cell.terrain === 'road', opposite.terrain === 'road')
		assert.equal(cell.building, opposite.building)
		if (cell.building) {
			assert.ok(
				neighbors(state, cell.index).some((index) => state.cells[index].terrain === 'road'),
				`building ${cell.index} has road access`
			)
		}
	}
	assert.equal(state.cells[64].terrain, 'road')
	assert.equal(state.cells[65].terrain, 'road')
})

test('Right of Way keeps paired objectives accessible with the revised southern mountains', () => {
	const state = initialState(map)
	for (const unitType of ['infantry', 'infantry-rocket']) {
		const blueUnit = state.units.find((unit) => unit.player === 1 && unit.type === unitType)!
		const redUnit = state.units.find((unit) => unit.player === 2 && unit.type === unitType)!
		const bluePaths = pathsFrom(state, blueUnit)
		const redPaths = pathsFrom(state, redUnit)
		for (const building of state.cells.filter((cell) => cell.building)) {
			const oppositeIndex = state.cells.length - 1 - building.index
			assert.ok(bluePaths.has(building.index))
			assert.ok(redPaths.has(oppositeIndex))
			// The revised southern terrain adds one infantry movement point to C2/L11.
			const extraCost = unitType === 'infantry' && building.index === 101 ? 1 : 0
			assert.equal(bluePaths.get(building.index)!.cost, redPaths.get(oppositeIndex)!.cost + extraCost, `${unitType}: access to ${building.building} at ${building.index}`)
		}
	}
})
