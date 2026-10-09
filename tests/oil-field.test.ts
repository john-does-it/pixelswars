import { readMapFixture } from './map-fixtures.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState, canCapture, purchaseStatus } from '../src/lib/game/model.ts'
import { capture, endTurn, select } from '../src/lib/game/actions.ts'
import { economicObjectiveValue } from '../src/lib/game/ai-economy.ts'
import { evaluateExpertPosition } from '../src/lib/game/expert-ai.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import type { GameMap } from '../src/lib/game/types.ts'

test('approved central oil fields are neutral, unoccupied and reachable by both armies', () => {
	const placements: Record<number, number[][]> = {
		1: [[5, 5]],
		3: [
			[4, 4],
			[8, 8]
		],
		5: [
			[9, 3],
			[2, 7]
		],
		8: [
			[6, 6],
			[5, 8]
		],
		9: [
			[1, 5],
			[12, 6]
		],
		11: [
			[10, 5],
			[12, 7],
			[9, 10]
		],
		12: [
			[8, 8],
			[4, 9],
			[15, 10],
			[11, 11]
		],
		14: [
			[3, 6],
			[10, 7]
		]
	}
	for (let mapId = 1; mapId <= 14; mapId++) {
		const map = readMapFixture(mapId) as GameMap
		const state = initialState(map)
		const fields = state.cells.filter((cell) => cell.building === 'oil-field')
		const expected = (placements[mapId] ?? []).map(([column, row]) => (row - 1) * map.cols + column - 1).sort((first, second) => first - second)
		assert.deepEqual(
			fields.map((cell) => cell.index),
			expected,
			`map ${mapId}`
		)
		for (const cell of fields) {
			assert.equal(cell.owner, 0)
			assert.equal(cell.capturePoints, 20)
			assert.ok(!state.units.some((unit) => unit.cell === cell.index))
		}
		for (const player of [1, 2]) {
			const infantry = state.units.find((unit) => unit.player === player && unit.type === 'infantry')!
			const paths = pathsFrom(state, infantry)
			assert.ok(
				fields.every((cell) => paths.has(cell.index)),
				`map ${mapId}, player ${player}`
			)
		}
	}
})

function oilFieldMap(): GameMap {
	return {
		id: 'oil-field-test',
		name: 'Oil field test',
		cols: 6,
		rows: 1,
		cells: [
			{ classes: ['-building', '-oil-field', '-ongrass'], owner: 0, capturePoints: 20 },
			{ classes: ['-building', '-oil-field', '-ongrass'], owner: 1, capturePoints: 20 },
			{ classes: ['-building', '-city', '-ongrass'], owner: 1, capturePoints: 20 },
			{ classes: ['-building', '-oil-field', '-ongrass'], owner: 2, capturePoints: 10 },
			{ classes: ['-grass'], owner: 0, capturePoints: 20 },
			{ classes: ['-grass'], owner: 0, capturePoints: 20 }
		],
		units: [
			{ type: 'infantry', player: 1, cell: 0 },
			{ type: 'tank', player: 2, cell: 5 }
		]
	}
}

test('oil fields use city terrain rules and pay only their owner, including while contested', () => {
	const state = initialState(oilFieldMap())
	assert.equal(state.cells[0].building, 'oil-field')
	assert.equal(state.cells[0].cost, state.cells[2].cost)
	assert.equal(state.cells[0].defense, state.cells[2].defense)
	endTurn(state)
	assert.deepEqual(state.money, { 1: 0, 2: 300 })
	assert.deepEqual(state.incomeCells, [3])
	endTurn(state)
	assert.deepEqual(state.money, { 1: 500, 2: 300 })
	assert.deepEqual(state.incomeCells, [1, 2])
})

test('oil fields take two capture actions and start paying on the next owner turn, without healing or production', () => {
	const state = initialState(oilFieldMap())
	const infantry = state.units[0]
	infantry.health = 50
	select(state, infantry.id)
	assert.equal(canCapture(state), true)
	assert.equal(capture(state), true)
	assert.equal(state.cells[0].capturePoints, 10)
	assert.equal(state.cells[0].owner, 0)
	assert.equal(capture(state), false)
	endTurn(state)
	endTurn(state)
	select(state, infantry.id)
	assert.equal(capture(state), true)
	assert.equal(state.cells[0].owner, 1)
	assert.equal(state.cells[0].capturePoints, 20)
	assert.equal(state.money[1], 500)
	assert.deepEqual(state.capturedCells, [0])
	state.productionIndex = 0
	assert.equal(purchaseStatus(state, 'infantry').available, false)
	endTurn(state)
	endTurn(state)
	assert.equal(state.money[1], 1300)
	assert.equal(infantry.health, 50)
	assert.deepEqual(state.incomeCells, [0, 1, 2])
})

test('AI values the higher oil income above an otherwise identical city', () => {
	const state = initialState(oilFieldMap())
	const oilField = state.cells[0]
	const city = { ...oilField, building: 'city' as const }
	assert.ok(economicObjectiveValue(state, oilField) > economicObjectiveValue(state, city))
	const oilScore = evaluateExpertPosition(state, 1)
	state.cells[1].building = 'city'
	assert.ok(oilScore > evaluateExpertPosition(state, 1))
})
