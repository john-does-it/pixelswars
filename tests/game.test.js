import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState, reachableCells, canAttack, canCapture, purchaseStatus } from '../src/lib/game/model.js'
import { createUnit, unitTypes } from '../src/lib/game/catalog.js'
import * as actions from '../src/lib/game/actions.js'
import { createController } from '../src/lib/game/controller.js'

const maps = [1, 2].map((id) => JSON.parse(readFileSync(new URL(`../src/lib/data/board-${id}.json`, import.meta.url))))
const fixture = () => initialState(maps[0])
const spawn = (state, type, player, cell) => {
	const unit = createUnit(type, player, cell, state.nextId++)
	state.units.push(unit)
	return unit
}

for (const map of maps) {
	test(`map ${map.id}: dimensions, initial armies and isolated sessions`, () => {
		const a = initialState(map),
			b = initialState(map)
		assert.equal(a.cells.length, a.cols * a.rows)
		assert.equal(a.units.length, map.id === '1' ? 10 : 8)
		assert.ok(a.units.every((unit) => unit.cell >= 0 && unit.cell < a.cells.length))
		a.units[0].health = 1
		a.cells[0].owner = 2
		a.money[1] = 1000
		assert.equal(b.units[0].health, 120)
		assert.equal(b.cells[0].owner, 0)
		assert.equal(b.money[1], 0)
	})
	test(`map ${map.id}: movement, occupancy, edge wrapping and cancellation`, () => {
		const state = initialState(map)
		const unit = state.units[1]
		actions.select(state, unit.id)
		assert.ok(!reachableCells(state).includes(0))
		const destination = unit.cell + state.cols
		assert.ok(actions.move(state, destination))
		assert.equal(unit.movement, unitTypes[unit.type].movement - state.cells[destination].cost)
		actions.cancelMove(state)
		assert.equal(unit.cell, 1)
		assert.equal(unit.movement, 5)
		actions.select(state, unit.id)
		unit.cell = state.cols - 1
		assert.equal(actions.move(state, state.cols), false)
		unit.movement = 0
		assert.deepEqual(reachableCells(state), [])
	})
}

test('rectangular map has rotational symmetry, equal armies and reachable objectives', () => {
	const state = initialState(maps[1])
	for (const cell of state.cells) {
		const opposite = state.cells[state.cells.length - 1 - cell.index]
		assert.equal(cell.cost, opposite.cost)
		assert.equal(cell.defense, opposite.defense)
		assert.equal(cell.building, opposite.building)
		assert.equal(cell.owner, 0)
	}
	for (const unit of state.units) {
		assert.ok(state.units.some((other) => other.player !== unit.player && other.type === unit.type && other.cell === 95 - unit.cell))
	}
	// Every objective can be reached by infantry without crossing water or mountains.
	const visited = new Set([1])
	const pending = [1]
	while (pending.length) {
		const index = pending.pop()
		for (const next of [index - 12, index + 12, ...(index % 12 ? [index - 1] : []), ...(index % 12 < 11 ? [index + 1] : [])]) {
			if (state.cells[next]?.cost <= 3 && !visited.has(next)) {
				visited.add(next)
				pending.push(next)
			}
		}
	}
	assert.equal(state.cells.filter((cell) => cell.building).length, 8)
	assert.ok(state.cells.filter((cell) => cell.building).every((cell) => visited.has(cell.index)))
})

test('capture requires infantry on an enemy/neutral building; two turns transfer ownership', () => {
	const state = fixture(),
		unit = state.units[1],
		cell = state.cells[8]
	unit.cell = 8
	actions.select(state, unit.id)
	assert.ok(canCapture(state))
	assert.ok(actions.capture(state))
	assert.equal(cell.capturePoints, 10)
	assert.equal(cell.owner, 0)
	assert.equal(actions.capture(state), false)
	actions.endTurn(state)
	actions.endTurn(state)
	actions.select(state, unit.id)
	assert.ok(actions.capture(state))
	assert.equal(cell.owner, 1)
	assert.equal(cell.capturePoints, 20)
	assert.equal(canCapture(state), false)
	actions.cancelMove(state)
	assert.equal(unit.cell, 8)
	unit.cell = 11
	actions.select(state, unit.id)
	unit.capture = 1
	assert.equal(canCapture(state), false)
})

test('capture feedback does not award income until the next owner turn', () => {
	const state = fixture()
	const unit = state.units[1]
	unit.cell = 10
	actions.endTurn(state)
	actions.endTurn(state)
	actions.select(state, unit.id)
	actions.capture(state)
	assert.deepEqual(state.capturedCells, [])
	unit.capture = 1
	actions.capture(state)
	assert.deepEqual(state.capturedCells, [10])
	assert.deepEqual(state.incomeCells, [])
	assert.equal(state.money[1], 0)
	actions.endTurn(state)
	assert.deepEqual(state.capturedCells, [])
	assert.equal(state.money[1], 0)
	actions.endTurn(state)
	assert.deepEqual(state.incomeCells, [10])
	assert.equal(state.money[1], 200)
})

test('factories enforce budget, ownership and occupancy, including exact price', () => {
	const state = fixture(),
		cell = state.cells[8]
	actions.openFactory(state, 8)
	assert.equal(state.factoryIndex, null)
	cell.owner = 1
	actions.openFactory(state, 8)
	assert.equal(purchaseStatus(state, 'infantry').missing, 200)
	assert.equal(actions.buy(state, 'infantry'), false)
	state.money[1] = 200
	assert.ok(purchaseStatus(state, 'infantry').available)
	const count = state.units.length
	assert.ok(actions.buy(state, 'infantry'))
	assert.equal(state.units.length, count + 1)
	assert.equal(state.money[1], 0)
	assert.equal(state.factoryIndex, null)
	actions.openFactory(state, 8)
	state.money[1] = 10000
	assert.ok(purchaseStatus(state, 'tank').occupied)
	assert.equal(actions.buy(state, 'tank'), false)
	assert.equal(actions.buy(state, 'unknown'), false)
	state.player = 2
	assert.equal(actions.buy(state, 'infantry'), false)
	assert.equal(state.money[2], 0)
})

test('turns pay only the incoming player, reset capacities and heal owned hospitals', () => {
	const state = fixture(),
		unit = state.units[1]
	state.cells[10].owner = 1
	state.cells[54].owner = 2
	state.cells[9].owner = 1
	unit.cell = 9
	unit.health = 60
	unit.movement = unit.attacks = unit.capture = 0
	actions.endTurn(state)
	assert.deepEqual(state.money, { 1: 0, 2: 200 })
	assert.equal(unit.health, 60)
	actions.endTurn(state)
	assert.deepEqual(state.money, { 1: 200, 2: 200 })
	assert.equal(unit.health, 85)
	assert.equal(unit.movement, 5)
	assert.equal(unit.attacks, 2)
	assert.equal(unit.capture, 1)
	actions.endTurn(state)
	actions.endTurn(state)
	assert.equal(unit.health, 100)
})

test('real controller combat applies health-scaled retaliation and locks actions until completion', async () => {
	const state = fixture()
	state.units = []
	const a = spawn(state, 'infantry', 1, 18),
		b = spawn(state, 'infantry', 2, 19)
	state.cells[18].defense = state.cells[19].defense = 0
	const pending = []
	const game = createController(state, { delay: () => new Promise((resolve) => pending.push(resolve)) })
	game.select(a.id)
	const fight = game.fight(b)
	assert.equal(b.health, 61)
	assert.equal(state.fighting, true)
	game.move(26)
	game.cancel()
	game.confirm()
	game.endTurn()
	assert.equal(a.cell, 18)
	assert.equal(state.selectedId, a.id)
	assert.equal(state.round, 1)
	pending.shift()()
	await Promise.resolve()
	assert.equal(a.health, 76)
	pending.shift()()
	await fight
	assert.equal(a.attacks, 1)
	assert.equal(b.attacks, 2)
	assert.equal(state.fighting, false)
})

test('artillery dead zone, attack bonuses and forbidden targets', async () => {
	const state = fixture()
	state.units = []
	const a = spawn(state, 'artillery', 1, 18),
		b = spawn(state, 'tank', 2, 19)
	const game = createController(state, { delay: async () => {} })
	game.select(a.id)
	await game.fight(b)
	assert.equal(b.health, 180)
	assert.equal(a.attacks, 1)
	b.cell = 20
	state.cells[20].defense = 0
	await game.fight(b)
	assert.equal(b.health, 79)
	assert.equal(a.health, 120)
	assert.equal(a.attacks, 0)
	b.type = 'plane'
	a.type = 'tank'
	b.cell = 19
	assert.equal(canAttack(state, a, b), false)
})

test('death clears selection, declares a winner and prevents subsequent actions', async () => {
	const state = fixture()
	state.units = []
	const a = spawn(state, 'jeep', 1, 18),
		b = spawn(state, 'tank', 2, 19)
	a.health = 1
	const game = createController(state, { delay: async () => {} })
	game.select(a.id)
	await game.fight(b)
	assert.equal(state.units.length, 1)
	assert.equal(state.selectedId, null)
	assert.equal(state.winner, 2)
	game.endTurn()
	assert.equal(state.round, 1)
})

test('attack commits position; stale and friendly targets never consume ammunition', async () => {
	const state = fixture()
	state.units = []
	const a = spawn(state, 'infantry', 1, 18),
		b = spawn(state, 'artillery', 2, 19)
	const game = createController(state, { delay: async () => {} })
	game.select(a.id)
	a.cell = 26
	await game.fight(b)
	game.cancel()
	assert.equal(a.cell, 26)
	game.select(a.id)
	const ammo = a.attacks
	b.cell = 63
	await game.fight(b)
	await game.fight(a)
	assert.equal(a.attacks, ammo)
})

test('disposing a game during a pending fight stops later damage and sounds', async () => {
	const state = fixture()
	state.units = []
	const a = spawn(state, 'infantry', 1, 18),
		b = spawn(state, 'infantry', 2, 19)
	let resolve
	const sounds = []
	const game = createController(state, { sound: (name) => sounds.push(name), delay: () => new Promise((r) => (resolve = r)) })
	game.select(a.id)
	const fight = game.fight(b)
	game.dispose()
	const count = sounds.length
	resolve()
	await fight
	assert.equal(a.health, 100)
	assert.equal(sounds.length, count)
})
