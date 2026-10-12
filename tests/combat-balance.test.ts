import { test } from 'node:test'
import assert from 'node:assert/strict'
import rules from '../src/lib/game/combat-rules.ts'
import { createUnit, unitTypes, terrainTypes } from '../src/lib/game/catalog.ts'
import { initialState } from '../src/lib/game/model.ts'
import { createController } from '../src/lib/game/controller.ts'
import { simulateAttack } from '../src/lib/game/ai.ts'

test('all current unit and terrain combinations retain at least 43.75% incoming damage', () => {
	for (const unit of Object.values(unitTypes)) {
		for (const terrain of Object.values(terrainTypes)) {
			const received = rules.damage(100, 100, 100, unit.defense, unit.domain === 'air' ? 0 : terrain.defense, 'probe', 'probe')
			assert.ok(received >= 43.75, `${unit.name} on ${terrain.name}: ${received}% incoming damage`)
		}
	}
	assert.equal(rules.damage(100, 100, 100, 40, 50, 'probe', 'probe'), 43.75)
	assert.equal(Math.round(rules.damage(40, 100, 100, 40, 50, 'infantry-rocket', 'tank')), 44)
	assert.equal(Math.round(rules.damage(60, 120, 120, 40, 50, 'artillery', 'tank')), 42)
	assert.equal(180 - Math.round(180 - rules.damage(80, 120, 120, 40, 50, 'plane', 'tank')), 52)
})

test('percentage protection compounds rather than adding, and clamps invalid values', () => {
	assert.equal(rules.damage(100, 100, 100, 40, 30, 'tank', 'tank'), 54.25)
	assert.equal(rules.damage(100, 50, 100, 40, 30, 'tank', 'tank'), 27.125)
	assert.equal(rules.damage(100, 100, 100, -20, -30, 'tank', 'tank'), 100)
	assert.equal(rules.damage(100, 100, 100, 120, 0, 'tank', 'tank'), 25)
	assert.equal(rules.damage(100, 100, 100, 0, 120, 'tank', 'tank'), 25)
	assert.equal(rules.damage(70, 180, 180, 30, 0, 'tank', 'artillery'), 54.25)
})

for (const ammo of [0, 1]) {
	test(`controller and AI agree when the defender starts with ${ammo} ammunition`, async () => {
		const state = initialState({ id: 'balance', name: 'Balance', cols: 2, rows: 1, cells: Array.from({ length: 2 }, () => ({ classes: ['-grass'], owner: 0 as const, capturePoints: 20 })), units: [] })
		const attacker = createUnit('infantry', 1, 0, 0)
		const defender = createUnit('infantry', 2, 1, 1)
		defender.attacks = ammo
		state.units = [attacker, defender]
		const game = createController(state, { delay: async () => {} })
		game.select(attacker.id)
		for (let shot = 0; shot < 2; shot++) {
			const projected = simulateAttack(state, attacker, defender)
			await game.fight(defender)
			assert.deepEqual(
				state.units.map((u) => [u.health, u.attacks]),
				projected.units.map((u) => [u.health, u.attacks])
			)
			assert.equal(attacker.health, ammo ? 77 : 100, 'only the first attack may trigger a retaliation')
			assert.equal(defender.attacks, 0)
		}
		game.endTurn()
		assert.equal(attacker.attacks, 2)
		assert.equal(defender.attacks, 2)
		game.dispose()
	})
}
