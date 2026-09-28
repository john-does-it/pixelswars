import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../src/lib/game/model.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import { createUnit } from '../src/lib/game/catalog.ts'
import { select, move, cancelMove } from '../src/lib/game/actions.ts'
import { createController } from '../src/lib/game/controller.ts'

function fixture() {
	const state = initialState({ id: 'movement', name: 'Movement', cols: 4, rows: 3, cells: Array.from({ length: 12 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [{ type: 'infantry', player: 1, cell: 0 }] })
	Object.assign(state.cells[1], { terrain: 'moutain', cost: 4 })
	for (const index of [4, 5, 6]) Object.assign(state.cells[index], { terrain: 'road', cost: 1 })
	return state
}

test('movement range uses cheaper detours and cannot cross either army’s occupied cells', () => {
	const state = fixture()
	const unit = state.units[0]
	assert.deepEqual(pathsFrom(state, unit, unit.movement).get(2), { cost: 5, path: [4, 5, 6, 2] })
	for (const player of [1, 2] as const) {
		state.units = [unit, createUnit('infantry', player, 5, 1)]
		const paths = pathsFrom(state, unit, unit.movement)
		assert.equal(paths.has(2), false)
		assert.equal(paths.has(5), false)
	}
})

test('remaining movement range shrinks after a round trip and restores after cancellation', () => {
	const state = fixture()
	const unit = state.units[0]
	const initial = [...pathsFrom(state, unit, unit.movement).keys()]
	select(state, unit.id)
	assert.equal(move(state, 4), true)
	assert.equal(pathsFrom(state, unit, unit.movement).has(2), true)
	assert.equal(move(state, 0), true)
	assert.equal(unit.movement, 2)
	assert.equal(pathsFrom(state, unit, unit.movement).has(2), false)
	cancelMove(state)
	assert.deepEqual([...pathsFrom(state, unit, unit.movement).keys()], initial)
	unit.movement = 0
	assert.deepEqual([...pathsFrom(state, unit, unit.movement).keys()], [unit.cell])
})

test('clicking a distant cell follows the cheapest path step by step and cancellation restores the whole move', async () => {
	const state = fixture()
	const unit = state.units[0]
	const waits: (() => void)[] = []
	const visited: number[] = []
	const game = createController(state, {
		delay: () => new Promise<void>((resolve) => waits.push(resolve)),
		onChange: () => {
			if (state.moving) visited.push(unit.cell)
		}
	})
	game.select(unit.id)
	game.clickCell(2)
	assert.equal(unit.cell, 4)
	assert.equal(state.moving, true)
	game.endTurn()
	game.confirm()
	game.cancel()
	game.move(0)
	game.clickCell(0)
	assert.equal(state.round, 1)
	assert.equal(state.selectedId, unit.id)
	assert.equal(unit.cell, 4)
	for (const cell of [5, 6, 2]) {
		waits.shift()!()
		await Promise.resolve()
		assert.equal(unit.cell, cell)
	}
	assert.deepEqual(visited, [4, 5, 6, 2])
	assert.equal(unit.movement, 0)
	assert.equal(state.moving, false)
	game.cancel()
	assert.equal(unit.cell, 0)
	assert.equal(unit.movement, 5)
	assert.equal(state.selectedId, null)
	game.dispose()
})

test('unreachable destinations do not move, adjacent moves can be confirmed, and disposal stops a route', async () => {
	const state = fixture()
	const unit = state.units[0]
	let resume = () => {}
	const game = createController(state, {
		delay: () =>
			new Promise<void>((resolve) => {
				resume = resolve
			})
	})
	game.select(unit.id)
	game.clickCell(11)
	assert.equal(unit.cell, 0)
	assert.equal(state.moving, false)
	game.clickCell(4)
	game.confirm()
	assert.equal(unit.cell, 4)
	assert.equal(unit.movement, 4)
	game.select(unit.id)
	game.clickCell(2)
	assert.equal(unit.cell, 5)
	game.dispose()
	resume()
	await Promise.resolve()
	assert.equal(unit.cell, 5)
	assert.equal(state.moving, false)
})
