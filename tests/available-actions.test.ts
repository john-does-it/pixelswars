import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasAvailableAction, createUnitNavigation } from '../src/lib/game/available-actions.ts'
import { initialState, playerIncome } from '../src/lib/game/model.ts'
import { createUnit } from '../src/lib/game/catalog.ts'
import { capture, endTurn } from '../src/lib/game/actions.ts'

function fixture() {
	const state = initialState({
		id: 'actions',
		name: 'Actions',
		cols: 5,
		rows: 5,
		cells: Array.from({ length: 25 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })),
		units: [
			{ type: 'infantry', player: 1, cell: 12 },
			{ type: 'infantry', player: 2, cell: 24 }
		]
	})
	Object.assign(state.units[0], { movement: 0, attacks: 0, capture: 0 })
	return state
}

function navigation(state: ReturnType<typeof fixture>) {
	const next = createUnitNavigation(state)
	return (backwards = false) => {
		const unit = next(backwards)
		if (unit) state.selectedId = unit.id
		return unit
	}
}

test('Tab chooses nearby active units without bouncing between neighbors, and Shift+Tab retraces them', () => {
	const state = fixture()
	const origin = createUnit('infantry', 1, 0, 2)
	const distant = createUnit('infantry', 1, 19, 3)
	const nearby = createUnit('infantry', 1, 1, 4)
	const nextNearby = createUnit('infantry', 1, 6, 5)
	state.units.push(origin, distant, nearby, nextNearby)
	state.selectedId = origin.id
	const next = navigation(state)
	assert.equal(next(), nearby) // Internal array order would choose the distant unit.
	assert.equal(next(), nextNearby) // Do not bounce back to the origin.
	assert.equal(next(), distant)
	assert.equal(next(true), nextNearby)
	assert.equal(next(true), nearby)
	assert.equal(next(), nextNearby)
	assert.equal(next(), distant)
	assert.equal(next(), nextNearby) // A fresh pass starts at the closest unit.
	assert.equal(next(true), distant)
})

test('unit navigation skips enemies, spent units, dead units and passengers, and handles a lone unit', () => {
	const state = fixture()
	const first = createUnit('infantry', 1, 0, 2)
	const last = createUnit('transport', 1, 4, 3)
	last.cargo = [createUnit('infantry', 1, 4, 4)]
	state.units.push(first, last)
	const next = navigation(state)
	assert.equal(next(), first)
	assert.equal(next(), last)
	assert.equal(next(true), first)
	first.health = 0
	assert.equal(next(true), last)
	assert.equal(next(), last)
	last.cargo = []
	last.movement = 0
	assert.equal(next(), undefined)
	state.units = []
	assert.equal(next(true), undefined)
})

test('manual selection and new turns reset proximity navigation, with stable ties across row boundaries', () => {
	const state = fixture()
	const origin = createUnit('infantry', 1, 4, 2)
	const misleadingIndex = createUnit('infantry', 1, 5, 3)
	const below = createUnit('infantry', 1, 9, 4)
	const left = createUnit('infantry', 1, 3, 5)
	state.units.push(origin, misleadingIndex, below, left)
	state.selectedId = origin.id
	const next = navigation(state)
	assert.equal(next(), left) // Both left and below are one tile away, cell index breaks the tie.
	assert.equal(next(), below)
	state.selectedId = origin.id
	assert.equal(next(), left)
	below.cell = 14 // Free a neighboring tile so the origin can act again.
	state.round++
	assert.equal(next(), origin) // The previously visited origin is eligible again.
	state.player = 2
	assert.equal(next(), state.units[1])
})

test('navigation starts near the preview and includes newly produced units while skipping exhausted history', () => {
	const state = fixture()
	const far = createUnit('infantry', 1, 0, 2)
	const near = createUnit('infantry', 1, 18, 3)
	state.units.push(far, near)
	state.previewIndex = 19
	const next = navigation(state)
	assert.equal(next(), near)
	const recruit = createUnit('infantry', 1, 17, 4)
	state.units.push(recruit)
	assert.equal(next(), recruit)
	Object.assign(near, { movement: 0, attacks: 0, capture: 0 })
	assert.equal(next(true), far)
	assert.equal(next(true), recruit)
})

test('remaining actions require legal movement or a target, not merely unused counters or money', () => {
	const state = fixture()
	state.money[1] = 7000
	assert.equal(hasAvailableAction(state), false)
	state.units[0].movement = 1
	assert.equal(hasAvailableAction(state), false) // Grass costs two.
	state.units[0].movement = 2
	assert.equal(hasAvailableAction(state), true)
	for (const index of [7, 11, 13, 17]) state.cells[index].terrain = 'water'
	assert.equal(hasAvailableAction(state), false)
	state.units[0].attacks = 1
	assert.equal(hasAvailableAction(state), false)
	state.units[1].cell = 13
	assert.equal(hasAvailableAction(state), true)
	state.units[0].attacks = 0
	assert.equal(hasAvailableAction(state), false)
})

test('capture and securing are detected without changing selection, including an unselected unit', () => {
	const state = fixture()
	state.units[0].capture = 1
	state.cells[12].building = 'city'
	assert.equal(hasAvailableAction(state), true)
	assert.equal(state.selectedId, null)
	state.cells[12].owner = 1
	assert.equal(hasAvailableAction(state), false)
	state.cells[12].capturePoints = 10
	assert.equal(hasAvailableAction(state), true)
	state.units[0].capture = 0
	assert.equal(hasAvailableAction(state), false)
})

test('boarding counts even when all empty neighboring cells are impassable; full transports do not', () => {
	const state = fixture()
	for (const index of [7, 11, 17]) state.cells[index].terrain = 'water'
	const transport = createUnit('transport', 1, 13, 2)
	transport.movement = 0
	state.units.push(transport)
	state.units[0].movement = 2
	assert.equal(hasAvailableAction(state), true)
	transport.cargo = [3, 4, 5].map((id) => createUnit('infantry', 1, 13, id))
	for (const index of [8, 14, 18]) state.cells[index].terrain = 'water'
	assert.equal(hasAvailableAction(state), false)
})

test('passengers count only if deployment is possible, regardless of the carrier movement counter', () => {
	const state = fixture()
	const transport = createUnit('transport', 1, 12, 2)
	transport.movement = 0
	transport.cargo = [createUnit('infantry', 1, 12, 3)]
	state.units = [transport]
	assert.equal(hasAvailableAction(state), true)
	for (const index of [7, 11, 13, 17]) state.cells[index].terrain = 'water'
	assert.equal(hasAvailableAction(state), false)
	state.cells[7].terrain = 'grass'
	state.winner = 1
	assert.equal(hasAvailableAction(state), false)
})

test('income follows ownership after complete captures and matches the next player turn payout', () => {
	const state = fixture()
	Object.assign(state.cells[0], { building: 'city', owner: 1 })
	Object.assign(state.cells[1], { building: 'big-city', owner: 1 })
	Object.assign(state.cells[2], { building: 'factory', owner: 1 })
	Object.assign(state.cells[12], { building: 'city', owner: 2 })
	assert.equal(playerIncome(state, 1), 500)
	assert.equal(playerIncome(state, 2), 200)
	state.selectedId = state.units[0].id
	state.units[0].capture = 1
	capture(state)
	assert.equal(playerIncome(state, 1), 500)
	assert.equal(playerIncome(state, 2), 200)
	state.units[0].capture = 1
	capture(state)
	assert.equal(playerIncome(state, 1), 700)
	assert.equal(playerIncome(state, 2), 0)
	endTurn(state)
	endTurn(state)
	assert.equal(state.money[1], playerIncome(state, 1))
})
