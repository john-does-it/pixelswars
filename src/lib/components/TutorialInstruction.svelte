<script lang="ts">
	import UiIcon from './UiIcon.svelte'
	import { asset } from '$lib/game/asset-path'
	let { text }: { text: string } = $props()
	const icons = { '[undo]': 'previous-action', '[confirm]': 'validate-action', '[capture]': 'icon-capture' } as const
	const parts = $derived(text.split(/(\[undo\]|\[confirm\]|\[capture\]|\[cargo\])/g))
</script>

{#each parts as part}
	{#if part === '[cargo]'}
		<span class="cargo-example" aria-hidden="true" style:background-image={`url('${asset('/assets/icons/action-frame.svg')}')`}>1/3</span>
	{:else if part in icons}
		<UiIcon name={icons[part as keyof typeof icons]} size={28} />
	{:else}{part}{/if}
{/each}

<style>
	.cargo-example {
		display: inline-grid;
		place-items: center;
		vertical-align: middle;
		width: 32px;
		height: 32px;
		padding-bottom: 3px;
		background-size: contain;
		background-repeat: no-repeat;
		image-rendering: pixelated;
		font-size: 10px;
		font-weight: bold;
	}
</style>
