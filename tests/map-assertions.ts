import assert from 'node:assert/strict'
import { neighbors } from '../src/lib/game/model.ts'
import type { GameState } from '../src/lib/game/types.ts'

// Sprite openings, independent of the positions of roads in each map.
const roadOpenings: Record<string, string> = {
	'-v': 'NS',
	'-h': 'EW',
	'-cross': 'NESW',
	'-corner -top': 'NE',
	'-corner -bottom': 'SW',
	'-corner -nw': 'NW',
	'-corner -se': 'ES',
	'-junction -north': 'NEW',
	'-junction -east': 'NES',
	'-junction -south': 'ESW',
	'-junction -west': 'NSW',
	'-endtop': 'S',
	'-endbottom': 'N',
	'-endleft': 'E',
	'-endright': 'W'
}

export function assertConnectedRoads(state: GameState, allowSeparateBoundaryRoads = false): void {
	const roads = state.cells.filter((cell) => cell.terrain === 'road')
	assert.ok(roads.length > 0)
	const visited = new Set([roads[0].index])
	const pending = [...visited]
	while (pending.length) {
		for (const neighbor of neighbors(state, pending.pop()!)) {
			if (state.cells[neighbor].terrain === 'road' && !visited.has(neighbor)) {
				visited.add(neighbor)
				pending.push(neighbor)
			}
		}
	}
	if (!allowSeparateBoundaryRoads) assert.equal(visited.size, roads.length, 'every secondary road joins the main network')
	else {
		// Short access roads may enter from off-map. Each separate component must
		// reach the boundary, never end as an isolated patch in the countryside.
		visited.clear()
		for (const start of roads) {
			if (visited.has(start.index)) continue
			const component = [start.index]
			visited.add(start.index)
			for (const index of component) {
				for (const neighbor of neighbors(state, index)) {
					if (state.cells[neighbor].terrain === 'road' && !visited.has(neighbor)) {
						visited.add(neighbor)
						component.push(neighbor)
					}
				}
			}
			assert.ok(
				component.some((index) => index % state.cols === 0 || index % state.cols === state.cols - 1 || index < state.cols || index >= state.cells.length - state.cols),
				'each access road must join a map edge'
			)
		}
	}
	for (const cell of roads) {
		assert.equal(cell.building, null)
		assert.ok(!cell.classes.includes('-forest') && !cell.classes.includes('-moutain'))
		const column = cell.index % state.cols
		const row = Math.floor(cell.index / state.cols)
		const roadAt = (index: number) => state.cells[index]?.terrain === 'road'
		const expected = [(row === 0 || roadAt(cell.index - state.cols)) && 'N', (column === state.cols - 1 || roadAt(cell.index + 1)) && 'E', (row === state.rows - 1 || roadAt(cell.index + state.cols)) && 'S', (column === 0 || roadAt(cell.index - 1)) && 'W'].filter(Boolean).join('')
		const sprite = cell.classes.filter((className) => className !== '-road' && className !== '-bridge').join(' ')
		assert.equal(roadOpenings[sprite], expected, `map ${state.mapId}, cell ${cell.index}: sprite ${sprite} must match its neighbors`)
	}
}

export function assertWaterShores(state: GameState): void {
	for (const cell of state.cells.filter((candidate) => candidate.terrain === 'water')) {
		const column = cell.index % state.cols
		const row = Math.floor(cell.index / state.cols)
		const waterAt = (index: number) => state.cells[index]?.terrain === 'water' || state.cells[index]?.classes.includes('-bridge')
		const expected = [...(row > 0 && !waterAt(cell.index - state.cols) ? ['-top'] : []), ...(row < state.rows - 1 && !waterAt(cell.index + state.cols) ? ['-bottom'] : []), ...(column > 0 && !waterAt(cell.index - 1) ? ['-right'] : []), ...(column < state.cols - 1 && !waterAt(cell.index + 1) ? ['-left'] : [])]
		assert.deepEqual(cell.classes.filter((name) => ['-top', '-bottom', '-left', '-right'].includes(name)).sort(), expected.sort())
		assert.equal(cell.classes.includes('-corner'), expected.length === 2)
	}
}
