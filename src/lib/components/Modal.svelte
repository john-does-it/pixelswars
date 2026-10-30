<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import UiIcon from './UiIcon.svelte'

	let { title, onclose, children, alwaysShowScrollbar = true }: { title: string; onclose?: () => void; children: Snippet; alwaysShowScrollbar?: boolean } = $props()
	let dialog = $state<HTMLDialogElement>()
	onMount(() => {
		dialog?.showModal()
		return () => dialog?.close()
	})
</script>

<dialog
	class="modal-panel"
	bind:this={dialog}
	aria-label={title}
	oncancel={(event) => {
		event.preventDefault()
		onclose?.()
	}}
	onclick={(event) => {
		if (event.target === dialog) onclose?.()
	}}
>
	<div class="heading">
		<h2 class="pixel-heading">{title}</h2>
		{#if onclose}
			<button class="pixel-icon-button" aria-label={translate(messages.close)} onclick={onclose}><UiIcon name="close" /></button>
		{/if}
	</div>
	<div class="dialog-content" class:auto-scrollbar={!alwaysShowScrollbar}>
		{@render children()}
	</div>
</dialog>

<style>
	dialog[open] {
		display: flex;
		flex-direction: column;
	}
	dialog {
		--dialog-padding: 32px;
		inset-block: max(16px, 5dvh) auto;
		margin: 0 auto;
		width: calc(100% - 2em);
		max-width: var(--modal-max-width, 640px);
		max-height: calc(100dvh - max(32px, 10dvh));
		overflow: hidden;
		padding: 0;
		border: var(--interface-border) solid var(--site-plum);
		border-radius: 0;
		background: var(--site-cream);
		color: var(--color-text);

		&::backdrop {
			background: rgb(63 38 49 / 55%);
		}
	}

	.dialog-content {
		min-height: 0;
		overflow-x: hidden;
		overflow-y: scroll;
		scrollbar-gutter: stable;
		padding: 0 var(--dialog-padding) var(--dialog-padding);

		&.auto-scrollbar {
			overflow-y: auto;
			scrollbar-gutter: auto;
		}
	}

	.heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 24px;
		flex: none;
		padding: var(--dialog-padding) var(--dialog-padding) 24px;

		button {
			flex: none;
		}
	}

	.heading h2 {
		--site-heading-outline: var(--site-card-outline);
		min-width: 0;
		margin: 4px 0 0;
		font-size: 32px;
		line-height: 1;
		overflow-wrap: anywhere;
	}
	@media (max-width: 640px) {
		dialog {
			--dialog-padding: 16px;
		}
		.heading {
			gap: 16px;
		}
		.heading h2 {
			font-size: 28px;
		}
	}
</style>
