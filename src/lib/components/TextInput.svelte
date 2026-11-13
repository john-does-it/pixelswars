<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements'

	type Props = Omit<HTMLInputAttributes, 'type' | 'value'> & { value?: string; element?: HTMLInputElement }
	let { value = $bindable(''), element = $bindable(), ...attributes }: Props = $props()
</script>

<input {...attributes} type="text" bind:this={element} bind:value />

<style>
	input {
		width: var(--text-input-width, 295px);
		max-width: 100%;
		min-width: 0;
		min-height: 51px;
		padding: 8px 24px;
		font: inherit;
		border: 2px solid var(--site-muted);
	}
</style>
