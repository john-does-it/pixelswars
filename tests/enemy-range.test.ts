import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createUnit, terrainTypes } from '../src/lib/game/catalog.ts'
import { initialState, inspectedEnemy, attackCells } from '../src/lib/game/model.ts'
import { createController } from '../src/lib/game/controller.ts'
import { createMatchController } from '../src/lib/game/match.ts'

function battlefield() {
	const state = initialState({ id: 'test', name: 'Test', cols: 8, rows: 8, cells: Array.from({ length: 64 }, () => ({ classes: ['-grass'], owner: 0 as const, capturePoints: 20 })), units: [] })
	state.units = [createUnit('infantry', 1, 0, 0), createUnit('infantry-sniper', 2, 27, 1)]
	return state
}

test('artillery targets only cells at range 3–4, with only the outer range extended on mountains', () => {
	const state = battlefield()
	const artillery = createUnit('artillery', 1, 27, 2)
	state.units.push(artillery)
	for (const mountain of [false, true]) {
		if (mountain) Object.assign(state.cells[27], terrainTypes.moutain, { terrain: 'moutain' })
		const targets = attackCells(state, artillery)
		for (const cell of state.cells) {
			const distance = Math.max(Math.abs((cell.index % 8) - 3), Math.abs(Math.floor(cell.index / 8) - 3))
			assert.equal(targets.includes(cell.index), distance >= 3 && distance <= (mountain ? 5 : 4))
		}
	}
})

test('enemy inspection preserves a pending friendly move and its cancellation', () => {
	const state = battlefield()
	const controller = createController(state)
	controller.select(0)
	controller.move(1)
	const unitsBeforeInspection = structuredClone(state.units)
	const originBeforeInspection = { ...state.origin }
	controller.clickCell(27)
	assert.equal(inspectedEnemy(state)?.id, 1)
	assert.equal(state.selectedId, 0)
	assert.deepEqual(state.origin, originBeforeInspection)
	assert.deepEqual(state.units, unitsBeforeInspection)
	// The first empty-cell click closes inspection instead of moving the ally.
	controller.clickCell(2)
	assert.equal(inspectedEnemy(state), undefined)
	assert.deepEqual(state.units, unitsBeforeInspection)
	controller.cancel()
	assert.equal(state.units[0].cell, 0)
	assert.equal(state.units[0].movement, 5)
})

test('inspection toggles and clears when selecting allies, opening production or ending the turn', () => {
	const state = battlefield()
	const controller = createController(state)
	controller.clickCell(27)
	controller.clickCell(27)
	assert.equal(inspectedEnemy(state), undefined)
	controller.clickCell(27)
	controller.select(0)
	assert.equal(state.inspectedEnemyId, null)
	controller.confirm()
	controller.clickCell(27)
	Object.assign(state.cells[1], { building: 'factory', owner: 1 })
	controller.openProduction(1)
	assert.equal(state.inspectedEnemyId, null)
	state.productionIndex = null
	controller.clickCell(27)
	controller.endTurn()
	assert.equal(state.inspectedEnemyId, null)
})

test('enemy range includes mountain bonus, preserves its blind spot and clips at map edges', () => {
	const state = battlefield()
	const controller = createController(state)
	controller.clickCell(27)
	const enemy = inspectedEnemy(state)!
	assert.equal(attackCells(state, enemy).includes(31), false)
	Object.assign(state.cells[27], terrainTypes.moutain, { terrain: 'moutain' })
	assert.equal(attackCells(state, enemy).includes(31), true)
	for (const cell of [18, 19, 20, 26, 27, 28, 34, 35, 36]) assert.equal(attackCells(state, enemy).includes(cell), false)
	assert.ok(attackCells(state, enemy).every((index) => index >= 0 && index < 64))
	state.units[1].health = 0
	assert.equal(inspectedEnemy(state), undefined)
})

test('a legal attack takes priority over inspection, while exhausted units can inspect', () => {
	const state = battlefield()
	const controller = createController(state, { delay: async () => {} })
	state.units[1].cell = 1
	controller.select(0)
	controller.clickCell(1)
	assert.equal(state.fighting, true)
	assert.equal(state.inspectedEnemyId, null)
	assert.ok(state.units[1].health < 100)
	controller.dispose()
	const exhaustedState = battlefield()
	exhaustedState.units[1].cell = 1
	exhaustedState.units[0].attacks = 0
	const exhaustedController = createController(exhaustedState)
	exhaustedController.select(0)
	exhaustedController.clickCell(1)
	assert.equal(inspectedEnemy(exhaustedState)?.id, 1)
	assert.equal(exhaustedState.units[1].health, 100)
})

test('inspection cannot be changed during combat, after victory or on an AI turn', () => {
	for (const lock of ['fighting', 'winner', 'aiThinking'] as const) {
		const state = battlefield()
		const controller = lock === 'aiThinking' ? createMatchController(state, { aiDifficulty: 'easy' }) : createController(state)
		if (lock === 'winner') state.winner = 1
		else state[lock] = true
		controller.clickCell(27)
		assert.equal(state.inspectedEnemyId, null)
		controller.dispose()
	}
})
