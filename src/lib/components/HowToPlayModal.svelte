<script lang="ts">
	import Modal from './Modal.svelte'
	import HowToPlayContent from './HowToPlayContent.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { KeyboardLayout } from '$lib/game/types.js'
	import type { Snippet } from 'svelte'
	let { keyboardLayout, onclose, settings, actions }: { keyboardLayout: KeyboardLayout; onclose: () => void; settings?: Snippet; actions?: Snippet } = $props()
</script>

<Modal title={translate(settings ? messages.options_and_help : messages.how_to_play)} {onclose}>
	{@render actions?.()}
	{#if settings}
		<details open>
			<summary><h3>{translate(messages.options)}</h3></summary>
			<div class="section-content">{@render settings()}</div>
		</details>
		<details>
			<summary><h3>{translate(messages.how_to_play)}</h3></summary>
			<div class="section-content"><HowToPlayContent {keyboardLayout} headingLevel={4} /></div>
		</details>
	{:else}
		<HowToPlayContent {keyboardLayout} />
	{/if}
</Modal>

<style>
	h3 {
		display: inline;
		margin: 0;
		color: var(--color-accent);
		font-size: 20px;
		line-height: 1.4;
	}
	summary {
		cursor: pointer;
		color: var(--color-accent);
		padding: 4px 0;
	}
	summary:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 4px;
	}
	.section-content {
		padding-top: 18px;
	}
	details + details {
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid var(--color-border);
	}
</style>
