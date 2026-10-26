import test from 'node:test'
import { unitSpritePath } from '../src/lib/game/unit-sprites.ts'
import { unitTypes } from '../src/lib/game/catalog.ts'
import type { UnitTypeId } from '../src/lib/game/types.ts'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const aliases: Record<string, string> = JSON.parse(readFileSync(new URL('../src/lib/game/asset-aliases.json', import.meta.url), 'utf8'))

function dimensions(target: string): number[] {
	if (target.endsWith('.svg')) {
		const svg = readFileSync(new URL(`..${target}`, import.meta.url), 'utf8')
		assert.match(svg, /<svg\b/)
		assert.match(svg, /shape-rendering="crispEdges"/)
		const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
		assert.ok(viewBox, target)
		return viewBox.slice(1).map(Number)
	}
	const png = Buffer.from(readFileSync(new URL(`..${target}.base64`, import.meta.url), 'utf8').trim(), 'base64')
	assert.equal(png.subarray(1, 4).toString(), 'PNG', target)
	return [png.readUInt32BE(16), png.readUInt32BE(20)]
}

test('Runtime sprite aliases resolve to valid PNG or SVG sources under the asset directory', () => {
	for (const [legacy, target] of Object.entries(aliases)) {
		assert.match(target, /^\/assets\/[a-z0-9/-]+(?:@2x\.png|\.svg)$/)
		assert.ok(!target.includes('..'))
		assert.ok(
			dimensions(target).every((size) => size > 0),
			legacy
		)
	}
})

test('unit damage states keep a consistent canvas without preview copies', () => {
	for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
		for (const player of [1, 2] as const) {
			const healthy = dimensions(unitSpritePath(type, player))
			for (let stage = 1; stage < 5; stage++) assert.deepEqual(dimensions(unitSpritePath(type, player, stage)), healthy)
		}
	}
})
