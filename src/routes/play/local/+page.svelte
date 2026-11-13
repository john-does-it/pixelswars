<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/state'
	import { resolve } from '$app/paths'
	import { readLocalMap } from '#lib/map-editor/local-maps.svelte.js'
	import OnlineGame from '#lib/components/OnlineGame.svelte'
	import { hasStartingArmies, isLocalMapId } from '#lib/map-editor/model.ts'
	import { isAiDifficulty } from '#lib/game/ai.js'
	import { translate } from '#lib/i18n.svelte.js'
	import { m } from '#lib/paraglide/messages.js'
	import Game from '#lib/components/Game.svelte'
	import SoloGame from '#lib/components/SoloGame.svelte'

	let mounted = $state(false)
	onMount(() => {
		mounted = true
	})
	const id = $derived(page.url.searchParams.get('id') ?? '')
	const map = $derived(mounted ? readLocalMap(id) : null)
	const online = $derived(page.url.searchParams.has('online'))
	const invited = $derived(new URLSearchParams(page.url.hash.slice(1)).has('invite'))
	const ai = $derived(mounted ? page.url.searchParams.get('ai') : null)
</script>

{#if mounted}
	{#if online && isLocalMapId(id) && (invited || (map && hasStartingArmies(map)))}
		{#key id}<OnlineGame map={invited ? id : (map ?? id)} />{/key}
	{:else if map && hasStartingArmies(map)}
		{#key map.id + ':' + ai}
			{#if isAiDifficulty(ai)}<SoloGame {map} difficulty={ai} />{:else}<Game {map} />{/if}
		{/key}
	{:else}
		<main class="panel">
			<p>{translate(map ? m.editor_armies_needed : m.editor_map_missing)}</p>
			<a href={resolve('/') + '#battlefields'}>{translate(m.choose_battlefield)}</a>
		</main>
	{/if}
{/if}
