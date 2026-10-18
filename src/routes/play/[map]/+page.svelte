<script lang="ts">
	import Game from '$lib/components/Game.svelte'
	import SoloGame from '$lib/components/SoloGame.svelte'
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
	{#if data.draft}
		<Game map={data.map} {difficulty} draft />
	{:else if online}
		<OnlineGame map={data.map} />
	{:else if difficulty && data.map.id !== 'dev'}
		<SoloGame map={data.map} {difficulty} />
	{:else}
		<Game map={data.map} {difficulty} />
	{/if}
{/key}
