import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState } from '../src/lib/game/model.ts'
import { createUnit } from '../src/lib/game/catalog.ts'
import { chooseAttack, chooseMovement, chooseCaptureRelay, isAiDifficulty, runAiTurn } from '../src/lib/game/ai.ts'
import * as actions from '../src/lib/game/actions.ts'
import { createController } from '../src/lib/game/controller.ts'
import { chooseExpertDecision, projectExpertDecision } from '../src/lib/game/expert-ai.ts'
import { planExpertProduction } from '../src/lib/game/ai-economy.ts'

function fixture(cols = 8, rows = 5) {
	return initialState({ id: 'expert', name: 'Expert test', cols, rows, cells: Array.from({ length: cols * rows }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [] })
}

function productionFixture() {
	const state = fixture()
	Object.assign(state.cells[0], { building: 'factory', owner: 1 })
	Object.assign(state.cells[1], { building: 'airport', owner: 1 })
	Object.assign(state.cells[2], { building: 'city', owner: 1 })
	state.money[1] = 3000
	state.units = [createUnit('infantry', 1, 8, 0), createUnit('infantry', 1, 16, 1), createUnit('helicopter', 2, 38, 2), createUnit('helicopter', 2, 39, 3)]
	state.nextId = 4
	return state
}

test('Expert is accepted as a difficulty', () => {
	assert.equal(isAiDifficulty('expert'), true)
})

test('Expert completes the starting city with an infantry relay during the opening turn', async () => {
	const state = initialState(JSON.parse(readFileSync(new URL('../src/lib/data/board-1.json', import.meta.url), 'utf8')))
	const relay = chooseCaptureRelay(state)!
	assert.ok(relay)
	const snapshot = JSON.stringify(state)
	assert.equal((await chooseExpertDecision(state, new Set(), new Set())).kind, 'relay')
	assert.equal(JSON.stringify(state), snapshot)
	const game = createController(state, { delay: async () => {} })
	await runAiTurn(
		game,
		'expert',
		() => true,
		async () => {}
	)
	assert.equal(state.round, 2)
	assert.equal(state.cells[10].owner, 1)
	assert.equal(state.cells[10].capturePoints, 20)
	game.endTurn()
	assert.equal(state.money[1], 200, 'The city must pay income at the very next blue turn')
	game.dispose()
})

test('capture relays resume a partial capture using remaining movement, even after a planned move', async () => {
	const state = fixture()
	state.units = [createUnit('infantry', 1, 9, 0), createUnit('infantry', 1, 1, 1), createUnit('infantry', 2, 39, 2)]
	Object.assign(state.cells[9], { building: 'city', capturePoints: 10 })
	Object.assign(state.cells[10], { building: 'factory' })
	state.units[0].capture = 0
	state.units[0].movement = 2
	const decision = await chooseExpertDecision(state, new Set([0]), new Set())
	assert.equal(decision.kind, 'relay')
	if (decision.kind !== 'relay') return
	for (const step of decision.steps) {
		actions.select(state, step.unitId)
		if (step.kind === 'capture') assert.equal(actions.capture(state), true)
		else for (const cell of step.path) assert.equal(actions.move(state, cell), true)
	}
	assert.equal(state.cells[9].owner, 1)
	assert.equal(state.units[0].cell, 10)
	assert.equal(state.units[0].movement, 0)
	assert.equal(state.units[1].capture, 0)
})

test('capture relays reject insufficient movement, blocked exits and spent replacements', () => {
	const state = fixture()
	state.units = [createUnit('infantry', 1, 9, 0), createUnit('infantry', 1, 1, 1)]
	Object.assign(state.cells[9], { building: 'city', capturePoints: 10 })
	state.units[0].capture = 0
	state.units[0].movement = 1
	assert.equal(chooseCaptureRelay(state), null)
	state.units[0].movement = 2
	state.units[1].capture = 0
	assert.equal(chooseCaptureRelay(state), null)
	state.units[1].capture = 1
	for (const index of [8, 10, 17]) state.cells[index].terrain = 'water'
	assert.equal(chooseCaptureRelay(state), null)
})

test('Expert passes up a tempting kill to suppress the rocket that would destroy its tank next turn', async () => {
	const state = fixture()
	state.units = [createUnit('artillery', 1, 0, 0), createUnit('tank', 1, 9, 1), createUnit('jeep', 2, 3, 2), createUnit('infantry-rocket', 2, 10, 3)]
	state.nextId = 4
	state.units[0].movement = 0
	state.units[1].movement = 0
	state.units[1].attacks = 0
	state.units[1].health = 70
	state.units[2].health = 40
	const snapshot = JSON.stringify(state)
	assert.equal(chooseAttack(state, 'hard')?.defenderId, 2)
	const decision = await chooseExpertDecision(state, new Set([0, 1]), new Set())
	assert.deepEqual(decision, { kind: 'attack', attackerId: 0, defenderId: 3 })
	assert.equal(JSON.stringify(state), snapshot, 'Search must not modify the live match')
	const projection = await projectExpertDecision(state, decision, new Set([0, 1]), new Set())
	assert.equal(projection.winner, 1)
	assert.ok(projection.units.some((unit) => unit.id === 1 && unit.health > 0))
})

test('lookahead crosses the enemy turn and our next turn, including income and hospital healing', async () => {
	const state = fixture(20, 4)
	state.units = [createUnit('infantry', 1, 0, 0), createUnit('infantry', 2, 79, 1)]
	state.units[0].health = 30
	Object.assign(state.cells[0], { building: 'hospital', owner: 1 })
	Object.assign(state.cells[1], { building: 'city', owner: 1 })
	Object.assign(state.cells[78], { building: 'city', owner: 2 })
	const projection = await projectExpertDecision(state, { kind: 'end' }, new Set(), new Set())
	assert.equal(projection.round, 3)
	assert.equal(projection.player, 1)
	assert.deepEqual(projection.money, { 1: 200, 2: 200 })
	assert.equal(projection.units.find((unit) => unit.id === 0)?.health, 80)
	assert.deepEqual(state.money, { 1: 0, 2: 0 })
	assert.equal(state.units[0].health, 30)
})

test('recruitment counters the actual composition and stops adding air defense when already covered', () => {
	const state = productionFixture()
	assert.equal(planExpertProduction(state)?.type, 'anti-air')
	state.units.push(createUnit('anti-air', 1, 9, 4), createUnit('anti-air', 1, 17, 5))
	assert.equal(planExpertProduction(state), null)
	state.units.push(createUnit('tank', 2, 37, 6))
	assert.equal(planExpertProduction(state)?.type, 'infantry-rocket')
})

test('recruitment pools the budget across buildings and saves for an important counter', () => {
	const state = productionFixture()
	state.money[1] = 800
	const plan = planExpertProduction(state)!
	assert.equal(plan.type, 'anti-air')
	assert.equal(plan.cost, 1000)
	assert.equal(plan.affordable, false)
	state.money[1] = 1000
	assert.equal(planExpertProduction(state)?.affordable, true)
	assert.equal(planExpertProduction(state)?.buildingIndex, 0)
	state.money[1] = 3000
	const airportPlan = planExpertProduction(state, new Set([0]))!
	assert.equal(airportPlan.buildingIndex, 1)
	assert.ok(['plane', 'helicopter'].includes(airportPlan.type))
	state.cells[2].owner = 0
	state.money[1] = 100
	assert.equal(planExpertProduction(state), null, 'Do not save against imaginary income')
})

test('Expert values a city capture over an equally close hospital when the economy has no income', () => {
	const state = fixture()
	state.units = [createUnit('infantry', 1, 16, 0), createUnit('infantry', 2, 39, 1)]
	Object.assign(state.cells[17], { building: 'hospital' })
	Object.assign(state.cells[8], { building: 'city' })
	assert.equal(chooseMovement(state, 'expert', new Set())?.path.at(-1), 8)
})

test('Expert search yields and abandons its decision if the match is disposed', async () => {
	const state = productionFixture()
	let active = true
	let yields = 0
	const snapshot = JSON.stringify(state)
	const decision = await chooseExpertDecision(
		state,
		new Set(),
		new Set(),
		() => active,
		async () => {
			yields++
			active = false
		}
	)
	assert.ok(yields > 0)
	assert.equal(decision.kind, 'end')
	assert.equal(JSON.stringify(state), snapshot)
})

test('Expert waits for income without spending its reserved funds or getting stuck', async () => {
	const state = productionFixture()
	state.money[1] = 800
	for (const unit of state.units.filter((unit) => unit.player === 1)) {
		unit.movement = 0
		unit.attacks = 0
		unit.capture = 0
	}
	const controller = createController(state, { delay: async () => {} })
	await runAiTurn(
		controller,
		'expert',
		() => true,
		async () => {}
	)
	assert.equal(state.player, 2)
	assert.equal(state.money[1], 800)
	assert.equal(state.units.length, 4)
	controller.dispose()
})

test('Expert develops its economy and beats Hard from either side of Emberfall', async () => {
	for (const expertPlayer of [1, 2] as const) {
		const state = initialState(JSON.parse(readFileSync(new URL('../src/lib/data/board-1.json', import.meta.url), 'utf8')))
		const controller = createController(state, { delay: async () => {} })
		let peakCityCount = 0
		// Balance changes can lengthen a match; check development throughout play,
		// rather than requiring every captured city to remain owned at victory.
		for (let turn = 0; turn < 32 && state.winner === null; turn++) {
			await runAiTurn(
				controller,
				state.player === expertPlayer ? 'expert' : 'hard',
				() => true,
				async () => {}
			)
			assert.ok(state.money[1] >= 0 && state.money[2] >= 0)
			assert.equal(new Set(state.units.map((unit) => unit.cell)).size, state.units.length)
			peakCityCount = Math.max(peakCityCount, state.cells.filter((cell) => cell.owner === expertPlayer && cell.building === 'city').length)
		}
		assert.equal(state.winner, expertPlayer)
		assert.ok(peakCityCount >= 2)
		controller.dispose()
	}
})
