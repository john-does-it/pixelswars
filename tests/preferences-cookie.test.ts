import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { defaultPreferences, readPreferencesCookie, serializePreferencesCookie } from '../src/lib/preferences-cookie.ts'

test('volume migrates muted preferences and validates persisted levels', () => {
	const read = (settings: object) => readPreferencesCookie(`pixelswars-settings=${encodeURIComponent(JSON.stringify(settings))}`)
	assert.equal(read({ sound: false }).volume, 0)
	assert.equal(read({ sound: true }).volume, 100)
	assert.equal(read({ volume: 35 }).volume, 35)
	assert.equal(read({ volume: -5 }).sound, false)
	assert.equal(read({ volume: 150 }).volume, 100)
	assert.equal(read({ volume: '35' }).volume, 100)
})

test('shared game/editor preferences validate cookies and preserve other settings when changing language', () => {
	const settings = { ...defaultPreferences, locale: 'fr' as const, sound: false, volume: 0, animations: false, unitFacing: false }
	const cookie = serializePreferencesCookie(settings)
	assert.deepEqual(readPreferencesCookie(`unrelated=1;${cookie}`), settings)
	assert.deepEqual(readPreferencesCookie(serializePreferencesCookie({ ...settings, locale: 'de' })), { ...settings, locale: 'de' })
	assert.deepEqual(readPreferencesCookie(serializePreferencesCookie({ ...settings, locale: 'ja' })), { ...settings, locale: 'ja' })
	for (const malformed of ['%', 'null', '{', encodeURIComponent('{"locale":"xx","sound":"false"}')]) {
		assert.deepEqual(readPreferencesCookie(`pixelswars-settings=${malformed}`), defaultPreferences)
	}
})

test('unit facing defaults on for older cookies and accepts only boolean settings', () => {
	for (const unitFacing of [undefined, 'false', null, 0]) {
		assert.equal(readPreferencesCookie(`pixelswars-settings=${encodeURIComponent(JSON.stringify({ unitFacing }))}`).unitFacing, true)
	}
	assert.equal(readPreferencesCookie(serializePreferencesCookie({ ...defaultPreferences, unitFacing: false })).unitFacing, false)
})

test('all messages have matching translations and placeholders in every configured locale', () => {
	const { locales } = JSON.parse(readFileSync(new URL('../project.inlang/settings.json', import.meta.url), 'utf8')) as { locales: string[] }
	const catalogs = locales.map((locale) => JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')) as Record<string, string>)
	const keys = Object.keys(catalogs[0]).sort()
	for (const catalog of catalogs) {
		assert.deepEqual(Object.keys(catalog).sort(), keys)
		for (const key of keys) {
			assert.ok(catalog[key].trim())
			assert.deepEqual(catalog[key].match(/\{\w+\}/g)?.sort(), catalogs[0][key].match(/\{\w+\}/g)?.sort(), key)
		}
	}
})
