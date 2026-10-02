import { browser } from '$app/environment'
import { defaultPreferences, readPreferencesCookie, serializePreferencesCookie, type Preferences } from './preferences-cookie.ts'
export type { Preferences } from './preferences-cookie.ts'

export const preferences = $state<Preferences>({ ...defaultPreferences })
let initialized = false
export function initializePreferences(): Preferences {
	if (!browser || initialized) return preferences
	initialized = true
	Object.assign(preferences, readPreferencesCookie(document.cookie))
	document.documentElement.lang = preferences.locale
	return preferences
}

export function updatePreferences(changes: Partial<Preferences>): void {
	Object.assign(preferences, changes)
	if (!browser) return
	document.documentElement.lang = preferences.locale
	document.cookie = serializePreferencesCookie(preferences)
}
