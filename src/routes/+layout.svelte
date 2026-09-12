<script lang="ts">
	import { base } from '$app/paths'
	import '$lib/app.css'
	import type { Snippet } from 'svelte'

	let { children }: { children: Snippet } = $props()
</script>

<svelte:head>
	<link rel="icon" href="{base}/assets/icons/icon-health.png" type="image/png" />
	<link rel="stylesheet" href="{base}/css/sprites.css" />
	<meta name="description" content="Pixel’s War: a local two-player, turn-based strategy game." />
</svelte:head>
{@render children()}
