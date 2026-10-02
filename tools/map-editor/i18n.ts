import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import de from '../../messages/de.json'
import { isLocale, readPreferencesCookie, serializePreferencesCookie, type Locale } from '../../src/lib/preferences-cookie.ts'

const catalogs: Record<Locale, Record<string, string>> = { en, fr, de }
export let locale = readPreferencesCookie(document.cookie).locale

export function translate(key: string, values: Record<string, string | number> = {}): string {
	return (catalogs[locale][key] ?? catalogs.en[key] ?? key).replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder))
}

export function changeLocale(value: string): void {
	if (!isLocale(value)) return
	locale = value
	document.cookie = serializePreferencesCookie({ ...readPreferencesCookie(document.cookie), locale })
}

export function translatePage(): void {
	document.documentElement.lang = locale
	document.title = `Pixel’s War · ${translate('map_editor_title')}`
	document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
		element.textContent = translate(element.dataset.i18n!)
	})
	document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((element) => {
		element.setAttribute('aria-label', translate(element.dataset.i18nAria!))
	})
}
