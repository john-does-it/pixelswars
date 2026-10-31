import type { Preferences } from './preferences-cookie.ts'
import { browser } from '$app/env'

import { emptyProfile, parseBackup, makeBackup, profileStorageKey, awardVictory, type PlayerProfile } from './profile.ts'

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
	if (medal) saveProfile()
	return medal
}
export function restoreProfile(raw: string): boolean {
	const backup = parseBackup(raw)
	if (!saveProfile(backup.profile, backup.preferences)) return false
	updatePreferences(backup.preferences)
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
