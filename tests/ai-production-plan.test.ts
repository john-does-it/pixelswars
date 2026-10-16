import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../src/lib/game/model.ts'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import { createController } from '../src/lib/game/controller.ts'
import { choosePurchase, runAiTurn } from '../src/lib/game/ai.ts'
import { initializeAiPlanning, inheritAiPlanning, rememberAiPurchase, planCounterProduction, planEconomicProduction, planOffensiveProduction, planStrategicProduction } from '../src/lib/game/ai-economy.ts'
import type { UnitTypeId } from '../src/lib/game/types.ts'

function fixture() {
	const state = initialState({ id: 'production-plans', name: 'Production plans', cols: 31, rows: 7, cells: Array.from({ length: 217 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [] })
	Object.assign(state.cells[0], { building: 'factory', owner: 1 })
	Object.assign(state.cells[31], { building: 'city', owner: 1 })
	state.units = [createUnit('infantry', 1, 32, 0), createUnit('infantry', 1, 62, 1)]
	state.nextId = 2
	state.money[1] = 400
	initializeAiPlanning(state, () => 0.5)
	return state
}

function enemies(state: ReturnType<typeof fixture>, type: UnitTypeId, count: number) {
	for (let index = 0; index < count; index++) state.units.push(createUnit(type, 2, 210 + index, state.nextId++))
}

for (const [threat, count, counter, budget] of [
	['infantry', 4, 'jeep', 400],
	['tank', 2, 'infantry-rocket', 200],
	['helicopter', 2, 'anti-air', 800]
] as const) {
	test(`reserve for ${counter}, then buy it once affordable against ${threat}`, () => {
		for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) {
			const state = fixture()
			enemies(state, threat, count)
			state.money[1] = budget
			assert.equal(planCounterProduction(state)?.type, counter)
			assert.equal(choosePurchase(state, 0, difficulty), null)
			state.money[1] = unitTypes[counter].cost
			assert.equal(choosePurchase(state, 0, difficulty), counter)
		}
	})
}

test('saving is cancelled when income, the threat or the available factory disappears', () => {
	for (const change of ['income', 'threat', 'factory'] as const) {
		const state = fixture()
		enemies(state, 'infantry', 4)
		assert.equal(planCounterProduction(state)?.affordable, false)
		if (change === 'income') state.cells[31].owner = 2
		if (change === 'threat') state.units = state.units.filter((unit) => unit.player === 1)
		if (change === 'factory') state.units.push(createUnit('infantry', 1, 0, state.nextId++))
		assert.equal(planCounterProduction(state), null)
	}
})

test('saving lasts at most two income payments and does not block emergency purchases', () => {
	const state = fixture()
	enemies(state, 'helicopter', 2)
	state.money[1] = 400
	assert.equal(planCounterProduction(state), null, '1000 is more than two incomes away')
	state.money[1] = 800
	assert.equal(planCounterProduction(state)?.type, 'anti-air')
	state.units.find((unit) => unit.player === 2)!.cell = 2
	assert.equal(planCounterProduction(state), null, 'defend the factory immediately')
	assert.notEqual(choosePurchase(state, 0, 'medium'), null)
})

test('covered counters are not purchased endlessly; casualties recreate demand', () => {
	const state = fixture()
	enemies(state, 'infantry', 3)
	const jeep = createUnit('jeep', 1, 33, state.nextId++)
	state.units.push(jeep)
	assert.equal(planCounterProduction(state), null)
	jeep.health = 20
	assert.equal(planCounterProduction(state)?.type, 'jeep')
})

test('save for artillery against entrenched armor once direct counters are covered', () => {
	const state = fixture()
	state.money[1] = 1400
	enemies(state, 'tank', 2)
	for (const unit of state.units.filter((unit) => unit.player === 2)) state.cells[unit.cell].defense = 40
	state.units.push(createUnit('infantry-rocket', 1, 33, state.nextId++))
	assert.equal(planCounterProduction(state)?.type, 'artillery')
	assert.equal(planCounterProduction(state)?.affordable, false)
	state.money[1] = 1600
	assert.equal(choosePurchase(state, 0, 'hard'), 'artillery')
})

test('quick additional city income takes precedence over saving for a jeep', () => {
	const state = fixture()
	enemies(state, 'infantry', 4)
	for (const index of [2, 4, 6]) state.cells[index].building = 'city'
	const plan = planStrategicProduction(state, 'expert')
	assert.equal(plan?.reason, 'economy')
	assert.equal(plan?.type, 'infantry')
	assert.ok(plan?.affordable)
	assert.ok(plan.score > 0, 'estimated income pays for the recruit within six turns')
})

test('one existing infantry cannot cover every city, but reachable assigned cities need no duplicate recruit', () => {
	const state = fixture()
	state.cells[2].building = 'city'
	assert.equal(planEconomicProduction(state, 'hard'), null)
	for (const index of [4, 6]) state.cells[index].building = 'city'
	assert.equal(planEconomicProduction(state, 'hard')?.type, 'infantry')
})

test('unreachable or exposed income is not advertised as a quick economic investment', () => {
	const state = fixture()
	state.units = []
	state.cells[3].building = 'city'
	for (let row = 0; row < state.rows; row++) state.cells[row * state.cols + 2].terrain = 'water'
	assert.equal(planEconomicProduction(state, 'hard'), null)
	state.cells[1].building = 'city'
	state.units.push(createUnit('tank', 2, 2, 0))
	assert.equal(planEconomicProduction(state, 'expert'), null)
})

test('stronger AI considers more distant economic investments', () => {
	const state = fixture()
	state.units = []
	state.cells[8].building = 'big-city'
	assert.equal(planEconomicProduction(state, 'easy'), null)
	assert.equal(planEconomicProduction(state, 'medium'), null)
	assert.equal(planEconomicProduction(state, 'hard')?.type, 'infantry')
})

test('economic plan chooses a useful transport for existing infantry, without duplicating vehicles', () => {
	const state = fixture()
	state.cells[0].building = null
	Object.assign(state.cells[32], { building: 'factory', owner: 1 })
	state.units = [createUnit('infantry', 1, 31, 0), createUnit('infantry', 1, 1, 1)]
	state.cells[90].building = 'big-city'
	state.money[1] = 600
	const plan = planEconomicProduction(state, 'expert')
	assert.equal(plan?.type, 'transport')
	assert.equal(plan?.reason, 'transport')
	state.units.push(createUnit('transport', 1, 33, state.nextId++))
	assert.equal(planEconomicProduction(state, 'expert'), null)
})

test('a modest reachable local advantage triggers reinforcements, not endless overproduction', () => {
	const state = fixture()
	state.money[1] = 7000
	state.units = [createUnit('tank', 1, 32, 0), createUnit('infantry', 1, 62, 1), createUnit('tank', 2, 8, 2)]
	state.nextId = 3
	assert.equal(planOffensiveProduction(state, 'easy'), null)
	assert.equal(planOffensiveProduction(state, 'expert')?.reason, 'offensive')
	state.units.push(createUnit('tank', 1, 33, 3))
	assert.equal(planOffensiveProduction(state, 'expert'), null)
	state.units = state.units.filter((unit) => unit.id !== 3)
	for (let row = 0; row < state.rows; row++) state.cells[row * state.cols + 4].terrain = 'water'
	assert.equal(planOffensiveProduction(state, 'expert'), null, 'ground reinforcements cannot reach this front')
})

for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) {
	test(`${difficulty} can purchase multiple units from one factory during a real turn`, async () => {
		const state = fixture()
		state.money[1] = 7000
		for (const index of [2, 4, 6, 8]) state.cells[index].building = 'city'
		enemies(state, 'infantry', 4)
		const firstNewId = state.nextId
		const controller = createController(state, { delay: async () => {} })
		try {
			await runAiTurn(
				controller,
				difficulty,
				() => true,
				async () => {}
			)
			assert.ok(state.units.filter((unit) => unit.player === 1 && unit.id >= firstNewId).length > 1)
			assert.ok(state.money[1] < 6600)
			assert.ok(state.money[1] >= 0)
			assert.equal(state.player, 2)
			assert.equal(new Set(state.units.map((unit) => unit.cell)).size, state.units.length)
		} finally {
			controller.dispose()
		}
	})
}

test('session preferences remain stable and simulated purchases do not change real memory', () => {
	const state = fixture()
	state.money[1] = 7000
	state.units = [createUnit('tank', 1, 32, 0), createUnit('infantry', 1, 62, 1), createUnit('tank', 2, 8, 2)]
	const original = planOffensiveProduction(state, 'expert')
	initializeAiPlanning(state, () => {
		throw new Error('memory must survive subsequent turns')
	})
	const projected = structuredClone(state)
	inheritAiPlanning(state, projected)
	for (let index = 0; index < 10; index++) rememberAiPurchase(projected, 'infantry-rocket')
	assert.deepEqual(planOffensiveProduction(state, 'expert'), original)
	assert.equal(JSON.stringify(state).includes('recentPurchases'), false, 'memory stays outside saved game state')
})

test('small session variations and recent purchases break ties between competitive reinforcements', () => {
	const choices = new Set<UnitTypeId>()
	let changedAfterPurchases = false
	for (let seed = 1; seed <= 12; seed++) {
		const state = initialState({ id: 'variety', name: 'Variety', cols: 16, rows: 5, cells: Array.from({ length: 80 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [] })
		Object.assign(state.cells[0], { building: 'factory', owner: 1 })
		state.money[1] = 7000
		state.units = [createUnit('infantry', 2, 7, 0), createUnit('infantry', 2, 8, 1), ...Array.from({ length: 3 }, (_, index) => ({ ...createUnit('tank', 1, 16 + index, 2 + index), health: 24 }))]
		state.nextId = 5
		let randomState = seed
		initializeAiPlanning(state, () => {
			randomState = (randomState * 1664525 + 1013904223) >>> 0
			return randomState / 4294967296
		})
		const before = planOffensiveProduction(state, 'expert')!
		assert.ok(['jeep', 'infantry-sniper'].includes(before.type), 'variation stays among useful anti-infantry choices')
		assert.deepEqual(planOffensiveProduction(state, 'expert'), before, 're-evaluating the same position does not reroll the plan')
		choices.add(before.type)
		for (let index = 0; index < 4; index++) rememberAiPurchase(state, before.type)
		changedAfterPurchases ||= planOffensiveProduction(state, 'expert')!.type !== before.type
	}
	assert.equal(choices.size, 2)
	assert.ok(changedAfterPurchases)
})
