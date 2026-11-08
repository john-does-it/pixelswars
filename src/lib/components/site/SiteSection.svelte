<script lang="ts">
	import type { Snippet } from 'svelte'
	let { id, tone = 'cream', wide = false, width, children }: { id: string; tone?: 'cream' | 'yellow' | 'yellow-light' | 'sky' | 'silver'; wide?: boolean; width?: string; children: Snippet } = $props()
</script>

<section {id} class="site-section" class:wide style:--section-background={`var(--site-${tone})`}>
	<div class="section-content" style:--content-width={width}>{@render children()}</div>
</section>

<style>
	.site-section {
		--section-gutter: 24px;
		background: var(--section-background);
		line-height: var(--site-body-leading);
		padding: var(--site-section-space) var(--section-gutter);
		scroll-margin-top: var(--site-nav-height);
	}
	.section-content {
		width: 100%;
		max-width: var(--content-width, var(--site-content-width));
		margin-inline: auto;
	}
	.wide .section-content {
		max-width: var(--site-width);
	}
	@media (max-width: 480px) {
		.site-section {
			--section-gutter: 16px;
		}
	}
</style>
