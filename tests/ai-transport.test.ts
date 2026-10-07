import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../src/lib/game/model.ts'
import { createUnit } from '../src/lib/game/catalog.ts'
import { planTransport, transportPurchaseScore, transportedValue } from '../src/lib/game/ai-transport.ts'
import { choosePurchase, runAiTurn } from '../src/lib/game/ai.ts'
import { evaluateExpertPosition } from '../src/lib/game/expert-ai.ts'
import { createController } from '../src/lib/game/controller.ts'
import { enemyPositions, exposure } from '../src/lib/game/ai-threats.ts'

function fixture(cols = 24, rows = 5) {
	return initialState({ id: 'test', name: 'Transport tactics', cols, rows, cells: Array.from({ length: cols * rows }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [] })
}

function recruitment() {
	const state = fixture()
	state.units = [createUnit('infantry', 1, 24, 0), createUnit('infantry', 1, 1, 1), createUnit('transport', 2, 119, 2)]
	state.nextId = 3
	state.money[1] = 600
	Object.assign(state.cells[25], { building: 'factory', owner: 1 })
	Object.assign(state.cells[95], { building: 'oil-field' })
	return state
}

test('all levels can buy a useful transport; higher levels reject needless or exposed purchases', () => {
	for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) assert.equal(choosePurchase(recruitment(), 25, difficulty), 'transport')
	const state = recruitment()
	state.units = state.units.filter((unit) => unit.player !== 1)
	assert.equal(transportPurchaseScore(state, 25), 0, 'no passengers')
	const nearby = recruitment()
	nearby.cells[95].building = null
	nearby.cells[26].building = 'city'
	assert.equal(transportPurchaseScore(nearby, 25), 0, 'walking is quicker')
	const threatened = recruitment()
	threatened.units.push(createUnit('tank', 2, 26, 10))
	assert.equal(transportPurchaseScore(threatened, 25), 0, 'urgent defense comes first')
	for (const difficulty of ['medium', 'hard', 'expert'] as const) assert.notEqual(choosePurchase(threatened, 25, difficulty), 'transport')
})

test('recruitment counts each income objective once and avoids redundant transports', () => {
	const state = recruitment()
	const originalScore = transportPurchaseScore(state, 25)
	state.units.push(createUnit('infantry', 1, 26, 10))
	assert.ok(transportPurchaseScore(state, 25) <= originalScore, 'another passenger cannot multiply the same oil field income')
	state.units.push(createUnit('transport', 1, 30, 11))
	assert.equal(transportPurchaseScore(state, 25), 0)
})

test('AI boards when riding is faster but does not interrupt a capture', () => {
	const state = recruitment()
	state.units.push(createUnit('transport', 1, 25, 3))
	for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) assert.equal(planTransport(state, new Set(), difficulty)?.decision.kind, 'embark')
	state.units = state.units.filter((unit) => unit.id !== 1)
	state.cells[24].building = 'city'
	assert.equal(planTransport(state, new Set(), 'hard'), null)
})

test('difficulty increases from objective delivery to combat opportunities and anticipating enemy movement', () => {
	const state = fixture(9, 5)
	const jeep = createUnit('transport', 1, 20, 0)
	jeep.health = 50
	jeep.cargo = [createUnit('infantry', 1, 20, 1), createUnit('infantry-rocket', 1, 20, 2)]
	for (const passenger of jeep.cargo) {
		passenger.capture = 0
		passenger.movement = 3
	}
	state.units = [jeep, createUnit('tank', 2, 17, 3)]
	state.cells[25].building = 'oil-field'
	const before = JSON.stringify(state)
	const easy = planTransport(state, new Set(), 'easy')!
	const medium = planTransport(state, new Set(), 'medium')!
	const hard = planTransport(state, new Set(), 'hard')!
	assert.ok(medium.score > easy.score, 'medium recognizes a possible shot after deployment')
	assert.equal(medium.decision.kind, 'move')
	assert.equal(hard.decision.kind, 'deploy', 'hard unloads without driving into the tank’s movement envelope')
	const enemyMoves = enemyPositions(state)
	if (medium.decision.kind === 'move') assert.ok(exposure(state, { ...jeep, cell: medium.decision.path.at(-1)! }, enemyMoves) > exposure(state, jeep, enemyMoves))
	assert.equal(JSON.stringify(state), before, 'planning never mutates the live game')
})

test('expert values carried soldiers and recognizes their loss when the vehicle dies', () => {
	const state = fixture(5, 5)
	const jeep = createUnit('transport', 1, 12, 0)
	state.units = [jeep, createUnit('infantry', 2, 24, 4)]
	const emptyValue = evaluateExpertPosition(state, 1)
	jeep.cargo = [createUnit('infantry', 1, 7, 1), createUnit('infantry-sniper', 1, 11, 2)]
	assert.equal(transportedValue(jeep), 1300)
	assert.ok(evaluateExpertPosition(state, 1) >= emptyValue + 700)
	const loadedValue = evaluateExpertPosition(state, 1)
	state.units = state.units.filter((unit) => unit.id !== jeep.id)
	assert.ok(loadedValue - evaluateExpertPosition(state, 1) >= 1300)
})

test('AI keeps passengers aboard for a useful second driving turn, then deploys at the objective', () => {
	const state = fixture(30, 3)
	const jeep = createUnit('transport', 1, 34, 0)
	jeep.movement = 0
	const passenger = createUnit('infantry', 1, 34, 1)
	passenger.movement = 1
	jeep.cargo = [passenger]
	state.units = [jeep, createUnit('transport', 2, 89, 2)]
	state.cells[59].building = 'oil-field'
	assert.equal(planTransport(state, new Set([0]), 'hard'), null)
	jeep.cell = 58
	assert.deepEqual(planTransport(state, new Set([0]), 'hard')?.decision, { kind: 'deploy', unitId: 0, passengerId: 1, destination: 59 })
})

test('AI deploys and immediately uses a preserved capture', async () => {
	const state = fixture(7, 3)
	const jeep = createUnit('transport', 1, 7, 0)
	jeep.movement = 0
	const passenger = createUnit('infantry', 1, 7, 1)
	passenger.movement = 0
	jeep.cargo = [passenger]
	state.units = [jeep, createUnit('transport', 2, 20, 2)]
	state.cells[8].building = 'oil-field'
	const controller = createController(state, { delay: async () => {} })
	await runAiTurn(
		controller,
		'hard',
		() => true,
		async () => {}
	)
	assert.equal(passenger.cell, 8)
	assert.equal(state.cells[8].capturePoints, 10)
	controller.dispose()
})

test('AI finishes unloading and uses retained movement and ammunition in the same turn', async () => {
	const state = fixture(7, 3)
	const jeep = createUnit('transport', 1, 7, 0)
	jeep.movement = 0
	const passenger = createUnit('infantry-rocket', 1, 7, 1)
	passenger.capture = 0
	passenger.movement = 2
	jeep.cargo = [passenger]
	const enemy = createUnit('transport', 2, 10, 2)
	state.units = [jeep, enemy]
	let firedAfterDeployment = false
	const controller = createController(state, {
		delay: async () => {},
		onChange: () => {
			if (enemy.health < 125 && passenger.attacks === 0) firedAfterDeployment = true
		}
	})
	await runAiTurn(
		controller,
		'medium',
		() => true,
		async () => {}
	)
	assert.equal(jeep.cargo.length, 0)
	assert.ok(enemy.health < 125, 'passenger moves into range and fires')
	assert.equal(firedAfterDeployment, true)
	assert.equal(state.player, 2)
})
