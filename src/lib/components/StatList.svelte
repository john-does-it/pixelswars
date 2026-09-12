<script lang="ts">
	import { base } from '$app/paths'
	import type { StatItem } from '$lib/game/types.js'

	let { items }: { items: StatItem[] } = $props()
</script>

<dl>
	{#each items as item}
		<dt>
			{#if item.icon}
				<img src="{base}/assets/icons/{item.icon}.png" alt="" />
			{:else}
				<span class="symbol" aria-hidden="true">$</span>
			{/if}
			{item.label}
		</dt>
		<dd data-testid={item.testId}>{item.value}</dd>
	{/each}
</dl>

<style>
	dl {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: 8px 12px;
		margin: 1em 0;
	}

	dt {
		display: flex;
		align-items: flex-start;
		gap: 7px;
	}

	dd {
		margin: 0;
		font-weight: bold;
		text-align: right;
	}

	img,
	.symbol {
		width: 18px;
		height: 18px;
		flex: none;
	}

	img {
		object-fit: contain;
		image-rendering: pixelated;
		margin-top: 1px;
	}

	.symbol {
		display: inline-grid;
		place-items: center;
		border: 1px solid currentColor;
		border-radius: 50%;
		font-size: 11px;
		font-weight: bold;
	}
</style>
