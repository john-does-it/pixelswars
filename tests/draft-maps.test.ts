import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { readMap } from '../src/lib/map-editor/model.ts'
import { initialState, canAttack } from '../src/lib/game/model.ts'
import { describeMap } from '../src/lib/game/map-details.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import { createController } from '../src/lib/game/controller.ts'
import { runAiTurn } from '../src/lib/game/ai.ts'
import { unitTypes } from '../src/lib/game/catalog.ts'

const directory = new URL('../src/lib/data/drafts/', import.meta.url)
const drafts = readdirSync(directory)
	.filter((file) => file.endsWith('.json'))
	.map((file) => readMap(readFileSync(new URL(file, directory), 'utf8')))
const published = JSON.parse(readFileSync(new URL('../src/lib/data/map-files.json', import.meta.url), 'utf8'))
const noDelay = async () => {}

const releasedIds = ['28', '29', '30', '31', '35', '36']
const maps = releasedIds.map((id) => readMap(readFileSync(new URL(`../src/lib/data/${published[id]}`, import.meta.url), 'utf8')))

test('draft IDs are unique and kept outside the public registry', () => {
	assert.equal(maps.length, 6)
	assert.ok(!['32', '33', '34'].some((id) => published[id]))
	assert.equal(new Set(maps.map((map) => map.id)).size, maps.length)
	for (const map of drafts) assert.equal(published[map.id], undefined)
})

for (const map of maps) {
	test(`${map.name}: legal deployment, intended tags and accessible objectives`, () => {
		const state = initialState(map)
		const details = describeMap(map)
		assert.equal(details.symmetrical, true)
		assert.equal(details.mobileFriendly, !['33', '34', '36'].includes(map.id))
		for (const unit of state.units) {
			assert.ok(pathsFrom(state, unit, unit.movement).size > 1, `${unit.type} starts blocked`)
			assert.ok(!state.units.some((enemy) => canAttack(state, unit, enemy)), 'No immediate attacks at deployment')
		}
		for (const player of [1, 2] as const) {
			const infantry = state.units.find((unit) => unit.player === player && unit.type === 'infantry')!
			const unobstructed = { ...state, units: [infantry] }
			const paths = pathsFrom(unobstructed, infantry)
			assert.ok(
				state.cells.some((cell) => cell.building === 'city' && cell.owner !== player && paths.has(cell.index)),
				'Income is reachable without a transport'
			)
			const factories = state.cells.filter((cell) => cell.building === 'factory' && cell.owner === player)
			if (map.id !== '36') assert.ok(factories.length > 0, 'Starting army owns a factory')
			for (const factory of factories) assert.ok(paths.has(factory.index), 'Owned factory is accessible')
		}
	})
	test(`${map.name}: both armies complete six AI turns with legal positions`, async () => {
		const state = initialState(map)
		const controller = createController(state, { delay: noDelay })
		for (let turn = 0; turn < 6 && state.winner === null; turn++) {
			const before = state.player
			await runAiTurn(controller, 'medium', () => true, noDelay)
			if (state.winner === null) assert.notEqual(state.player, before)
			assert.equal(new Set(state.units.map((unit) => unit.cell)).size, state.units.length)
			for (const unit of state.units) {
				assert.ok(unit.movement >= 0 && unit.attacks >= 0)
				const cell = state.cells[unit.cell]
				const domain = unitTypes[unit.type].domain ?? 'ground'
				if (domain === 'ground') assert.ok(!['water', 'blocker'].includes(cell.terrain))
				if (domain === 'naval') assert.ok(cell.terrain === 'water' || cell.building === 'naval-base')
			}
		}
	})
}
