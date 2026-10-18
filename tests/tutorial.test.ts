import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readMapFixture } from './map-fixtures.ts'
import { initialState, canAttack, canCapture, movementCost } from '../src/lib/game/model.ts'
import { createController } from '../src/lib/game/controller.ts'
import { unitTypes } from '../src/lib/game/catalog.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import { tutorialScenario, tutorialMap, createTutorialController, tutorialTarget, tutorialMessage } from '../src/lib/game/tutorial.ts'
import type { TutorialProgress } from '../src/lib/game/tutorial.ts'
import type { ControllerOptions, Unit } from '../src/lib/game/types.ts'

function training(options: ControllerOptions = {}) {
	const state = initialState(tutorialMap(readMapFixture(13)))
	const progress: TutorialProgress = { step: 0, completed: false, failed: false, enemy: null, objectives: [false, false, false], recruited: false, held: false }
	const game = createTutorialController(state, tutorialScenario, progress, { delay: async () => {}, ...options })
	return { game, state, progress }
}
type Training = ReturnType<typeof training>
function walk(t: Training, actor: Unit, goal: number) {
	t.game.select(actor.id)
	const path = pathsFrom(t.state, actor).get(goal)?.path ?? []
	for (const cell of path) {
		if (movementCost(actor, t.state.cells[cell]) > actor.movement) break
		t.game.move(cell)
	}
	t.game.confirm()
}
async function shots(t: Training, actor: Unit) {
	while (t.state.units.includes(actor) && actor.attacks > 0) {
		const target = t.state.units.find((u) => u.player !== actor.player && canAttack(t.state, actor, u))
		if (!target) break
		t.game.select(actor.id)
		await t.game.fight(target)
	}
}
async function mission(t: Training, seed = 0) {
	for (let turn = 0; turn < 35 && !t.progress.completed; turn++) {
		if (!t.state.units.some((u) => u.cell === 11) && t.state.money[1] >= 200 && t.state.units.filter((u) => u.player === 1).length < 6) {
			t.game.openProduction(11)
			t.game.buy('infantry')
		}
		const army = t.state.units.filter((u) => u.player === 1 && unitTypes[u.type].captures)
		if (seed % 2) army.reverse()
		for (const actor of army) {
			if (!t.state.units.includes(actor)) continue
			await shots(t, actor)
			if (!t.state.units.includes(actor)) continue
			const goal = t.state.cells[17].owner !== 1 ? 17 : 64
			if (actor.cell !== goal && !t.state.units.some((u) => u.cell === goal)) walk(t, actor, goal)
			// Units behind a capturing ally can use the other crossing and clear production.
			else if (actor.cell !== goal && actor.cell === 11) walk(t, actor, 21)
			await shots(t, actor)
			if (!t.state.units.includes(actor)) continue
			t.game.select(actor.id)
			if (canCapture(t.state)) t.game.capture()
			t.game.confirm()
		}
		const ids = t.state.units.flatMap((u) => [u.id, ...(u.cargo ?? []).map((p) => p.id)])
		assert.equal(new Set(ids).size, ids.length)
		assert.equal(t.progress.failed, false)
		if (!t.progress.completed) await t.game.endTurn()
	}
	assert.equal(t.progress.completed, true, `seed ${seed}: ${JSON.stringify({ round: t.state.round, progress: t.progress, army: t.state.units })}`)
	assert.equal(t.state.cells[17].owner, 1)
	assert.equal(t.state.cells[64].owner, 1)
}

test('mission exposes three goals and keeps all ordinary actions and movement', async () => {
	const t = training()
	assert.equal(tutorialScenario.steps.length, 3)
	for (const unit of t.state.units) assert.equal(unit.movement, unitTypes[unit.type].movement)
	assert.equal(t.game.allowsAction!('endTurn'), true)
	t.game.select(0)
	t.game.move(22)
	assert.equal(tutorialMessage(t.state, tutorialScenario, t.progress), 'mission_tip_undo')
	t.game.cancel()
	assert.equal(t.state.units[0].cell, 12)
	assert.equal(t.state.units[0].movement, 5)
	t.game.select(0)
	t.game.move(2)
	t.game.confirm()
	assert.equal(t.state.units[0].cell, 2, 'a detour is allowed')
	await t.game.endTurn()
	assert.equal(t.state.round, 3)
	assert.equal(t.progress.step, 0)
})

test('enemy holds when no target is reachable and attacks normally when approached', async () => {
	const t = training()
	// Withdraw from the northern sector using normal movement.
	walk(t, t.state.units[1], 14)
	const before = t.state.units.filter((u) => u.player === 2).map((u) => ({ ...u }))
	await t.game.endTurn()
	assert.deepEqual(
		t.state.units.filter((u) => u.player === 2),
		before
	)
	const actor = t.state.units.find((u) => u.id === 1)!
	walk(t, actor, 16)
	const hp = actor.health
	await t.game.endTurn()
	assert.ok(actor.health < hp)
	assert.equal(t.state.player, 1)
})

test('tutorial attacks and retaliation match the regular controller', async () => {
	const t = training()
	t.game.select(1)
	t.game.move(17)
	const ordinary = structuredClone(t.state)
	const base = createController(ordinary, { delay: async () => {} })
	await t.game.fight(t.state.units.find((u) => u.id === 2)!)
	await base.fight(ordinary.units.find((u) => u.id === 2)!)
	assert.deepEqual(t.state.units, ordinary.units)
})

test('simulated routes survive delays, early purchases, detours and casualty replacements', async () => {
	for (let seed = 0; seed < 16; seed++) {
		const t = training()
		// A delayed opening is legitimate. Move out of the patrol's sector first.
		if (seed % 4) walk(t, t.state.units[1], 14)
		for (let delay = 0; delay < seed % 4; delay++) await t.game.endTurn()
		if (seed % 3 === 0) {
			t.game.openProduction(11)
			t.game.buy('infantry')
		}
		if (seed % 5 === 0) {
			// Recreate a casualty state. Replacement purchases and the rest of the route use real actions.
			t.state.units = t.state.units.filter((u) => u.id !== 1)
			t.game.confirm()
		}
		await mission(t, seed)
	}
})

test('all initial infantry may be lost without locking recruitment or inventing replacements', async () => {
	const t = training()
	t.state.units = t.state.units.filter((u) => u.player === 2)
	t.state.winner = 2
	t.state.money[1] = 0
	t.game.confirm()
	assert.equal(t.state.winner, null)
	assert.equal(tutorialMessage(t.state, tutorialScenario, t.progress), 'mission_tip_rebuild')
	assert.equal(tutorialTarget(t.state, tutorialScenario, t.progress), 11)
	await t.game.endTurn()
	assert.equal(t.state.money[1], 200)
	t.game.openProduction(11)
	t.game.buy('infantry')
	assert.equal(t.state.units.filter((u) => u.player === 1).length, 1)
	await mission(t)
})

test('defeating enemies early does not lock the unfinished city objectives', async () => {
	const t = training()
	t.state.units = t.state.units.filter((u) => u.player === 1)
	t.state.winner = 1
	t.game.confirm()
	assert.equal(t.state.winner, null)
	await mission(t)
})

test('ship arrives once, cargo is preserved and the far bank can be reached by sea', async () => {
	const t = training()
	// Isolate transport mechanics after a secured foothold, without mandatory actors.
	t.state.units = t.state.units.filter((u) => u.player === 1)
	t.state.cells[17].owner = 1
	t.game.confirm()
	const boat = t.state.units.find((u) => u.type === 'transport-ship')!
	assert.ok(boat)
	const passenger = t.state.units[0]
	walk(t, passenger, 24)
	await t.game.endTurn()
	t.game.select(passenger.id)
	t.game.move(boat.cell)
	assert.equal(boat.cargo?.[0], passenger)
	assert.equal(tutorialMessage(t.state, tutorialScenario, t.progress), 'mission_tip_unload')
	t.game.move(44)
	t.game.selectPassenger(passenger.id)
	t.game.deploy(passenger.id, 54)
	assert.equal(passenger.cell, 54)
	assert.equal(t.state.units.filter((u) => u.id === passenger.id).length, 1)
	t.game.confirm()
	walk(t, passenger, 64)
	t.game.select(passenger.id)
	t.game.capture()
	await t.game.endTurn()
	t.game.select(passenger.id)
	t.game.capture()
	assert.equal(t.state.cells[64].owner, 1)
	assert.equal(t.progress.objectives[2], true, 'early capture counts before recruiting')
	t.game.openProduction(11)
	t.game.buy('infantry')
	assert.equal(t.progress.completed, true)
	assert.equal(t.game.allowsAction!('endTurn'), true, 'completion allows continued play')
	await t.game.endTurn()
	t.state.units = t.state.units.filter((u) => u.id !== boat.id)
	t.game.confirm()
	assert.equal(
		t.state.units.some((u) => u.type === 'transport-ship'),
		false,
		'lost transport is not resurrected'
	)
})

test('occupied arrival tiles do not block turns or duplicate ships', async () => {
	const t = training()
	// Reserve the preferred arrival tile as a move origin and occupy it with a purchased ship.
	t.state.money[1] = 1200
	t.game.openProduction(24)
	t.game.buy('transport-ship')
	const purchased = t.state.units.find((u) => u.type === 'transport-ship')!
	t.game.select(purchased.id)
	t.game.move(34)
	t.game.confirm()
	t.state.cells[17].owner = 1
	t.game.confirm()
	const arrival = t.state.units.find((u) => u.id === -1)!
	assert.notEqual(arrival.cell, 34)
	t.game.select(purchased.id)
	t.game.move(44)
	t.game.cancel()
	assert.equal(purchased.cell, 34)
	assert.equal(new Set(t.state.units.map((u) => u.cell)).size, t.state.units.length)
	await t.game.endTurn()
	assert.equal(t.state.units.filter((u) => u.id === -1).length, 1)
})

test('disposing during enemy turn prevents later mutations', async () => {
	let release!: () => void
	const t = training({
		delay: () =>
			new Promise<void>((resolve) => {
				release = resolve
			})
	})
	const turn = t.game.endTurn()
	t.game.dispose()
	const snapshot = structuredClone(t.state)
	release()
	await turn
	assert.deepEqual(t.state, snapshot)
})

test('unprotected idle openings still recover through normal recruitment', async () => {
	for (let skipped = 1; skipped <= 8; skipped++) {
		const t = training()
		for (let turn = 0; turn < skipped; turn++) await t.game.endTurn()
		await mission(t, skipped)
	}
})

test('healing is optional and uses the normal hospital recovery after a real fight', async () => {
	const t = training()
	t.game.select(1)
	t.game.move(17)
	await shots(
		t,
		t.state.units.find((u) => u.id === 1)!
	)
	await t.game.endTurn()
	const wounded = t.state.units.find((u) => u.id === 1)!
	assert.ok(wounded.health < 100)
	for (let turn = 0; turn < 4 && wounded.cell !== 13; turn++) {
		walk(t, wounded, 13)
		if (wounded.cell !== 13) await t.game.endTurn()
	}
	assert.equal(wounded.cell, 13)
	t.game.select(wounded.id)
	assert.equal(tutorialMessage(t.state, tutorialScenario, t.progress), 'mission_tip_heal')
	const health = wounded.health
	await t.game.endTurn()
	assert.equal(wounded.health, Math.min(100, health + 50))
	await mission(t)
})
