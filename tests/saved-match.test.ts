import assert from 'node:assert/strict'
import test from 'node:test'
import { initialState } from '../src/lib/game/model.ts'
import { createUnit } from '../src/lib/game/catalog.ts'
import { createController } from '../src/lib/game/controller.ts'
import { createMatchController } from '../src/lib/game/match.ts'
import { createSavedMatch, parseSavedMatch, restoreSavedMatch, readSavedMatch, savedMatchKey, createMatchWriter } from '../src/lib/game/saved-match.ts'
import { initializeAiPlanning, getAiPlanning, rememberAiPurchase } from '../src/lib/game/ai-economy.ts'
import { mapIds, readMapFixture } from './map-fixtures.ts'

test('all shipped maps round-trip with their exact layout and AI settings', () => {
	for (const id of mapIds) {
		const map = readMapFixture(id)
		const state = initialState(map)
		initializeAiPlanning(state, () => 0.5)
		rememberAiPurchase(state, 'infantry')
		const save = parseSavedMatch(JSON.stringify(createSavedMatch(map, state, 'expert', 'test')))
		assert.deepEqual(save.map, map)
		const restored = restoreSavedMatch(save)
		assert.deepEqual(restored.units, state.units)
		assert.deepEqual(getAiPlanning(restored), getAiPlanning(state))
		assert.equal(save.difficulty, 'expert')
	}
})

test('restores damage, ammo, movement, cargo, capture, money, next id and undo origin', () => {
	const map = readMapFixture(1)
	const state = initialState(map)
	state.round = 4
	state.player = 2
	state.money = { 1: 400, 2: 600 }
	const unit = state.units.find((unit) => unit.player === 2)!
	unit.health = 45
	unit.movement = 1
	unit.attacks = 0
	unit.capture = 0
	state.selectedId = unit.id
	state.origin = { cell: unit.cell, movement: 1 }
	const transport = state.units.find((unit) => unit.player === 1)!
	Object.assign(transport, createUnit('transport', 1, transport.cell, transport.id))
	transport.cargo = [createUnit('infantry', 1, transport.cell, state.nextId++)]
	state.cells.find((cell) => cell.building)!.capturePoints = 10
	const save = parseSavedMatch(JSON.stringify(createSavedMatch(map, state, 'medium', 'test')))
	const restored = restoreSavedMatch(save)
	assert.deepEqual(restored.units, state.units)
	assert.deepEqual(restored.money, state.money)
	assert.deepEqual(restored.origin, state.origin)
	assert.deepEqual(restored.cells, state.cells)
	assert.equal(restored.nextId, state.nextId)
	assert.equal(restored.round, state.round)
})

test('rejects corrupt, incompatible, transient and impossible saves without modifying the stored value', () => {
	const map = readMapFixture(1)
	const state = initialState(map)
	const save = createSavedMatch(map, state, 'easy', 'test')
	for (const mutate of [
		(s: any) => {
			s.version = 99
		},
		(s: any) => {
			s.snapshot.fighting = true
		},
		(s: any) => {
			s.snapshot.moving = true
		},
		(s: any) => {
			s.snapshot.units[0].health = 999
		},
		(s: any) => {
			s.snapshot.units[0].attacks = 99
		},
		(s: any) => {
			s.snapshot.nextId = 0
		},
		(s: any) => {
			s.snapshot.units[0].cell = -1
		},
		(s: any) => {
			s.snapshot.player = 2
		},
		(s: any) => {
			s.map.cells[0].classes = ['bad-class']
		},
		(s: any) => {
			s.planning = { unitPreferences: { tank: 100 }, recentPurchases: [] }
		}
	]) {
		const corrupt = structuredClone(save)
		mutate(corrupt)
		assert.throws(() => parseSavedMatch(JSON.stringify(corrupt)))
	}
	state.moving = true
	assert.throws(() => createSavedMatch(map, state, 'easy', 'test'), /unsafe/)
	const storage = memoryStorage('{')
	assert.equal(readSavedMatch(storage).error, 'invalid')
	assert.equal(storage.getItem(savedMatchKey), '{')
})

function memoryStorage(initial: string | null = null) {
	let value = initial
	return {
		getItem: (_key: string) => value,
		setItem: (_key: string, next: string) => {
			value = next
		},
		removeItem: (_key: string) => {
			value = null
		}
	}
}

test('a stale tab cannot overwrite or delete another save; storage failure remains recoverable', () => {
	const map = readMapFixture(1)
	const save = createSavedMatch(map, initialState(map), 'easy', 'first')
	const storage = memoryStorage()
	const first = createMatchWriter(storage, null)
	const stale = createMatchWriter(storage, null)
	first(save)
	assert.throws(() => stale({ ...save, id: 'second' }), /conflict/)
	assert.throws(() => stale(null), /conflict/)
	assert.equal(readSavedMatch(storage).save?.id, 'first')
	first(null)
	assert.equal(storage.getItem(savedMatchKey), null)
	assert.equal(
		readSavedMatch({
			...storage,
			getItem() {
				throw new Error('denied')
			}
		}).error,
		'storage'
	)
})

test('combat checkpoint remains before the shot until attack and retaliation are complete', async () => {
	const map = readMapFixture(1)
	const state = initialState(map)
	state.units = [createUnit('infantry', 1, 0, 0), createUnit('infantry', 2, 1, 1)]
	state.nextId = 2
	const before = createSavedMatch(map, state, 'easy', 'test')
	let release!: () => void
	const controller = createController(state, {
		delay: () =>
			new Promise<void>((resolve) => {
				release = resolve
			})
	})
	controller.select(0)
	const fight = controller.fight(state.units[1])
	assert.throws(() => createSavedMatch(map, state, 'easy', 'test'), /unsafe/)
	const interrupted = restoreSavedMatch(before)
	assert.equal(interrupted.units[0].attacks, 2)
	assert.equal(interrupted.units[1].health, 100)
	release()
	await Promise.resolve()
	release()
	await fight
	const after = restoreSavedMatch(parseSavedMatch(JSON.stringify(createSavedMatch(map, state, 'easy', 'test'))))
	assert.equal(after.units[0].attacks, 1)
	assert.equal(after.units[1].attacks, 1)
	assert.deepEqual(after.units, state.units)
})

test('AI checkpoints bracket the turn and do not repeat its income on resume', async () => {
	const map = readMapFixture(1)
	const state = initialState(map)
	state.money[1] = 200
	const checkpoints: string[] = []
	let finish!: () => void
	const completed = new Promise<void>((resolve) => {
		finish = resolve
	})
	const controller = createMatchController(state, {
		aiDifficulty: 'easy',
		delay: async () => {},
		onCheckpoint(state) {
			checkpoints.push(JSON.stringify(createSavedMatch(map, state, 'easy', 'test')))
			if (!state.aiThinking) finish()
		}
	})
	controller.start!()
	await completed
	assert.equal(checkpoints.length, 2)
	const interrupted = restoreSavedMatch(parseSavedMatch(checkpoints[0]))
	assert.equal(interrupted.player, 1)
	assert.equal(interrupted.money[1], 200)
	const completedState = restoreSavedMatch(parseSavedMatch(checkpoints[1]))
	assert.equal(completedState.player, 2)
	assert.equal(completedState.round, 2)
	assert.deepEqual(completedState.money, state.money)
	controller.dispose()
})
