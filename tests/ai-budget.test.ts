import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../src/lib/game/model.ts'
import { createUnit } from '../src/lib/game/catalog.ts'
import { chooseHeuristicDecision } from '../src/lib/game/ai.ts'
import { chooseExpertDecision } from '../src/lib/game/expert-ai.ts'
import { readMapFixture } from './map-fixtures.ts'

test('expired Expert budget returns a legal fallback on both large transport maps without starting projections', async () => {
	for (const mapId of [11, 12]) {
		const state = initialState(readMapFixture(mapId))
		const before = JSON.stringify(state)
		const fallback = chooseHeuristicDecision(state, 'expert', new Set(), new Set(), () => false)
		let yields = 0
		const decision = await chooseExpertDecision(
			state,
			new Set(),
			new Set(),
			() => true,
			async () => {
				yields++
			},
			{ milliseconds: 0, now: () => 0 }
		)
		assert.deepEqual(decision, fallback)
		assert.notEqual(decision.kind, 'end', 'limited thinking must still develop the army')
		assert.equal(yields, 0)
		assert.equal(JSON.stringify(state), before)
	}
})

test('Expert discards a projection interrupted by its deadline and preserves the fallback', async () => {
	const state = initialState({ id: 'budget', name: 'Budget', cols: 8, rows: 5, cells: Array.from({ length: 40 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [] })
	state.units = [createUnit('infantry', 1, 0, 0), createUnit('tank', 1, 8, 1), createUnit('infantry', 2, 39, 2)]
	state.cells[1].building = 'city'
	const before = JSON.stringify(state)
	const fallback = chooseHeuristicDecision(state, 'expert', new Set(), new Set())
	let time = 0
	let yields = 0
	const decision = await chooseExpertDecision(
		state,
		new Set(),
		new Set(),
		() => true,
		async () => {
			yields++
			time = 100
		},
		{ milliseconds: 100, now: () => time }
	)
	assert.equal(yields, 1, 'stop at the first yield after the deadline')
	assert.deepEqual(decision, fallback)
	assert.equal(JSON.stringify(state), before)
	let fullYields = 0
	await chooseExpertDecision(
		state,
		new Set(),
		new Set(),
		() => true,
		async () => {
			fullYields++
		},
		{ milliseconds: 100, now: () => 0 }
	)
	assert.ok(fullYields > yields, 'a larger available budget enables more search')
})

test('cancelling Expert takes priority over a cached fallback', async () => {
	const state = initialState(readMapFixture(11))
	assert.deepEqual(await chooseExpertDecision(state, new Set(), new Set(), () => false), { kind: 'end' })
	let active = true
	const decision = await chooseExpertDecision(
		state,
		new Set(),
		new Set(),
		() => active,
		async () => {
			active = false
		},
		{ now: () => 0 }
	)
	assert.deepEqual(decision, { kind: 'end' })
})
