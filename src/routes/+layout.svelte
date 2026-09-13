<script lang="ts">
	import { asset } from '$app/paths'
	import '$lib/app.css'
	import type { Snippet } from 'svelte'

	let { children }: { children: Snippet } = $props()
</script>

<svelte:head>
	<link rel="icon" href={asset('/assets/icons/icon-health.png')} type="image/png" />
	<meta name="description" content="Pixel’s War: a local two-player, turn-based strategy game." />
</svelte:head>

{@render children()}
