import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { describeMap } from '../src/lib/game/map-details.ts'
import { mapIds, readMapFixture } from './map-fixtures.ts'
import type { GameMap } from '../src/lib/game/types.ts'

test('generated map characteristics agree with the current maps and count each army independently', () => {
	const generated = JSON.parse(readFileSync(new URL('../src/lib/data/map-details.json', import.meta.url), 'utf8'))
	for (const id of mapIds) {
		const map = readMapFixture(id)
		const details = describeMap(map)
		assert.deepEqual(generated[id], details)
		for (const player of [1, 2] as const) {
			assert.equal(
				Object.values(details.players[player].units).reduce((a, b) => a + b, 0),
				map.units.filter((u) => u.player === player).length
			)
			assert.equal(
				Object.values(details.players[player].buildings).reduce((a, b) => a + b, 0),
				map.cells.filter((c) => c.owner === player && c.classes.includes('-building')).length
			)
		}
	}
})
test('symmetry requires matching terrain, armies and ownership, ignoring decoration only', () => {
	const map: GameMap = {
		id: '1',
		name: 'Symmetry',
		cols: 3,
		rows: 2,
		cells: Array.from({ length: 6 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })),
		units: [
			{ type: 'infantry', player: 1, cell: 0 },
			{ type: 'infantry', player: 2, cell: 5 }
		]
	}
	assert.equal(describeMap(map).symmetrical, true)
	map.cells[1].classes.push('-variant2')
	assert.equal(describeMap(map).symmetrical, true)
	map.units[1].type = 'tank'
	assert.equal(describeMap(map).symmetrical, false)
	map.units[1].type = 'infantry'
	map.cells[1] = { classes: ['-building', '-city', '-ongrass'], owner: 1, capturePoints: 20 }
	assert.equal(describeMap(map).symmetrical, false)
	map.cells[4] = { ...map.cells[1], owner: 2 }
	assert.equal(describeMap(map).symmetrical, true)
})

test('mobile friendliness favours readable portrait layouts, not just low tile counts', () => {
	const friendly = (cols: number, rows: number) =>
		describeMap({
			id: 'test',
			name: 'Phone layout',
			cols,
			rows,
			cells: Array.from({ length: cols * rows }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })),
			units: []
		} as GameMap).mobileFriendly
	assert.equal(friendly(8, 8), true, 'small square maps remain readable')
	assert.equal(friendly(10, 13), true, 'portrait maps use the available height')
	assert.equal(friendly(13, 10), false, 'rotating the same map makes its tiles too narrow')
	assert.equal(friendly(14, 7), false, 'a small area alone does not make a wide map comfortable')
	assert.equal(friendly(10, 15), true, '32px tiles fit the reference board area')
	assert.equal(friendly(11, 15), false, 'width can limit legibility')
	assert.equal(friendly(10, 16), false, 'height can also limit legibility')
	assert.equal(friendly(8, 30), false, 'very tall maps still require zooming')
	assert.equal(describeMap(readMapFixture(8)).mobileFriendly, true)
	assert.equal(describeMap(readMapFixture(15)).mobileFriendly, false)
})
