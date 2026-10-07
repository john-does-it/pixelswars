import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readMapFixture } from './map-fixtures.ts'
import { initialState, canAttack } from '../src/lib/game/model.ts'
import { pathsFrom } from '../src/lib/game/movement.ts'
import { buildingIncome, unitTypes } from '../src/lib/game/catalog.ts'

test('Volcanic Lands starts with equal armies and income, with all objectives reachable', () => {
	const state = initialState(readMapFixture(16))
	assert.equal(state.cells.length, 169)
	assert.equal(state.units.length, 20)
	assert.equal(new Set(state.units.map((unit) => unit.cell)).size, 20)
	assert.equal(state.cells.filter((cell) => cell.building === 'oil-field').length, 4)
	for (const player of [1, 2]) {
		const army = state.units.filter((unit) => unit.player === player)
		assert.deepEqual(army.map((unit) => unit.type).sort(), ['artillery', 'helicopter', 'infantry', 'infantry', 'infantry', 'infantry', 'infantry', 'infantry-sniper', 'jeep', 'tank'])
		assert.equal(
			army.reduce((value, unit) => value + unitTypes[unit.type].cost, 0),
			6700
		)
		assert.equal(
			state.cells.filter((cell) => cell.owner === player).reduce((income, cell) => income + buildingIncome(cell.building), 0),
			200
		)
		assert.equal(state.cells.filter((cell) => cell.owner === player && cell.building === 'factory').length, 1)
		// Check terrain connectivity independently of the packed starting formation.
		const infantry = army.find((unit) => unit.type === 'infantry')!
		const paths = pathsFrom({ ...state, units: [infantry] }, infantry)
		for (const objective of state.cells.filter((cell) => cell.building)) assert.ok(paths.has(objective.index), `player ${player} can reach ${objective.index}`)
	}
	for (const unit of state.units)
		assert.ok(
			state.units.every((opponent) => !canAttack(state, unit, opponent)),
			'armies start outside attack range'
		)
})
