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
	<div class="dialog-content" class:auto-scrollbar={!alwaysShowScrollbar}>
		<div class="heading">
			<h2>{title}</h2>
			{#if onclose}
				<button class="pixel-icon-button" aria-label={translate(messages.close)} onclick={onclose}><UiIcon name="close" /></button>
			{/if}
		</div>
		{@render children()}
	</div>
</dialog>

<style>
	dialog {
		inset-block: 7.5svh auto;
		margin: 0 auto;
		width: calc(100% - 2em);
		max-width: var(--modal-max-width, 640px);
		max-height: 85svh;
		overflow: hidden;
		padding: 8px;
		border: 2px solid var(--color-border-strong);
		border-radius: 10px;
		background: var(--color-surface);
		color: var(--color-text);

		&::backdrop {
			background: #000a;
		}
	}

	.dialog-content {
		max-height: calc(85svh - 20px);
		overflow-x: hidden;
		overflow-y: scroll;
		scrollbar-gutter: stable;
		padding: 16px;

		&.auto-scrollbar {
			overflow-y: auto;
			scrollbar-gutter: auto;
		}
	}

	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;

		button {
			flex: none;
		}
	}

	h2 {
		margin: 0;
		font-size: 22px;
	}
</style>
