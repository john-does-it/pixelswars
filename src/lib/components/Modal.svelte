<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'

	let { title, onclose, children }: { title: string; onclose?: () => void; children: Snippet } = $props()
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
	<div class="dialog-content">
		<div class="heading">
			<h2>{title}</h2>
			{#if onclose}
				<button aria-label={translate(messages.close)} onclick={onclose}>×</button>
			{/if}
		</div>
		{@render children()}
	</div>
</dialog>

<style>
	dialog {
		width: min(540px, calc(100% - 32px));
		max-height: 85svh;
		overflow: hidden;
		padding: 8px;
		border: 2px solid #a9bbc6;
		border-radius: 10px;
		background: #19242c;
		color: #ffffff;

		&::backdrop {
			background: #000a;
		}
	}

	.dialog-content {
		max-height: calc(85svh - 20px);
		overflow: auto;
		padding: 16px;
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
