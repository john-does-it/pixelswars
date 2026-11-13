import { localMapKey, refreshLibrary } from './map-editor/local-maps.svelte.ts'
import type { Preferences } from './preferences-cookie.ts'
import { browser } from '$app/env'

import { emptyProfile, parseBackup, makeBackup, profileStorageKey, recordCompletedMode, awardVictory, type PlayerProfile, type ProfileBackup } from './profile.ts'

import { initializePreferences, preferences, updatePreferences } from './preferences.svelte.ts'

export const playerProfile = $state<{ data: PlayerProfile; ready: boolean; storageError: boolean }>({ data: emptyProfile(), ready: false, storageError: false })

export function initializeProfile() {
	if (!browser || playerProfile.ready) return
	initializePreferences()
	try {
		const saved = localStorage.getItem(profileStorageKey)
		if (saved) playerProfile.data = parseBackup(saved).profile
	} catch {
		playerProfile.storageError = true
	}
	playerProfile.ready = true
}
export function saveProfile(data = playerProfile.data, settings: Preferences = preferences): boolean {
	if (!browser) return false
	try {
		localStorage.setItem(profileStorageKey, makeBackup(data, settings))
		playerProfile.data = data
		playerProfile.storageError = false
		return true
	} catch {
		playerProfile.storageError = true
		return false
	}
}
export function recordVictory(match: Parameters<typeof awardVictory>[1]) {
	initializeProfile()
	// Preserve medals earned in another tab before writing this result.
	try {
		const saved = localStorage.getItem(profileStorageKey)
		if (saved) playerProfile.data = parseBackup(saved).profile
	} catch {
		playerProfile.storageError = true
	}
	const medal = awardVictory(playerProfile.data, match)
	const completedMode = recordCompletedMode(playerProfile.data, match)
	const achievement = match.online ? 'onliner' : 'same-boat'
	if (completedMode || medal) saveProfile()
	return { medal, achievement: completedMode ? achievement : null } as const
}
export function restoreProfile(backup: ProfileBackup): boolean {
	const previous = new Map<string, string | null>()
	try {
		const entries = backup.maps.map((map) => [localMapKey(map.id), JSON.stringify(map)])
		entries.push([profileStorageKey, makeBackup(backup.profile, backup.preferences)])
		for (const [key, value] of entries) {
			const old = localStorage.getItem(key)
			if (value === old) continue
			localStorage.setItem(key, value)
			previous.set(key, old)
		}
	} catch {
		// Undo successful writes in reverse order if a later map exceeds the quota.
		for (const [key, old] of [...previous].reverse()) {
			if (old === null) localStorage.removeItem(key)
			else localStorage.setItem(key, old)
		}
		playerProfile.storageError = true
		return false
	}
	playerProfile.data = backup.profile
	playerProfile.storageError = false
	updatePreferences(backup.preferences)
	refreshLibrary()
	return true
}
export function syncProfile(event: StorageEvent) {
	if (event.key !== profileStorageKey && event.key !== null) return
	try {
		playerProfile.data = event.newValue ? parseBackup(event.newValue).profile : emptyProfile()
		playerProfile.storageError = false
	} catch {
		playerProfile.storageError = true
	}
}
