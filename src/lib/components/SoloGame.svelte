<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/state'
	import { replaceState } from '$app/navigation'
	import { resolve } from '$app/paths'
	import Game from './Game.svelte'
	import Modal from './Modal.svelte'
	import { readSavedMatch, createMatchWriter, type SavedMatch } from '$lib/game/saved-match'
	import type { GameMap, AiDifficulty } from '$lib/game/types'
	import { mapName, translate } from '$lib/i18n.svelte'
	import { m as messages } from '$lib/paraglide/messages'

	let { map, difficulty }: { map: GameMap; difficulty: AiDifficulty } = $props()
	let ready = $state(false)
	let saved = $state<SavedMatch | null>(null)
	let initial = $state<SavedMatch | undefined>()
	let error = $state<string | null>(null)
	let raw = $state<string | null>(null)
	onMount(() => {
		try {
			const result = readSavedMatch(localStorage)
			raw = result.raw
			saved = result.save
			error = result.error
			if (saved && saved.map.id === map.id && saved.difficulty === difficulty && !page.url.searchParams.has('new')) {
				initial = saved
				ready = true
			} else if (!raw) ready = true
		} catch {
			error = 'storage'
			ready = true
		}
	})
	function startNew() {
		try {
			createMatchWriter(localStorage, raw)(null)
			raw = null
			error = null
			const url = new URL(page.url)
			url.searchParams.delete('new')
			replaceState(url, page.state)
			ready = true
		} catch {
			error = 'conflict'
		}
	}
	function resumeCurrent(event: MouseEvent) {
		if (!saved || saved.map.id !== map.id || saved.difficulty !== difficulty || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
		event.preventDefault()
		initial = saved
		const url = new URL(page.url)
		url.searchParams.delete('new')
		replaceState(url, page.state)
		ready = true
	}
</script>

{#if ready}
	<Game map={initial?.map ?? map} {difficulty} resume={initial} saveRaw={raw} autosave />
{:else if saved || error}
	<Modal title={translate(messages.save_replace_title)}>
		<p>{saved ? translate(messages.save_replace, { map: mapName(saved.map.id) }) : translate(messages.save_invalid)}</p>
		{#if error === 'conflict'}<p role="alert">{translate(messages.save_conflict)}</p>{/if}
		<div class="actions">
			{#if saved}<a class="button" onclick={resumeCurrent} href={`${resolve('/play/[map]', { map: saved.map.id })}/?ai=${saved.difficulty}`}>{translate(messages.save_resume)}</a>{/if}
			<button class="primary" onclick={startNew}>{translate(messages.save_replace_confirm)}</button>
			<a href={resolve('/', {})}>{translate(messages.cancel_close)}</a>
		</div>
	</Modal>
{/if}

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
</style>
