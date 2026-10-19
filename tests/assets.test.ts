import test from 'node:test'
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

test('each imported unit keeps its supported damage stages and preview variants on a consistent canvas', () => {
	for (const legacy of Object.keys(aliases).filter((url) => /^\/assets\/units\/[a-z-]+-[12]\.png$/.test(url))) {
		const healthy = dimensions(aliases[legacy])
		for (let stage = 0; stage < 5; stage++) {
			const stem = legacy.slice(0, -4) + (stage ? `-damage-${stage}` : '')
			assert.ok(aliases[`${stem}-fit.png`], stem)
			const target = aliases[`${stem}.png`]
			assert.ok(target, stem)
			assert.deepEqual(dimensions(target), healthy, stem)
		}
	}
	assert.ok(!Object.keys(aliases).some((url) => url.startsWith('/assets/cells/cell-road-')), 'approved road sprites remain unchanged')
})
