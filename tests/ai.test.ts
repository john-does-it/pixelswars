import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { initialState } from '../src/lib/game/model.ts'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import { createController } from '../src/lib/game/controller.ts'
import { createMatchController } from '../src/lib/game/match.ts'
import { pathsFrom, chooseAttack, chooseMovement, choosePurchase, runAiTurn, isAiDifficulty } from '../src/lib/game/ai.ts'
import type { GameMap, GameState, UnitTypeId, Player } from '../src/lib/game/types.ts'

function fixture(cols = 8, rows = 5): GameState {
	const state = initialState({ id: 'test', name: 'AI test', cols, rows, cells: Array.from({ length: cols * rows }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [] })
	state.player = 2
	state.round = 2
	return state
}

function spawn(state: GameState, type: UnitTypeId, player: Player, cell: number) {
	const unit = createUnit(type, player, cell, state.nextId++)
	state.units.push(unit)
	return unit
}

const noDelay = async () => {}

test('AI paths respect water, occupancy, movement budget and board edges', () => {
	const state = fixture(5, 3)
	const infantry = spawn(state, 'infantry', 2, 0)
	spawn(state, 'infantry', 2, 1)
	state.cells[5].terrain = 'water'
	assert.deepEqual([...pathsFrom(state, infantry).keys()], [0])
	infantry.type = 'helicopter'
	const paths = pathsFrom(state, infantry, 2)
	assert.equal(paths.get(10)?.cost, 2)
	assert.equal(paths.has(1), false)
	assert.equal(paths.has(4), false)
})

test('hard AI fires artillery before the tank to avoid retaliation on the finishing shot', () => {
	const state = fixture(5, 3)
	const tank = spawn(state, 'tank', 2, 7)
	const artillery = spawn(state, 'artillery', 2, 0)
	const defender = spawn(state, 'tank', 1, 8)
	defender.health = 130
	assert.equal(chooseAttack(state, 'easy')?.attackerId, tank.id)
	assert.equal(chooseAttack(state, 'hard')?.attackerId, artillery.id)
	assert.equal(defender.health, 130, 'Planning must not mutate live health')
	assert.equal(tank.attacks, 2)
})

test('medium AI avoids a suicidal infantry shot while easy takes it', () => {
	const state = fixture()
	const infantry = spawn(state, 'infantry', 2, 0)
	infantry.health = 10
	spawn(state, 'tank', 1, 1)
	assert.ok(chooseAttack(state, 'easy'))
	assert.equal(chooseAttack(state, 'medium'), null)
})

test('production counters aircraft and armor without spending unavailable money', () => {
	const state = fixture()
	Object.assign(state.cells[0], { building: 'factory', owner: 2 })
	state.money[2] = 1000
	spawn(state, 'helicopter', 1, 20)
	assert.equal(choosePurchase(state, 0, 'easy'), 'infantry')
	assert.equal(choosePurchase(state, 0, 'medium'), 'anti-air')
	assert.equal(choosePurchase(state, 0, 'hard'), 'anti-air')
	state.units[0].type = 'tank'
	assert.equal(choosePurchase(state, 0, 'medium'), 'infantry-rocket')
	state.money[2] = 100
	assert.equal(choosePurchase(state, 0, 'hard'), null)
	state.money[2] = 1000
	spawn(state, 'infantry', 2, 0)
	assert.equal(choosePurchase(state, 0, 'hard'), null)
})

test('AI stays to finish a two-turn capture and gives control back', async () => {
	const state = fixture()
	const infantry = spawn(state, 'infantry', 2, 0)
	spawn(state, 'infantry', 1, 39)
	Object.assign(state.cells[0], { building: 'city', terrain: 'building', owner: 0 })
	const controller = createController(state, { delay: noDelay })
	await runAiTurn(controller, 'medium', () => true, noDelay)
	assert.equal(infantry.cell, 0)
	assert.equal(state.cells[0].capturePoints, 10)
	assert.equal(state.player, 1)
	controller.endTurn()
	await runAiTurn(controller, 'medium', () => true, noDelay)
	assert.equal(state.cells[0].owner, 2)
	assert.equal(state.player, 1)
})

test('medium saves city income for missing air defense rather than buying infantry each turn', () => {
	const state = fixture()
	Object.assign(state.cells[0], { building: 'factory', owner: 2 })
	Object.assign(state.cells[1], { building: 'city', owner: 2 })
	spawn(state, 'infantry', 2, 2)
	spawn(state, 'helicopter', 1, 39)
	state.money[2] = 800
	assert.equal(choosePurchase(state, 0, 'medium'), null)
	state.money[2] = 1000
	assert.equal(choosePurchase(state, 0, 'medium'), 'anti-air')
})

test('hard advances and clears production instead of stalling against a passive army', async () => {
	const map = JSON.parse(readFileSync(new URL('../src/lib/data/board-1.json', import.meta.url), 'utf8')) as GameMap
	const state = initialState(map)
	const controller = createController(state, { delay: noDelay })
	for (let turn = 0; turn < 20 && !state.winner; turn++) {
		controller.endTurn()
		await runAiTurn(controller, 'hard', () => true, noDelay)
		assert.ok(state.money[2] >= 0)
	}
	assert.equal(state.winner, 2)
})

test('hard AI occupies a city threatened by enemy infantry', () => {
	const state = fixture(7, 3)
	const tank = spawn(state, 'tank', 2, 8)
	tank.attacks = 0
	spawn(state, 'infantry', 1, 12)
	Object.assign(state.cells[10], { building: 'city', terrain: 'building', owner: 2, defense: 40 })
	const movement = chooseMovement(state, 'hard', new Set())
	assert.equal(movement?.path.at(-1), 10)
	tank.cell = 10
	assert.equal(chooseMovement(state, 'hard', new Set()), null, 'Keep the garrison while enemy infantry remains nearby')
})

test('hard AI values a durable screen with ranged coverage more than an unsupported lure', () => {
	const state = fixture(7, 3)
	const tank = spawn(state, 'tank', 2, 8)
	tank.attacks = 0
	spawn(state, 'infantry', 1, 12)
	Object.assign(state.cells[10], { building: 'city', terrain: 'building', owner: 2, defense: 40 })
	const unsupported = chooseMovement(state, 'hard', new Set())!
	const artillery = spawn(state, 'artillery', 2, 0)
	const supported = chooseMovement(state, 'hard', new Set([artillery.id]))!
	assert.deepEqual(supported.path, unsupported.path)
	assert.ok(supported.score > unsupported.score)
})

test('medium AI sends a badly injured tank to an owned hospital', () => {
	const state = fixture(7, 3)
	const tank = spawn(state, 'tank', 2, 8)
	tank.health = 30
	spawn(state, 'tank', 1, 20)
	Object.assign(state.cells[7], { building: 'hospital', terrain: 'building', owner: 2, defense: 40 })
	assert.equal(chooseMovement(state, 'medium', new Set())?.path.at(-1), 7)
})

test('disposing during a movement animation prevents confirmation or further moves', async () => {
	const state = fixture()
	spawn(state, 'infantry', 1, 0)
	spawn(state, 'infantry', 2, 39)
	const controller = createController(state, { delay: noDelay })
	let active = true
	let snapshot = ''
	await runAiTurn(
		controller,
		'easy',
		() => active,
		async () => {
			if (state.units[1].cell !== 39) {
				active = false
				controller.dispose()
				snapshot = JSON.stringify(state)
			}
		}
	)
	assert.ok(snapshot)
	assert.equal(JSON.stringify(state), snapshot)
})

test('a lethal AI attack stops at victory without starting another turn', async () => {
	const state = fixture()
	spawn(state, 'tank', 2, 0)
	spawn(state, 'infantry', 1, 1).health = 1
	await runAiTurn(createController(state, { delay: noDelay }), 'hard', () => true, noDelay)
	assert.equal(state.winner, 2)
	assert.equal(state.round, 2)
	assert.equal(state.units.length, 1)
})

test('AI match blocks human actions during its turn and disposal cancels pending work', async () => {
	const state = fixture()
	spawn(state, 'infantry', 1, 0)
	const enemy = spawn(state, 'infantry', 2, 39)
	state.player = 1
	state.round = 1
	let resume!: () => void
	const delay = () =>
		new Promise<void>((resolve) => {
			resume = resolve
		})
	const match = createMatchController(state, { aiDifficulty: 'hard', delay })
	match.start?.()
	assert.equal(state.aiThinking, true)
	match.select(enemy.id)
	match.move(38)
	match.endTurn()
	assert.equal(state.player, 1)
	assert.equal(state.selectedId, null)
	assert.equal(enemy.cell, 39)
	match.dispose()
	const snapshot = JSON.stringify(state)
	resume()
	await new Promise<void>((resolve) => setImmediate(resolve))
	assert.equal(JSON.stringify(state), snapshot)
})

test('blue AI opens once, then red is human-controlled and hands back to blue', async () => {
	const state = fixture()
	spawn(state, 'infantry', 1, 0)
	const human = spawn(state, 'infantry', 2, 39)
	state.player = 1
	state.round = 1
	const match = createMatchController(state, { aiDifficulty: 'medium', delay: noDelay })
	assert.equal(state.aiThinking, true)
	match.start?.()
	match.start?.()
	await new Promise<void>((resolve) => setImmediate(resolve))
	assert.equal(state.player, 2)
	assert.equal(state.round, 2)
	assert.equal(state.aiThinking, false)
	match.select(human.id)
	assert.equal(state.selectedId, human.id)
	match.endTurn()
	assert.equal(state.player, 1)
	assert.equal(state.aiThinking, true)
	await new Promise<void>((resolve) => setImmediate(resolve))
	assert.equal(state.player, 2)
	assert.equal(state.round, 4)
	match.dispose()
})

test('local mode still hands the turn directly to the other player', () => {
	const state = fixture()
	state.player = 1
	state.round = 1
	createMatchController(state).endTurn()
	assert.equal(state.player, 2)
	assert.equal(state.aiThinking, false)
	assert.equal(isAiDifficulty('impossible'), false)
})

for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) {
	test(`${difficulty} completes legal turns on all twelve maps`, async () => {
		for (let mapId = 1; mapId <= 12; mapId++) {
			const map = JSON.parse(readFileSync(new URL(`../src/lib/data/board-${mapId}.json`, import.meta.url), 'utf8')) as GameMap
			const state = initialState(map)
			const controller = createController(state, { delay: noDelay })
			controller.endTurn()
			const start = performance.now()
			await runAiTurn(controller, difficulty, () => true, noDelay)
			assert.ok(performance.now() - start < 10000, `Map ${mapId} decision time exceeded 10s`)
			assert.equal(state.player, 1)
			assert.equal(state.round, 3)
			assert.equal(new Set(state.units.map((unit) => unit.cell)).size, state.units.length)
			for (const unit of state.units) {
				assert.ok(unit.cell >= 0 && unit.cell < state.cells.length)
				assert.ok(unit.movement >= 0 && unit.attacks >= 0)
				if (unitTypes[unit.type].domain !== 'air') assert.notEqual(state.cells[unit.cell].terrain, 'water')
			}
		}
	})
}
