import { readMapFixture } from './map-fixtures.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertConnectedRoads, assertWaterShores } from './map-assertions.ts'
import { initialState, neighbors, movementCost, reachableCells, canAttack } from '../src/lib/game/model.ts'
import { unitTypes } from '../src/lib/game/catalog.ts'
import { boardingPaths } from '../src/lib/game/transport.ts'
import type { GameMap } from '../src/lib/game/types.ts'

for (const [id, cols, rows] of [
	[10, 16, 14],
	[11, 18, 14],
	[12, 18, 18]
]) {
	const map: GameMap = readMapFixture(id)
	test(`${map.name}: roads are continuous and every turn joins the correct neighboring tiles`, () => {
		const state = initialState(map)
		assertConnectedRoads(state, id === 10)
	})
	test(`${map.name}: lake shores use the existing reversed horizontal naming and basin corners`, () => {
		const state = initialState(map)
		assertWaterShores(state)
		if (id === 11) {
			const mountains = state.cells.filter((cell) => cell.terrain === 'moutain')
			assert.equal(mountains.filter((cell) => cell.index < state.cells.length / 2).length, mountains.length / 2)
			assert.ok(mountains.filter((cell) => state.cells[state.cells.length - 1 - cell.index].terrain !== 'moutain').length >= 8)
		}
	})
	test(`${map.name}: complete terrain and equally reinforced armies`, () => {
		const state = initialState(map)
		assert.equal(state.cols, cols)
		assert.equal(state.rows, rows)
		assert.equal(state.cells.length, cols * rows)
		assert.equal(state.units.length, id === 10 ? 22 : 24)
		assert.equal(new Set(state.units.map((unit) => unit.cell)).size, state.units.length)
		const expected = ['artillery', 'infantry', 'jeep', 'infantry-rocket', 'tank', 'infantry-sniper', 'helicopter', 'anti-air', 'infantry', 'infantry-rocket', 'jeep'].sort()
		if (id !== 10) expected.push('transport')
		expected.sort()
		for (const player of [1, 2]) {
			const positions = state.units
				.filter((unit) => unit.player === player)
				.map((unit) => unit.cell)
				.sort((left, right) => left - right)
			assert.ok(
				positions.every((cell) => Math.floor(cell / cols) === (player === 1 ? 0 : rows - 1)),
				'armies start on their outermost row'
			)
			assert.ok(
				positions.slice(1).every((cell, index) => cell === positions[index] + 1),
				'no empty cells between starting units'
			)
		}
		for (const player of [1, 2])
			assert.deepEqual(
				state.units
					.filter((unit) => unit.player === player)
					.map((unit) => unit.type)
					.sort(),
				expected
			)
		for (const unit of state.units) {
			assert.ok(unit.cell >= 0 && unit.cell < state.cells.length)
			assert.ok(movementCost(unit, state.cells[unit.cell]) <= unitTypes[unit.type].movement)
			assert.ok(reachableCells(state, unit).length > 0 || boardingPaths({ ...state, player: unit.player }, unit).size > 0, `${unit.type} must be able to leave its starting cell or board a transport`)
			assert.ok(
				state.units.every((opponent) => !canAttack(state, unit, opponent)),
				'no attacks before either army advances'
			)
		}
		if (id !== 10) {
			const transports = state.units.filter((unit) => unit.type === 'transport')
			assert.equal(transports.length, 2)
			assert.equal(transports[0].cell + transports[1].cell, state.cells.length - 1)
			for (const transport of transports) assert.ok(state.units.some((unit) => unit.player === transport.player && boardingPaths({ ...state, player: unit.player }, unit).has(transport.cell)))
		}
	})
	test(`${map.name}: neutral objectives remain reachable through connected ground routes`, () => {
		const state = initialState(map)
		const objectives = state.cells.filter((cell) => cell.building)
		if (id === 11 || id === 12) {
			for (const building of objectives) {
				assert.ok(
					neighbors(state, building.index).some((index) => state.cells[index].terrain === 'road'),
					`building ${building.index} must face a road connected to the main network`
				)
			}
		}
		assert.equal(objectives.filter((cell) => cell.building === 'city').length, 4)
		assert.equal(objectives.filter((cell) => cell.building === 'oil-field').length, id === 11 ? 3 : id === 12 ? 4 : 0)
		assert.equal(objectives.filter((cell) => cell.building === 'factory').length, id === 12 ? 5 : 4)
		assert.equal(objectives.filter((cell) => cell.building === 'hospital').length, 2)
		assert.equal(objectives.filter((cell) => cell.building === 'airport').length, id === 12 ? 1 : 2)
		for (const cell of state.cells) {
			const opposite = state.cells[state.cells.length - 1 - cell.index]
			// Map 11 has one additional contested oil field east of the central road.
			// Map 12 adds western cities and replaces the southern airport with a factory.
			const asymmetricObjective = id === 12 && [18, 270, 273].some((index) => cell.index === index || opposite.index === index)
			if (!asymmetricObjective && (id !== 11 || (cell.index !== 119 && opposite.index !== 119))) assert.equal(cell.building, opposite.building)
			assert.equal(cell.owner, 0)
		}
		for (const player of [1, 2]) {
			const infantry = state.units.find((unit) => unit.player === player && unit.type === 'infantry')!
			const visited = new Set([infantry.cell])
			const pending = [infantry.cell]
			while (pending.length) {
				for (const neighbor of neighbors(state, pending.pop()!)) {
					if (!visited.has(neighbor) && movementCost(infantry, state.cells[neighbor]) <= infantry.movement) {
						visited.add(neighbor)
						pending.push(neighbor)
					}
				}
			}
			assert.ok(
				objectives.every((cell) => visited.has(cell.index)),
				'all objectives must be reachable by ground'
			)
			assert.ok(
				state.units.filter((unit) => unit.player !== player).every((unit) => visited.has(unit.cell)),
				'armies must have a land route to each other'
			)
		}
	})
}
