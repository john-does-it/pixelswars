import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const aliases: Record<string, string> = JSON.parse(readFileSync(new URL('../src/lib/game/figma-assets.json', import.meta.url), 'utf8'))

test('Figma runtime replacements resolve to valid PNG sources under the asset directory', () => {
	for (const [legacy, target] of Object.entries(aliases)) {
		assert.match(target, /^\/assets\/figma\/[a-z0-9/-]+@2x\.png$/)
		assert.ok(!target.includes('..'))
		const png = Buffer.from(readFileSync(new URL(`..${target}.base64`, import.meta.url), 'utf8').trim(), 'base64')
		assert.equal(png.subarray(1, 4).toString(), 'PNG', legacy)
		assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0, legacy)
	}
})

test('each imported unit keeps all damage stages and cropped variants on a consistent doubled canvas', () => {
	for (const legacy of Object.keys(aliases).filter((url) => /^\/assets\/units\/[a-z-]+-[12]\.png$/.test(url))) {
		const source = Buffer.from(readFileSync(new URL(`..${legacy}.base64`, import.meta.url), 'utf8').trim(), 'base64')
		for (let stage = 0; stage < 5; stage++) {
			const stem = legacy.slice(0, -4) + (stage ? `-damage-${stage}` : '')
			assert.ok(aliases[`${stem}-fit.png`], stem)
			const target = aliases[`${stem}.png`]
			assert.ok(target, stem)
			const png = Buffer.from(readFileSync(new URL(`..${target}.base64`, import.meta.url), 'utf8').trim(), 'base64')
			assert.equal(png.readUInt32BE(16), source.readUInt32BE(16) * 2, stem)
			assert.equal(png.readUInt32BE(20), source.readUInt32BE(20) * 2, stem)
		}
	}
	assert.ok(!Object.keys(aliases).some((url) => url.startsWith('/assets/cells/cell-road-')), 'approved road sprites remain unchanged')
})
