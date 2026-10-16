import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState } from '../src/lib/game/model.ts'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import { createController } from '../src/lib/game/controller.ts'
import { runAiTurn } from '../src/lib/game/ai.ts'
import { expertCandidates, chooseExpertDecision } from '../src/lib/game/expert-ai.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import { planExpertProduction } from '../src/lib/game/ai-economy.ts'
import type { GameState } from '../src/lib/game/types.ts'

test('Expert takes a certain finishing shot without projecting a speculative enemy reply', async () => {
	const state = fixture()
	state.units = [createUnit('tank', 1, 0, 0), { ...createUnit('infantry', 2, 1, 1), health: 1 }]
	const snapshot = JSON.stringify(state)
	let yields = 0
	const decision = await chooseExpertDecision(
		state,
		new Set(),
		() => true,
		async () => {
			yields++
		}
	)
	assert.deepEqual(decision, { kind: 'attack', attackerId: 0, defenderId: 1 })
	assert.equal(yields, 0, 'a certain win does not need an opponent rollout')
	assert.equal(JSON.stringify(state), snapshot)
})

test('Expert finishes the saved endgame instead of waiting for the last enemy to leave cover', async () => {
	const state: GameState = JSON.parse(readFileSync(new URL('./fixtures/expert-endgame.json', import.meta.url), 'utf8')).state
	const game = createController(state, { delay: async () => {} })
	try {
		await runAiTurn(
			game,
			'expert',
			() => true,
			async () => {}
		)
		assert.equal(state.winner, 1, 'the last covered tank can be eliminated this turn')
	} finally {
		game.dispose()
	}
})

function fixture(cols = 8, rows = 5) {
	return initialState({ id: 'expert-progress', name: 'Expert progress', cols, rows, cells: Array.from({ length: cols * rows }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [] })
}

test('Expert vacates an occupied factory and spends available money on reinforcements in the same turn', async () => {
	const state = fixture(12, 5)
	Object.assign(state.cells[0], { building: 'factory', owner: 1, defense: 40 })
	Object.assign(state.cells[24], { building: 'city', owner: 0 })
	state.money[1] = 3000
	state.units = [createUnit('tank', 1, 0, 0), createUnit('infantry', 2, 59, 1)]
	state.nextId = 2
	const game = createController(state, { delay: async () => {} })
	try {
		await runAiTurn(
			game,
			'expert',
			() => true,
			async () => {}
		)
		assert.equal(state.player, 2, 'the AI completes its turn')
		assert.notEqual(state.units.find((unit) => unit.id === 0)?.cell, 0, 'the original tank clears production despite losing building cover')
		assert.ok(
			state.units.some((unit) => unit.player === 1 && unit.id >= 2),
			'clearing the factory leads to an actual purchase'
		)
		assert.ok(state.money[1] < 3000, 'available money is invested instead of hoarded')
	} finally {
		game.dispose()
	}
})

test('Expert retains another unit movement when combat and recruitment compete for candidate slots', () => {
	const state = fixture()
	state.units = [createUnit('artillery', 1, 0, 0), createUnit('tank', 1, 10, 1), createUnit('jeep', 2, 3, 2), createUnit('infantry-rocket', 2, 11, 3), createUnit('infantry', 1, 32, 4)]
	Object.assign(state.cells[7], { building: 'factory', owner: 1 })
	Object.assign(state.cells[35], { building: 'city', owner: 0 })
	state.money[1] = 3000
	state.nextId = 5
	const snapshot = JSON.stringify(state)
	const choices = expertCandidates(state, new Set())
	const moves = choices.filter((choice) => choice.kind === 'move')
	assert.ok(
		choices.some((choice) => choice.kind === 'buy'),
		'recruitment remains an option'
	)
	assert.ok(
		choices.some((choice) => choice.kind === 'attack'),
		'combat remains an option'
	)
	assert.ok(new Set(moves.map((move) => move.unitId)).size >= 2, 'rejecting one advance must not strand every other unit')
	assert.ok(choices.length <= 7, 'alternatives respect the bounded search width')
	for (const move of moves) {
		const unit = state.units.find((candidate) => candidate.id === move.unitId)!
		assert.ok(pathsFrom(state, unit, unit.movement).has(move.path.at(-1)!), 'movement alternatives are reachable this turn')
	}
	assert.equal(JSON.stringify(state), snapshot, 'candidate generation preserves the real board')
})

test('Expert recruits additional capturers on a large unclaimed battlefield even when current enemy firepower is covered', () => {
	const state = fixture(20, 8)
	Object.assign(state.cells[0], { building: 'factory', owner: 1 })
	for (let cell = 10; cell < 30; cell++) Object.assign(state.cells[cell], { building: 'city', owner: 0 })
	state.units = Array.from({ length: 5 }, (_, id) => createUnit('infantry', 1, 80 + id, id))
	state.units.push(createUnit('infantry', 2, 159, 5))
	state.money[1] = 3000
	const plan = planExpertProduction(state)
	assert.ok(plan?.affordable, 'remaining territory creates recruitment demand beyond five capturers')
	assert.ok(unitTypes[plan.type].captures, 'new infantry supports the next wave of captures')
	for (let cell = 10; cell < 30; cell++) state.cells[cell].owner = 1
	assert.equal(planExpertProduction(state), null, 'stop adding redundant units when both territory and enemies are covered')
})
