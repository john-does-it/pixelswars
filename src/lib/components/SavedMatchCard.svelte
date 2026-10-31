<script lang="ts">
	import { onMount } from 'svelte'
	import { resolve } from '$app/paths'
	import { readSavedMatch, createMatchWriter, savedMatchKey, type SavedMatch } from '#lib/game/saved-match.js'
	import { mapName, translate } from '#lib/i18n.svelte.js'
	import { m as messages } from '#lib/paraglide/messages.js'
	import Modal from './Modal.svelte'
	let saved = $state<SavedMatch | null>(null)
	let error = $state<string | null>(null)
	let confirmDiscard = $state(false)
	let raw = $state<string | null>(null)
	function refresh() {
		try {
			const result = readSavedMatch(localStorage)
			saved = result.save
			error = result.error
			raw = result.raw
		} catch {
			error = 'storage'
		}
	}
	onMount(refresh)
	function discard() {
		try {
			createMatchWriter(localStorage, raw)(null)
			confirmDiscard = false
			refresh()
		} catch {
			error = 'conflict'
			confirmDiscard = false
		}
	}
</script>

<svelte:window
	onstorage={(event) => {
		if (event.key === savedMatchKey || event.key === null) {
			confirmDiscard = false
			refresh()
		}
	}}
/>
{#if saved || error}
	<section class="saved-match" aria-label={translate(messages.save_title)}>
		<h2>{translate(messages.save_title)}</h2>
		{#if saved}
			<p>{mapName(saved.map.id)} · {translate(messages[`ai_${saved.difficulty}`])} · {translate(messages.round, { round: saved.snapshot.round })}</p>
			<div class="actions">
				<a class="button primary" href={`${resolve('/play/[map]', { map: saved.map.id })}/?ai=${saved.difficulty}`}>{translate(messages.save_resume)}</a>
				<a class="button" href={`${resolve('/play/[map]', { map: saved.map.id })}/?ai=${saved.difficulty}&new=1`}>{translate(messages.save_new)}</a>
				<button class="link" onclick={() => (confirmDiscard = true)}>{translate(messages.save_discard)}</button>
			</div>
		{:else if raw}<button onclick={() => (confirmDiscard = true)}>{translate(messages.save_discard)}</button>{/if}
		{#if error}<p role="alert">{translate(error === 'storage' ? messages.save_storage : error === 'conflict' ? messages.save_conflict : messages.save_invalid)}</p>{/if}
	</section>
{/if}
{#if confirmDiscard}
	<Modal title={translate(messages.save_discard)} onclose={() => (confirmDiscard = false)}>
		<p>{translate(messages.save_discard_confirm)}</p>
		<div class="actions"><button onclick={discard}>{translate(messages.save_discard)}</button><button onclick={() => (confirmDiscard = false)}>{translate(messages.cancel_close)}</button></div>
	</Modal>
{/if}

<style>
	.saved-match {
		margin-bottom: var(--site-gap-large);
		padding: 24px;
		background: var(--site-cream);
	}
	h2 {
		margin-top: 0;
	}
	.actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
	}
</style>
