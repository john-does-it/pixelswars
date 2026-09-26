<script lang="ts">
	import Game from '$lib/components/Game.svelte'
	import { page } from '$app/state'
	import { browser } from '$app/environment'
	import { isAiDifficulty } from '$lib/game/ai.js'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
	const difficulty = $derived.by(() => {
		const value = browser ? page.url.searchParams.get('ai') : null
		return isAiDifficulty(value) ? value : null
	})
</script>

{#key `${data.map.id}:${difficulty}`}
	<Game map={data.map} {difficulty} />
{/key}
