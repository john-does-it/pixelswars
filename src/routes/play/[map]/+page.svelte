<script lang="ts">
	import Game from '$lib/components/Game.svelte'
	import OnlineGame from '$lib/components/OnlineGame.svelte'
	import { page } from '$app/state'
	import { browser } from '$app/environment'
	import { isAiDifficulty } from '$lib/game/ai.js'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
	const online = $derived(browser && page.url.searchParams.has('online'))
	const difficulty = $derived.by(() => {
		const value = browser ? page.url.searchParams.get('ai') : null
		return isAiDifficulty(value) ? value : null
	})
</script>

{#key `${data.map.id}:${difficulty}:${online}`}
	{#if online}
		<OnlineGame map={data.map} />
	{:else}
		<Game map={data.map} {difficulty} />
	{/if}
{/key}
