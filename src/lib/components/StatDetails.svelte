<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { StatItem } from '#lib/game/types.js'
	import StatList from './StatList.svelte'
	let { title, stats, sprite, children }: { title: string; stats: StatItem[]; sprite: Snippet; children?: Snippet } = $props()
</script>

<div class="stat-details">
	<div class="heading">
		<h3 class="pixel-heading">{title}</h3>
		<div class="sprite">{@render sprite()}</div>
	</div>
	<StatList items={stats} />
	{@render children?.()}
</div>

<style>
	.stat-details {
		min-width: 0;
		color: var(--site-plum);
		font-size: var(--font-size-ui);
		line-height: 1.4;
		--stat-gap: 8px 16px;
		--stat-label-gap: 12px;
		--stat-margin: 8px 0;
		--stat-icon-size: 32px;
	}
	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.heading h3 {
		--site-heading-outline: var(--interface-heading-outline);
		font-size: 24px;
		line-height: 1.2;
		margin: 0;
	}
	.sprite {
		flex: none;
		display: flex;
		align-items: center;
	}
	.sprite :global(.terrain-icon) {
		border-radius: 0;
	}
</style>
