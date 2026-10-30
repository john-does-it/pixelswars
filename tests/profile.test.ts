import { test } from 'node:test'
import assert from 'node:assert/strict'
import { awardVictory, emptyProfile, hasMedal, makeBackup, parseBackup, mapRevisions, maxBackupBytes, difficulties } from '../src/lib/profile.ts'
import { defaultPreferences } from '../src/lib/preferences-cookie.ts'
import { mapIds } from './map-fixtures.ts'

const now = '2026-10-16T12:00:00.000Z'
const victory = { map: '13', difficulty: 'easy' as const, winner: 2 as const, online: false }

test('only a human victory against AI on a standard map earns a medal', () => {
	for (const match of [
		{ ...victory, winner: null },
		{ ...victory, winner: 1 as const },
		{ ...victory, difficulty: null },
		{ ...victory, online: true },
		{ ...victory, map: 'dev' },
		{ ...victory, map: 'custom' },
		{ ...victory, map: '__proto__' }
	]) {
		const profile = emptyProfile()
		assert.equal(awardVictory(profile, match, now), null)
		assert.equal(profile.medals.length, 0)
	}
	assert.deepEqual(Object.keys(mapRevisions).sort(), mapIds.map(String).sort())
})

test('difficulty medals persist independently, without duplicates or downgrades', () => {
	const profile = emptyProfile()
	for (const difficulty of [...difficulties].reverse()) {
		assert.ok(awardVictory(profile, { ...victory, difficulty }, now))
		assert.equal(awardVictory(profile, { ...victory, difficulty }, now), null)
		assert.ok(hasMedal(profile, '13', difficulty))
	}
	assert.equal(profile.medals.length, 4)
	const restored = parseBackup(makeBackup(profile, defaultPreferences, now)).profile
	assert.deepEqual(restored, profile)
	assert.equal(hasMedal(restored, '12', 'easy'), false)
})

test('old map revisions and unknown maps survive backup without granting current medals', () => {
	const profile = emptyProfile()
	profile.medals.push({ map: '13', revision: 99, difficulty: 'easy', earnedAt: now }, { map: 'retired-map', revision: 1, difficulty: 'hard', earnedAt: now })
	const restored = parseBackup(makeBackup(profile, defaultPreferences, now)).profile
	assert.equal(hasMedal(restored, '13', 'easy'), false)
	assert.ok(awardVictory(restored, victory, now))
	assert.equal(restored.medals.length, 3)
})

test('backup round-trip preserves nickname, challenge records and preferences', () => {
	const profile = { ...emptyProfile(), pseudonym: 'Mika', challenges: [{ id: 'week-2026-42', turns: 7, completedAt: now }] }
	const preferences = { ...defaultPreferences, locale: 'fr' as const, volume: 35, music: true, unitSelectionSounds: false }
	const restored = parseBackup(makeBackup(profile, preferences, now))
	assert.deepEqual(restored.profile, profile)
	assert.deepEqual(restored.preferences, preferences)
	assert.equal(restored.exportedAt, now)
})

test('backup validation rejects unsupported, malformed or excessive data before restore', () => {
	const valid = () => JSON.parse(makeBackup(emptyProfile(), defaultPreferences, now))
	for (const mutate of [
		(data: any) => {
			data.version = 2
		},
		(data: any) => {
			data.format = 'other'
		},
		(data: any) => {
			data.profile.pseudonym = 'x'.repeat(41)
		},
		(data: any) => {
			data.profile.medals = [{ map: '13', revision: 0, difficulty: 'easy', earnedAt: now }]
		},
		(data: any) => {
			data.preferences.volume = -1
		},
		(data: any) => {
			data.preferences.locale = 'unknown'
		},
		(data: any) => {
			data.preferences.music = 'true'
		},
		(data: any) => {
			data.exportedAt = 'yesterday'
		},
		(data: any) => {
			data.profile.challenges = [{ id: 'week', turns: -2, completedAt: now }]
		}
	]) {
		const data = valid()
		mutate(data)
		assert.throws(() => parseBackup(JSON.stringify(data)))
	}
	for (const raw of ['[]', 'null', '{', ' '.repeat(maxBackupBytes + 1)]) assert.throws(() => parseBackup(raw))
	const profile = emptyProfile()
	awardVictory(profile, victory, now)
	profile.medals.push({ ...profile.medals[0] })
	assert.throws(() => makeBackup(profile, defaultPreferences, now))
})

test('backup validation strips unrecognized fields and prototype properties', () => {
	const raw = JSON.parse(makeBackup(emptyProfile(), defaultPreferences, now))
	raw.profile.admin = true
	raw.preferences.debug = true
	const restored = parseBackup(JSON.stringify(raw).replace('"pseudonym":""', '"__proto__":{"admin":true},"pseudonym":""'))
	assert.equal('admin' in restored.profile, false)
	assert.equal('debug' in restored.preferences, false)
})
