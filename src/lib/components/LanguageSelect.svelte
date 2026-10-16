<script lang="ts">
	import { m as messages } from '$lib/paraglide/messages.js'
	import { preferences, updatePreferences } from '$lib/preferences.svelte.js'
	import { translate } from '$lib/i18n.svelte.js'
	import { isLocale } from '$lib/preferences-cookie.ts'
	import SettingSelect from './SettingSelect.svelte'

	let { compact = false, symbolOnly = false, hideLabel = false }: { compact?: boolean; symbolOnly?: boolean; hideLabel?: boolean } = $props()
	const languages = $derived([
		{ value: 'en', symbol: '🇬🇧', label: translate(messages.language_english) },
		{ value: 'de', symbol: '🇩🇪', label: translate(messages.language_german) },
		{ value: 'fr', symbol: '🇫🇷', label: translate(messages.language_french) },
		{ value: 'ja', symbol: '🇯🇵', label: translate(messages.language_japanese) }
	])

	function changeLanguage(value: string) {
		if (isLocale(value)) updatePreferences({ locale: value })
	}
</script>

{#if symbolOnly}
	<div class="language-symbol">
		<span aria-hidden="true">{languages.find((language) => language.value === preferences.locale)?.symbol}</span>
		<select class="language-select" aria-label={translate(messages.language)} title={translate(messages.language)} value={preferences.locale} onchange={(event) => changeLanguage(event.currentTarget.value)}>
			{#each languages as language}<option value={language.value}>{language.symbol} {language.label}</option>{/each}
		</select>
	</div>
{:else}
	<SettingSelect {hideLabel} class="language-select" label={translate(messages.language)} value={preferences.locale} options={languages} standalone={!compact} onchange={changeLanguage} />
{/if}

<style>
	.language-symbol {
		position: relative;
		width: 64px;
		flex: none;
	}
	.language-symbol span {
		position: absolute;
		inset: 0 22px 0 6px;
		display: grid;
		place-items: center;
		font:
			20px / 1 system-ui,
			sans-serif;
		pointer-events: none;
	}
	select {
		width: 100%;
		color: transparent;
	}
	option {
		color: var(--color-text);
	}
</style>
