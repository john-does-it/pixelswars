<script lang="ts">
	import type { Snippet } from 'svelte'
	let { active = false, marker = false, onclick, children }: { active?: boolean; marker?: boolean; onclick: () => void; children: Snippet } = $props()
</script>

<button type="button" class="text-selector" class:active aria-pressed={active} {onclick}>
	{@render children()}{#if active && marker}<span aria-hidden="true"> ‹</span>{/if}
</button>

<style>
	.text-selector {
		min-width: 0;
		min-height: 0;
		border: 0;
		background: none;
		box-shadow: none;
		padding: 0;
		color: var(--site-paper);
		font: 700 32px/1 var(--font-body);
		paint-order: stroke fill;
		-webkit-text-stroke: calc(var(--site-selector-outline) * 2) var(--site-plum);
		text-shadow: none;
		white-space: nowrap;
		cursor: pointer;
	}
	.text-selector::before,
	.text-selector::after {
		display: none;
	}
	.text-selector.active {
		-webkit-text-stroke: calc(var(--selector-active-outline, var(--site-selector-active-outline)) * 2) var(--site-plum);
		color: var(--site-red);
		filter: none;
	}
	@media (pointer: coarse) {
		.text-selector {
			min-height: 44px;
			min-width: 24px;
		}
	}
	@media (max-width: 640px) {
		.text-selector {
			font-size: 20px;
		}
	}

	.text-selector:hover:not(:disabled),
	.text-selector:active:not(:disabled) {
		background: transparent;
		filter: none;
	}
</style>
