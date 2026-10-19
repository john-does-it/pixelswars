import test from 'node:test'
import assert from 'node:assert/strict'
import { initialState, canAttack, canRetaliate } from '../src/lib/game/model.ts'
import { buy, openProduction } from '../src/lib/game/actions.ts'
import { chooseAttack } from '../src/lib/game/ai.ts'
import { newMap, readMap, mapJson } from '../src/lib/map-editor/model.ts'
import { matchSnapshot, applySnapshot } from '../src/lib/game/online.ts'
import { createSavedMatch, parseSavedMatch, restoreSavedMatch } from '../src/lib/game/saved-match.ts'

test('naval artillery fires at 3–4 cells, excludes aircraft, and the AI uses its ranged shot', () => {
	const map = newMap(9, 9)
	map.cells[40].classes = ['-water']
	map.units = [
		{ type: 'artillery-ship', player: 1, cell: 40 },
		{ type: 'tank', player: 2, cell: 43 }
	]
	const state = initialState(map)
	const [ship, target] = state.units
	for (const [cell, possible] of [
		[41, false],
		[42, false],
		[43, true],
		[44, true],
		[4, true],
		[40, false]
	] as const) {
		target.cell = cell
		assert.equal(canAttack(state, ship, target), possible)
	}
	target.cell = 43
	for (const type of ['plane', 'helicopter', 'transport-helicopter'] as const) {
		target.type = type
		assert.equal(canAttack(state, ship, target), false)
	}
	target.type = 'attack-ship'
	assert.ok(canAttack(state, ship, target))
	target.type = 'tank'
	assert.ok(canRetaliate(state, ship, target))
	assert.equal(chooseAttack(state, 'medium')?.attackerId, ship.id)
	ship.attacks = 0
	assert.equal(canRetaliate(state, ship, target), false)
	assert.equal(chooseAttack(state, 'medium'), null)
})

test('naval artillery recruits from a naval base and survives editor, save and online round trips', () => {
	const map = newMap(5, 5)
	Object.assign(map.cells[12], { classes: ['-building', '-naval-base', '-ongrass'], owner: 1 })
	map.units = [
		{ type: 'infantry', player: 1, cell: 0 },
		{ type: 'infantry', player: 2, cell: 24 }
	]
	const state = initialState(map)
	state.money[1] = 2399
	openProduction(state, 12)
	assert.equal(buy(state, 'artillery-ship'), false)
	state.money[1] = 2400
	assert.ok(buy(state, 'artillery-ship'))
	assert.equal(state.money[1], 0)
	const ship = state.units.at(-1)!
	assert.equal(ship.health, 160)
	assert.equal(ship.movement, 3)
	assert.equal(ship.attacks, 1)
	ship.health = 31
	ship.attacks = 0
	const peer = initialState(map)
	assert.ok(applySnapshot(peer, matchSnapshot(state)))
	assert.deepEqual(peer.units, state.units)
	const restored = restoreSavedMatch(parseSavedMatch(JSON.stringify(createSavedMatch(map, state, 'medium', 'test'))))
	assert.deepEqual(restored.units, state.units)
	map.units.push({ type: 'artillery-ship', player: 1, cell: 12 })
	assert.deepEqual(readMap(mapJson(map)), map)
})
