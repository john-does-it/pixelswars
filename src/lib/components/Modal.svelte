<script lang="ts">
	import { onMount, type Snippet } from 'svelte'

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
	<div class="heading">
		<h2>{title}</h2>
		{#if onclose}
			<button aria-label="Close" onclick={onclose}>×</button>
		{/if}
	</div>
	{@render children()}
</dialog>

<style>
	dialog {
		width: min(540px, calc(100% - 32px));
		max-height: 85svh;
		overflow: auto;
		padding: 24px;
		border: 2px solid #a9bbc6;
		border-radius: 10px;
		background: #19242c;
		color: #ffffff;

		&::backdrop {
			background: #000a;
		}
	}

	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	h2 {
		margin: 0;
		font-size: 22px;
	}
</style>
