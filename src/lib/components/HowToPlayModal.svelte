<script lang="ts">
	import Modal from './Modal.svelte'
	import HowToPlayContent from './HowToPlayContent.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { KeyboardLayout } from '$lib/game/types.js'
	import type { Snippet } from 'svelte'
	let { keyboardLayout, onclose, settings }: { keyboardLayout: KeyboardLayout; onclose: () => void; settings?: Snippet } = $props()
</script>

<Modal title={translate(settings ? messages.options_and_help : messages.how_to_play)} {onclose}>
	{#if settings}
		<section>
			<h3>{translate(messages.options)}</h3>
			{@render settings()}
		</section>
		<section class="rules-section">
			<h3>{translate(messages.how_to_play)}</h3>
			<HowToPlayContent {keyboardLayout} headingLevel={4} />
		</section>
	{:else}
		<HowToPlayContent {keyboardLayout} />
	{/if}
</Modal>

<style>
	h3 {
		margin: 0 0 18px;
		color: #ffe985;
		font-size: 20px;
		line-height: 1.4;
	}
	.rules-section {
		margin-top: 28px;
		padding-top: 24px;
		border-top: 1px solid #78909f;
	}
</style>
