<script lang="ts">
	import { m as messages } from '#lib/paraglide/messages.js'
	import { preferences, updatePreferences } from '#lib/preferences.svelte.js'
	import { translate } from '#lib/i18n.svelte.js'
	import { isLocale } from '#lib/preferences-cookie.ts'
	import SettingSelect from './SettingSelect.svelte'

	let { site = false, compact = false, hideLabel = false }: { site?: boolean; compact?: boolean; hideLabel?: boolean } = $props()
	const languages = $derived([
		{ value: 'en', label: translate(messages.language_english) },
		{ value: 'de', label: translate(messages.language_german) },
		{ value: 'fr', label: translate(messages.language_french) },
		{ value: 'ja', label: translate(messages.language_japanese) }
	])

	function changeLanguage(value: string) {
		if (isLocale(value)) updatePreferences({ locale: value })
	}
</script>

{#if site}
	<div class="navbar-language">
		<SettingSelect hideLabel class="language-select" label={translate(messages.language)} value={preferences.locale} options={languages} onchange={changeLanguage} />
		<span class="language-code" aria-hidden="true">{preferences.locale.toUpperCase()}</span>
	</div>
{:else}
	<SettingSelect {hideLabel} class="language-select" label={translate(messages.language)} value={preferences.locale} options={languages} standalone={!compact} onchange={changeLanguage} />
{/if}

<style>
	.language-code {
		display: none;
	}

	@media (width < 1024px) {
		.navbar-language {
			position: relative;
		}
		.navbar-language :global(select) {
			width: 68px;
			color: transparent;
		}
		.navbar-language :global(option) {
			color: var(--color-text);
			background-color: var(--color-surface);
		}
		.language-code {
			position: absolute;
			inset: 0 26px 0 6px;
			display: grid;
			place-items: center;
			color: var(--site-paper);
			font: 700 16px / 1.5 var(--font-body);
			pointer-events: none;
		}
	}
</style>
