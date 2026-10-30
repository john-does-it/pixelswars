<script lang="ts">
 import type { Snippet } from 'svelte'
 import type { StatItem } from '$lib/game/types'
 import StatDetails from '../StatDetails.svelte'
 let { title, stats, sprite }: { title: string; stats: StatItem[]; sprite: Snippet } = $props()
</script>

<article class="stat-card"><StatDetails {title} {stats} {sprite} /></article>

<style>
 .stat-card { background: var(--site-cream); padding: 24px; min-width: 0; }
</style>
