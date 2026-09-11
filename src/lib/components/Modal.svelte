<script>
	import { onMount } from 'svelte'

	let { title, onclose, children } = $props()
	let dialog = $state()
	onMount(() => {
		dialog.showModal()
		return () => dialog.close()
	})
</script>

<dialog
	bind:this={dialog}
	aria-label={title}
	oncancel={(event) => {
		event.preventDefault()
		onclose?.()
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
		border: 2px solid #83939e;
		border-radius: 10px;
		background: #202a32;
		color: #f2f4f5;

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
