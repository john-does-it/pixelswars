import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { defaultPreferences, readPreferencesCookie, serializePreferencesCookie } from '../src/lib/preferences-cookie.ts'

test('shared game/editor preferences validate cookies and preserve other settings when changing language', () => {
	const settings = { ...defaultPreferences, locale: 'fr' as const, sound: false, animations: false }
	const cookie = serializePreferencesCookie(settings)
	assert.deepEqual(readPreferencesCookie(`unrelated=1;${cookie}`), settings)
	assert.deepEqual(readPreferencesCookie(serializePreferencesCookie({ ...settings, locale: 'de' })), { ...settings, locale: 'de' })
	for (const malformed of ['%', 'null', '{', encodeURIComponent('{"locale":"xx","sound":"false"}')]) {
		assert.deepEqual(readPreferencesCookie(`pixelswars-settings=${malformed}`), defaultPreferences)
	}
})

test('all editor messages have matching translations and placeholders', () => {
	const catalogs = ['en', 'fr', 'de'].map((locale) => JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')) as Record<string, string>)
	const keys = Object.keys(catalogs[0])
		.filter((key) => key.startsWith('map_editor_'))
		.sort()
	for (const catalog of catalogs) {
		assert.deepEqual(
			Object.keys(catalog)
				.filter((key) => key.startsWith('map_editor_'))
				.sort(),
			keys
		)
		for (const key of keys) {
			assert.ok(catalog[key].trim())
			assert.deepEqual(catalog[key].match(/\{\w+\}/g)?.sort(), catalogs[0][key].match(/\{\w+\}/g)?.sort(), key)
		}
	}
})
