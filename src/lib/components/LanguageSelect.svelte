<script lang="ts">
	import { m as messages } from '$lib/paraglide/messages.js'
	import { preferences, updatePreferences } from '$lib/preferences.svelte.js'
	import { translate } from '$lib/i18n.svelte.js'
	import { isLocale } from '$lib/preferences-cookie.ts'
	import SettingSelect from './SettingSelect.svelte'

	let { compact = false }: { compact?: boolean } = $props()

	function changeLanguage(value: string) {
		if (isLocale(value)) updatePreferences({ locale: value })
	}
</script>

<SettingSelect
	class="language-select"
	label={translate(messages.language)}
	value={preferences.locale}
	options={[
		{ value: 'en', label: translate(messages.language_english) },
		{ value: 'de', label: translate(messages.language_german) },
		{ value: 'fr', label: translate(messages.language_french) },
		{ value: 'ja', label: translate(messages.language_japanese) }
	]}
	standalone={!compact}
	onchange={changeLanguage}
/>
