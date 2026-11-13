import { defaultPreferences, isLocale, type Preferences } from './preferences-cookie.ts'
import mapFiles from './data/map-files.json' with { type: 'json' }
import { isLocalMapId, readMap } from './map-editor/model.ts'
import type { AiDifficulty, GameMap, Player } from './game/types.ts'

export const profileStorageKey = 'pixelswars-profile'
export const maxBackupBytes = 16 * 1024 * 1024
export const difficulties: AiDifficulty[] = ['easy', 'medium', 'hard', 'expert']
// Bump a map's revision after substantial layout or army changes. Old medals
// remain in backups but do not complete the revised map's medal row.
export const mapRevisions: Record<string, number> = Object.fromEntries(Object.keys(mapFiles).map((id) => [id, 1]))
export interface Medal {
	map: string
	revision: number
	difficulty: AiDifficulty
	earnedAt: string
}
export interface ChallengeResult {
	id: string
	completedAt: string
	turns: number
}
export interface PlayerProfile {
	pseudonym: string
	completedModes?: { online: boolean; local: boolean }
	medals: Medal[]
	challenges: ChallengeResult[]
}
export interface ProfileBackup {
	format: 'pixelswars-profile'
	version: 1
	exportedAt: string
	profile: PlayerProfile
	preferences: Preferences
	maps: GameMap[]
}
export const emptyProfile = (): PlayerProfile => ({ pseudonym: '', medals: [], challenges: [] })
function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid')
	return value as Record<string, unknown>
}
function text(value: unknown, limit: number): string {
	if (typeof value !== 'string' || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('invalid')
	return value
}
function date(value: unknown): string {
	const result = text(value, 30)
	if (!/^\d{4}-\d{2}-\d{2}T/.test(result) || !Number.isFinite(Date.parse(result))) throw new Error('invalid')
	return result
}
function integer(value: unknown, min: number, max: number): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error('invalid')
	return value
}
export function validateProfile(value: unknown): PlayerProfile {
	const input = object(value)
	const pseudonym = text(input.pseudonym, 40).trim()
	if (!Array.isArray(input.medals) || input.medals.length > 2000 || !Array.isArray(input.challenges) || input.challenges.length > 2000) throw new Error('invalid')
	const keys = new Set<string>()
	const medals = input.medals.map((raw): Medal => {
		const medal = object(raw)
		const map = text(medal.map, 60)
		if (!/^[a-zA-Z0-9_-]+$/.test(map) || !difficulties.includes(medal.difficulty as AiDifficulty)) throw new Error('invalid')
		const revision = integer(medal.revision, 1, 100000)
		const key = `${map}:${revision}:${medal.difficulty}`
		if (keys.has(key)) throw new Error('invalid')
		keys.add(key)
		return { map, revision, difficulty: medal.difficulty as AiDifficulty, earnedAt: date(medal.earnedAt) }
	})
	const challengeIds = new Set<string>()
	const challenges = input.challenges.map((raw): ChallengeResult => {
		const result = object(raw)
		const id = text(result.id, 80)
		if (!/^[a-zA-Z0-9_-]+$/.test(id) || challengeIds.has(id)) throw new Error('invalid')
		challengeIds.add(id)
		return { id, completedAt: date(result.completedAt), turns: integer(result.turns, 1, 100000) }
	})
	const profile: PlayerProfile = { pseudonym, medals, challenges }
	if (input.completedModes !== undefined) {
		const modes = object(input.completedModes)
		if (typeof modes.online !== 'boolean' || typeof modes.local !== 'boolean') throw new Error('invalid')
		profile.completedModes = { online: modes.online, local: modes.local }
	}
	return profile
}
export function validatePreferences(value: unknown): Preferences {
	const input = object(value)
	if (!isLocale(input.locale) || !['azerty', 'qwerty'].includes(String(input.keyboardLayout))) throw new Error('invalid')
	const result = { ...defaultPreferences, locale: input.locale, keyboardLayout: input.keyboardLayout as Preferences['keyboardLayout'] }
	for (const key of ['sound', 'music', 'unitSelectionSounds', 'animations', 'buildingLights', 'unitFacing', 'confirmEndTurn'] as const) {
		if (typeof input[key] !== 'boolean') throw new Error('invalid')
		result[key] = input[key]
	}
	result.volume = integer(input.volume, 0, 100)
	result.sound = result.volume > 0
	return result
}
function validateBackupMaps(value: unknown): GameMap[] {
	if (value === undefined) return []
	if (!Array.isArray(value)) throw new Error('invalid')
	const seen = new Set<string>()
	return value.map((entry) => {
		const map = readMap(JSON.stringify(entry))
		if (!isLocalMapId(map.id) || seen.has(map.id)) throw new Error('invalid')
		seen.add(map.id)
		return map
	})
}
export function parseBackup(raw: string): ProfileBackup {
	if (new TextEncoder().encode(raw).length > maxBackupBytes) throw new Error('size')
	const data = object(JSON.parse(raw))
	if (data.format !== 'pixelswars-profile') throw new Error('invalid')
	if (data.version !== 1) throw new Error('version')
	return { format: 'pixelswars-profile', version: 1, exportedAt: date(data.exportedAt), profile: validateProfile(data.profile), preferences: validatePreferences(data.preferences), maps: validateBackupMaps(data.maps) }
}
export function makeBackup(profile: PlayerProfile, preferences: Preferences, now = new Date().toISOString(), maps?: GameMap[]): string {
	const raw = JSON.stringify({ format: 'pixelswars-profile', version: 1, exportedAt: date(now), profile: validateProfile(profile), preferences: validatePreferences(preferences), maps })
	if (new TextEncoder().encode(raw).length > maxBackupBytes) throw new Error('size')
	return raw
}
export function hasMedal(profile: PlayerProfile, map: string, difficulty: AiDifficulty): boolean {
	return profile.medals.some((medal) => medal.map === map && medal.revision === mapRevisions[map] && medal.difficulty === difficulty)
}
export function awardVictory(profile: PlayerProfile, match: { map: string; difficulty: AiDifficulty | null; winner: Player | null; online: boolean }, now = new Date().toISOString()): Medal | null {
	if (match.online || match.winner !== 2 || !match.difficulty || !difficulties.includes(match.difficulty) || !Object.hasOwn(mapRevisions, match.map) || hasMedal(profile, match.map, match.difficulty)) return null
	const medal = { map: match.map, revision: mapRevisions[match.map], difficulty: match.difficulty, earnedAt: now }
	profile.medals.push(medal)
	return medal
}

export function recordCompletedMode(profile: PlayerProfile, match: Parameters<typeof awardVictory>[1]): boolean {
	const mode = match.online ? 'online' : match.difficulty === null ? 'local' : null
	if (!match.winner || !mode || profile.completedModes?.[mode]) return false
	profile.completedModes ??= { online: false, local: false }
	profile.completedModes[mode] = true
	return true
}
