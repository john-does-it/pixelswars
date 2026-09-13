import { browser } from '$app/environment'
import type { Locale } from '$lib/paraglide/runtime.js'
import type { KeyboardLayout } from '$lib/game/types.js'

export interface Preferences {
	locale: Locale
	keyboardLayout: KeyboardLayout
	sound: boolean
	music: boolean
}

const cookieName = 'pixelswars-settings'
const defaults: Preferences = { locale: 'en', keyboardLayout: 'azerty', sound: true, music: false }
export const preferences = $state<Preferences>({ ...defaults })
let initialized = false

function isLocale(value: unknown): value is Locale {
	return value === 'en' || value === 'de' || value === 'fr'
}

export function initializePreferences(): Preferences {
	if (!browser || initialized) return preferences
	initialized = true
	const savedCookie = document.cookie
		.split('; ')
		.find((cookie) => cookie.startsWith(`${cookieName}=`))
		?.slice(cookieName.length + 1)
	try {
		const saved = savedCookie ? JSON.parse(decodeURIComponent(savedCookie)) : {}
		if (isLocale(saved.locale)) preferences.locale = saved.locale
		if (saved.keyboardLayout === 'azerty' || saved.keyboardLayout === 'qwerty') preferences.keyboardLayout = saved.keyboardLayout
		if (typeof saved.sound === 'boolean') preferences.sound = saved.sound
		if (typeof saved.music === 'boolean') preferences.music = saved.music
	} catch {
		// Ignore malformed client cookies and keep safe defaults.
	}
	document.documentElement.lang = preferences.locale
	return preferences
}

export function updatePreferences(changes: Partial<Preferences>): void {
	Object.assign(preferences, changes)
	if (!browser) return
	document.documentElement.lang = preferences.locale
	const value = encodeURIComponent(JSON.stringify({ locale: preferences.locale, keyboardLayout: preferences.keyboardLayout, sound: preferences.sound, music: preferences.music }))
	document.cookie = `${cookieName}=${value}; Path=/; SameSite=Lax`
}
