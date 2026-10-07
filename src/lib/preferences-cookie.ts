import type { KeyboardLayout } from './game/types.ts'

export type Locale = 'en' | 'fr' | 'de'
export interface Preferences {
	locale: Locale
	keyboardLayout: KeyboardLayout
	sound: boolean
	volume: number
	music: boolean
	animations: boolean
}

export const preferencesCookieName = 'pixelswars-settings'
export const defaultPreferences: Preferences = { locale: 'en', keyboardLayout: 'azerty', sound: true, volume: 100, music: false, animations: true }

export function isLocale(value: unknown): value is Locale {
	return value === 'en' || value === 'de' || value === 'fr'
}

export function readPreferencesCookie(cookies: string): Preferences {
	const preferences = { ...defaultPreferences }
	const savedCookie = cookies
		.split(';')
		.map((cookie) => cookie.trim())
		.find((cookie) => cookie.startsWith(`${preferencesCookieName}=`))
		?.slice(preferencesCookieName.length + 1)
	try {
		const saved = savedCookie ? JSON.parse(decodeURIComponent(savedCookie)) : {}
		if (isLocale(saved.locale)) preferences.locale = saved.locale
		if (saved.keyboardLayout === 'azerty' || saved.keyboardLayout === 'qwerty') preferences.keyboardLayout = saved.keyboardLayout
		for (const key of ['sound', 'music', 'animations'] as const) if (typeof saved[key] === 'boolean') preferences[key] = saved[key]
		preferences.volume = typeof saved.volume === 'number' && Number.isFinite(saved.volume) ? Math.max(0, Math.min(100, saved.volume)) : preferences.sound ? 100 : 0
		preferences.sound = preferences.volume > 0
	} catch {
		// Keep defaults for malformed browser cookies.
	}
	return preferences
}

export function serializePreferencesCookie(preferences: Preferences): string {
	return `${preferencesCookieName}=${encodeURIComponent(JSON.stringify(preferences))}; Path=/; SameSite=Lax`
}
