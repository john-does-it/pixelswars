import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createUnit, terrainTypes, unitTypes } from '../src/lib/game/catalog.ts'
import { initialState, effectiveRange, canAttack, canCapture, purchaseStatus, attackCells } from '../src/lib/game/model.ts'
import * as actions from '../src/lib/game/actions.ts'
import rules from '../src/lib/game/combat-rules.ts'
import { createController } from '../src/lib/game/controller.ts'
import type { UnitTypeId } from '../src/lib/game/types.ts'

function battlefield() {
	return initialState({ id: 'test', name: 'Test', cols: 8, rows: 8, cells: Array.from({ length: 64 }, () => ({ classes: ['-grass'], owner: 0 as const, capturePoints: 20 })), units: [] })
}

test('sniper production costs 500 and supports capturing buildings', () => {
	const state = battlefield()
	Object.assign(state.cells[27], { building: 'factory', owner: 1 })
	state.productionIndex = 27
	state.money[1] = 499
	assert.equal(purchaseStatus(state, 'infantry-sniper').missing, 1)
	assert.equal(actions.buy(state, 'infantry-sniper'), false)
	state.money[1] = 500
	assert.equal(actions.buy(state, 'infantry-sniper'), true)
	assert.equal(state.money[1], 0)
	const sniper = state.units[0]
	assert.equal(sniper.health, 100)
	assert.equal(sniper.movement, 4)
	assert.equal(sniper.attacks, 1)
	assert.equal(unitTypes[sniper.type].attack, 60)
	assert.equal(unitTypes[sniper.type].defense, 10)
	state.cells[27].owner = 0
	actions.select(state, sniper.id)
	assert.equal(canCapture(state), true)
	assert.equal(actions.capture(state), true)
})

test('sniper specializes against all infantry and inherits infantry target restrictions', () => {
	for (const defender of ['infantry', 'infantry-rocket', 'infantry-sniper']) assert.equal(rules.typeModifier('infantry-sniper', defender), 1.5)
	for (const aircraft of ['plane', 'helicopter']) assert.equal(rules.canTarget('infantry-sniper', aircraft), false)
	assert.equal(rules.canTarget('anti-air', 'infantry-sniper'), false)
	assert.equal(rules.typeModifier('helicopter', 'infantry-sniper'), 2)
	assert.equal(rules.typeModifier('infantry-sniper', 'artillery'), 1)
	assert.equal(rules.typeModifier('infantry', 'artillery'), 1.5)
	assert.equal(unitTypes.artillery.defense, 30)
	assert.equal(unitTypes['anti-air'].defense, 30)
})

test('mountain extends only ranged ground units and preserves minimum range', () => {
	const state = battlefield()
	Object.assign(state.cells[27], terrainTypes.moutain, { terrain: 'moutain' })
	for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
		const unit = createUnit(type, 1, 27, 0)
		unit.movement = 0
		const bonus = ['infantry-sniper', 'artillery', 'anti-air'].includes(type) ? 1 : 0
		assert.deepEqual(effectiveRange(state, unit), { minimum: unitTypes[type].exclusion + 1, maximum: unitTypes[type].range + bonus, bonus })
		unit.cell = 26
		assert.equal(effectiveRange(state, unit).bonus, 0)
	}
	const sniper = createUnit('infantry-sniper', 1, 27, 0)
	state.units = [sniper, createUnit('infantry', 2, 31, 1)]
	assert.equal(canAttack(state, sniper, state.units[1]), true)
	for (const adjacent of [18, 19, 20, 26, 28, 34, 35, 36]) assert.equal(attackCells(state, sniper).includes(adjacent), false)
	state.cells[27].terrain = 'grass'
	assert.equal(canAttack(state, sniper, state.units[1]), false)
})

test('artillery and sniper can spend their entire movement entering a mountain', () => {
	for (const type of ['artillery', 'infantry-sniper'] as const) {
		const state = battlefield()
		Object.assign(state.cells[28], terrainTypes.moutain, { terrain: 'moutain' })
		const unit = createUnit(type, 1, 27, 0)
		state.units = [unit]
		actions.select(state, unit.id)
		assert.equal(actions.move(state, 28), true)
		assert.equal(unit.movement, 0)
		assert.equal(effectiveRange(state, unit).bonus, 1)
		actions.cancelMove(state)
		assert.equal(effectiveRange(state, unit).bonus, 0)
	}
})

test('sniper never retaliates at contact but can retaliate at distance two', async () => {
	for (const distance of [1, 2]) {
		const state = battlefield()
		const attacker = createUnit(distance === 1 ? 'infantry' : 'artillery', 1, 27, 0)
		const defender = createUnit('infantry-sniper', 2, 27 + distance, 1)
		state.units = [attacker, defender]
		const controller = createController(state, { delay: async () => {} })
		controller.select(attacker.id)
		await controller.fight(defender)
		assert.ok(defender.health < 100)
		assert.equal(attacker.health < unitTypes[attacker.type].maxHealth, distance === 2)
		controller.dispose()
	}
})

test('sniper has only one attack per turn', async () => {
	const state = battlefield()
	const sniper = createUnit('infantry-sniper', 1, 27, 0)
	const defender = createUnit('tank', 2, 29, 1)
	state.units = [sniper, defender]
	const controller = createController(state, { delay: async () => {} })
	controller.select(sniper.id)
	await controller.fight(defender)
	const remainingHealth = defender.health
	await controller.fight(defender)
	assert.equal(sniper.attacks, 0)
	assert.equal(defender.health, remainingHealth)
	controller.dispose()
})
