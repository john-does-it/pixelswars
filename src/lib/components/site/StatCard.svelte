<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { StatItem } from '$lib/game/types'
	import StatList from '$lib/components/StatList.svelte'
	let { title, description, stats, sprite, unit = false }: { title: string; description: string; stats: StatItem[]; sprite: Snippet; unit?: boolean } = $props()
</script>

<article class="stat-card" class:unit>
	<div class="sprite">{@render sprite()}</div>
	<h4>{title}</h4>
	<StatList items={stats} --stat-icon-size="40px" --stat-gap="0 24px" --stat-margin="0" --stat-label-gap="24px" --stat-weight="700" --stat-tracking="-0.12em" --stat-width="max-content" />
	<p>{description}</p>
</article>

<style>
	.stat-card {
		background: var(--site-cream);
		padding: 40px;
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 8px;
		min-height: 380px;
		color: var(--site-plum);
		min-width: 0;
		font-size: 16px;
	}
	.unit {
		min-height: 480px;
	}
	.sprite :global(.terrain-icon) {
		border-radius: 0;
	}
	.sprite {
		height: 120px;
		display: flex;
		align-items: center;
	}
	.sprite :global(img) {
		width: 120px;
		height: 120px;
		object-fit: contain;
		image-rendering: pixelated;
	}
	h4 {
		font-size: 20px;
		margin: 0;
		font-family: var(--font-body);
		line-height: 1.3;
	}
	p {
		border-top: 1px solid var(--site-plum);
		margin: 0;
		padding-top: 8px;
		font-size: 16px;
		line-height: var(--site-body-leading);
		width: 100%;
		color: #000;
	}
	@media (max-width: 480px) {
		.stat-card {
			padding: 32px;
		}
	}
</style>
