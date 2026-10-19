<script lang="ts">
	import { asset } from '$lib/game/asset-path'
	import type { StatItem } from '$lib/game/types.js'

	let { items }: { items: StatItem[] } = $props()
</script>

<dl>
	{#each items as item}
		<dt>
			{#if item.icon}
				<img src={asset(`/assets/icons/${item.icon}.${item.icon === 'icon-money' ? 'svg' : 'png'}`)} alt="" />
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
		align-content: start;
		align-items: center;
		gap: var(--stat-gap, 8px 12px);
		margin: var(--stat-margin, 1em 0);
	}

	dt {
		min-width: 0;
		overflow-wrap: anywhere;
		display: flex;
		align-items: center;
		gap: 7px;
	}

	dd {
		margin: 0;
		font-weight: bold;
		text-align: right;
	}

	img,
	.symbol {
		width: var(--stat-icon-size, 18px);
		height: var(--stat-icon-size, 18px);
		flex: none;
	}

	img {
		object-fit: contain;
		image-rendering: pixelated;
	}

	.symbol {
		display: inline-grid;
		place-items: center;
		border: 1px solid currentColor;
		border-radius: 50%;
		font-size: var(--font-size-ui);
		font-weight: bold;
	}
</style>
