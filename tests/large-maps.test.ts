import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState, neighbors, movementCost, reachableCells, canAttack } from '../src/lib/game/model.ts'
import { unitTypes } from '../src/lib/game/catalog.ts'
import type { GameMap } from '../src/lib/game/types.ts'

for (const [id, cols, rows] of [
	[10, 16, 14],
	[11, 18, 14],
	[12, 18, 18]
]) {
	const map: GameMap = JSON.parse(readFileSync(new URL(`../src/lib/data/board-${id}.json`, import.meta.url), 'utf8'))
	test(`${map.name}: roads are continuous and every turn joins the correct neighboring tiles`, () => {
		const state = initialState(map)
		const roadCells = state.cells.filter((cell) => cell.terrain === 'road')
		assert.ok(roadCells.filter((cell) => cell.classes.includes('-corner')).length >= 2)
		const connected = new Set([roadCells[0].index])
		const pending = [...connected]
		while (pending.length) {
			for (const neighbor of neighbors(state, pending.pop()!)) {
				if (state.cells[neighbor].terrain === 'road' && !connected.has(neighbor)) {
					connected.add(neighbor)
					pending.push(neighbor)
				}
			}
		}
		assert.equal(connected.size, roadCells.length)
		for (const cell of roadCells) {
			assert.equal(cell.building, null)
			assert.ok(!cell.classes.includes('-forest') && !cell.classes.includes('-moutain'))
			const column = cell.index % cols
			const roadAt = (index: number) => state.cells[index]?.terrain === 'road'
			const left = column > 0 && roadAt(cell.index - 1)
			const right = column < cols - 1 && roadAt(cell.index + 1)
			const above = roadAt(cell.index - cols)
			const below = roadAt(cell.index + cols)
			assert.equal([left, right, above, below].filter(Boolean).length, column === 0 || column === cols - 1 ? 1 : 2)
			if (cell.classes.includes('-corner')) {
				assert.ok(cell.classes.includes('-bottom') ? left && below : above && right)
			} else if (cell.classes.includes('-v')) assert.ok(above && below)
			else assert.ok((left || column === 0) && (right || column === cols - 1))
		}
	})
	test(`${map.name}: lake shores use the existing reversed horizontal naming and basin corners`, () => {
		const state = initialState(map)
		for (const cell of state.cells.filter((cell) => cell.terrain === 'water')) {
			const column = cell.index % cols
			const isWater = (index: number) => state.cells[index]?.terrain === 'water'
			const expected = [...(!isWater(cell.index - cols) ? ['-top'] : []), ...(!isWater(cell.index + cols) ? ['-bottom'] : []), ...(column === 0 || !isWater(cell.index - 1) ? ['-right'] : []), ...(column === cols - 1 || !isWater(cell.index + 1) ? ['-left'] : [])]
			assert.deepEqual(cell.classes.filter((name) => ['-top', '-bottom', '-left', '-right'].includes(name)).sort(), expected.sort())
			assert.equal(cell.classes.includes('-corner'), expected.length === 2)
		}
		if (id === 11) {
			const mountains = state.cells.filter((cell) => cell.terrain === 'moutain')
			assert.equal(mountains.filter((cell) => cell.index < state.cells.length / 2).length, mountains.length / 2)
			assert.ok(mountains.filter((cell) => state.cells[state.cells.length - 1 - cell.index].terrain !== 'moutain').length >= 8)
		}
	})
	test(`${map.name}: complete terrain and equally reinforced armies`, () => {
		const state = initialState(map)
		assert.equal(state.cols, cols)
		assert.equal(state.rows, rows)
		assert.equal(state.cells.length, cols * rows)
		assert.equal(state.units.length, 22)
		assert.equal(new Set(state.units.map((unit) => unit.cell)).size, 22)
		const expected = ['artillery', 'infantry', 'jeep', 'infantry-rocket', 'tank', 'infantry-sniper', 'helicopter', 'anti-air', 'infantry', 'infantry-rocket', 'jeep'].sort()
		for (const player of [1, 2]) {
			const positions = state.units
				.filter((unit) => unit.player === player)
				.map((unit) => unit.cell)
				.sort((left, right) => left - right)
			assert.ok(
				positions.every((cell) => Math.floor(cell / cols) === (player === 1 ? 0 : rows - 1)),
				'armies start on their outermost row'
			)
			assert.ok(
				positions.slice(1).every((cell, index) => cell === positions[index] + 1),
				'no empty cells between starting units'
			)
		}
		for (const player of [1, 2])
			assert.deepEqual(
				state.units
					.filter((unit) => unit.player === player)
					.map((unit) => unit.type)
					.sort(),
				expected
			)
		for (const unit of state.units) {
			assert.ok(unit.cell >= 0 && unit.cell < state.cells.length)
			assert.ok(movementCost(unit, state.cells[unit.cell]) <= unitTypes[unit.type].movement)
			assert.ok(reachableCells(state, unit).length > 0, `${unit.type} must be able to leave its starting cell`)
			assert.ok(
				state.units.every((opponent) => !canAttack(state, unit, opponent)),
				'no attacks before either army advances'
			)
		}
	})
	test(`${map.name}: neutral objectives and connected ground routes are balanced`, () => {
		const state = initialState(map)
		const objectives = state.cells.filter((cell) => cell.building)
		assert.equal(objectives.filter((cell) => cell.building === 'city').length, 6)
		assert.equal(objectives.filter((cell) => cell.building === 'factory').length, 4)
		assert.equal(objectives.filter((cell) => cell.building === 'hospital').length, 2)
		assert.equal(objectives.filter((cell) => cell.building === 'airport').length, 2)
		for (const cell of state.cells) {
			const opposite = state.cells[state.cells.length - 1 - cell.index]
			assert.equal(cell.building, opposite.building)
			assert.equal(cell.owner, 0)
		}
		for (const player of [1, 2]) {
			const infantry = state.units.find((unit) => unit.player === player && unit.type === 'infantry')!
			const visited = new Set([infantry.cell])
			const pending = [infantry.cell]
			while (pending.length) {
				for (const neighbor of neighbors(state, pending.pop()!)) {
					if (!visited.has(neighbor) && movementCost(infantry, state.cells[neighbor]) <= infantry.movement) {
						visited.add(neighbor)
						pending.push(neighbor)
					}
				}
			}
			assert.ok(
				objectives.every((cell) => visited.has(cell.index)),
				'all objectives must be reachable by ground'
			)
			assert.ok(
				state.units.filter((unit) => unit.player !== player).every((unit) => visited.has(unit.cell)),
				'armies must have a land route to each other'
			)
		}
	})
}
