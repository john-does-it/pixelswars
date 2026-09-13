<script lang="ts">
	import { m as messages } from '$lib/paraglide/messages.js'
	import { preferences, updatePreferences } from '$lib/preferences.svelte.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { Locale } from '$lib/paraglide/runtime.js'
	import SettingSelect from './SettingSelect.svelte'

	let { compact = false }: { compact?: boolean } = $props()

	function changeLanguage(value: string) {
		const locale = value as Locale
		if (locale === 'en' || locale === 'de' || locale === 'fr') updatePreferences({ locale })
	}
</script>

<SettingSelect
	label={translate(messages.language)}
	value={preferences.locale}
	options={[
		{ value: 'en', label: translate(messages.language_english) },
		{ value: 'de', label: translate(messages.language_german) },
		{ value: 'fr', label: translate(messages.language_french) }
	]}
	standalone={!compact}
	onchange={changeLanguage}
/>
