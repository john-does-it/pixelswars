import { test } from 'node:test'
import assert from 'node:assert/strict'
import rules from '../src/lib/game/combat-rules.ts'
import { createUnit, unitTypes, terrainTypes } from '../src/lib/game/catalog.ts'
import { initialState } from '../src/lib/game/model.ts'
import { createController } from '../src/lib/game/controller.ts'
import { simulateAttack } from '../src/lib/game/ai.ts'

test('full-health rockets deal about 45 damage to infantry, with health and cover still reducing damage', () => {
	for (const target of ['infantry', 'infantry-sniper']) {
		const damage = (health: number, cover: number) => 100 - Math.round(100 - rules.damage(40, health, 100, 10, cover, 'infantry-rocket', target))
		assert.equal(damage(100, 0), 44)
		assert.equal(damage(50, 0), 22)
		assert.equal(damage(100, 30), 34)
	}
})

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
	assert.equal(rules.damage(70, 180, 180, 30, 0, 'tank', 'artillery'), 67.8125)
})

test('tanks and combat ships deal 25% extra damage to land and naval artillery in both gameplay and AI simulation', async () => {
	for (const type of ['tank', 'attack-ship'] as const) {
		for (const target of ['artillery', 'artillery-ship'] as const) {
			const state = initialState({ id: 'balance', name: 'Balance', cols: 2, rows: 1, cells: [type, target].map((unit) => ({ classes: [unit.endsWith('ship') ? '-water' : '-grass'], owner: 0 as const, capturePoints: 20 })), units: [] })
			const attacker = createUnit(type, 1, 0, 0)
			const defender = createUnit(target, 2, 1, 1)
			state.units = [attacker, defender]
			assert.equal(rules.typeModifier(type, target), 1.25)
			const projected = simulateAttack(state, attacker, defender)
			const game = createController(state, { delay: async () => {} })
			try {
				game.select(attacker.id)
				await game.fight(defender)
				assert.equal(unitTypes[target].maxHealth - defender.health, type === 'tank' ? 68 : 63)
				assert.deepEqual(
					state.units.map(({ health, attacks }) => [health, attacks]),
					projected.units.map(({ health, attacks }) => [health, attacks])
				)
			} finally {
				game.dispose()
			}
		}
	}
	assert.equal(rules.typeModifier('artillery', 'tank'), 1.6)
	assert.equal(rules.typeModifier('artillery-ship', 'tank'), 1.6)
	assert.equal(rules.typeModifier('tank', 'attack-ship'), 1)
	assert.equal(rules.typeModifier('attack-ship', 'attack-ship'), 1)
})

test('a jeep initiating two attacks on a full-health tank survives both retaliations with 3 HP', async () => {
	const state = initialState({ id: 'balance', name: 'Balance', cols: 2, rows: 1, cells: Array.from({ length: 2 }, () => ({ classes: ['-grass'], owner: 0 as const, capturePoints: 20 })), units: [] })
	const jeep = createUnit('jeep', 1, 0, 0)
	const tank = createUnit('tank', 2, 1, 1)
	state.units = [jeep, tank]
	const game = createController(state, { delay: async () => {} })
	try {
		game.select(jeep.id)
		for (const expected of [
			[61, 154],
			[3, 141]
		]) {
			const projected = simulateAttack(state, jeep, tank)
			await game.fight(tank)
			assert.deepEqual([jeep.health, tank.health], expected)
			assert.deepEqual(
				state.units.map(({ health, attacks }) => [health, attacks]),
				projected.units.map(({ health, attacks }) => [health, attacks])
			)
		}
		assert.equal(jeep.attacks, 0)
		assert.equal(tank.attacks, 0)
		assert.equal(state.winner, null)
	} finally {
		game.dispose()
	}
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
