<script lang="ts">
	import { onMount } from 'svelte'
	import { resolve } from '$app/paths'
	import MapMedals from '$lib/components/MapMedals.svelte'
	import { isMapInCatalog } from '$lib/game/map-catalog'
	import { playerProfile, initializeProfile, saveProfile, restoreProfile } from '$lib/profile.svelte.ts'
	import { makeBackup, parseBackup, maxBackupBytes, mapRevisions, type ProfileBackup } from '$lib/profile.ts'
	import { preferences } from '$lib/preferences.svelte.ts'
	import { translate, mapName } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	let pseudonym = $state('')
	let pending = $state<ProfileBackup | null>(null)
	let pendingRaw = $state('')
	let status = $state('')
	let reading = $state(false)
	let readId = 0
	onMount(() => {
		initializeProfile()
		pseudonym = playerProfile.data.pseudonym
	})
	function download() {
		const url = URL.createObjectURL(new Blob([makeBackup(playerProfile.data, preferences)], { type: 'application/json' }))
		const link = document.createElement('a')
		link.href = url
		link.download = `pixels-war-profile-${new Date().toISOString().slice(0, 10)}.json`
		link.click()
		setTimeout(() => URL.revokeObjectURL(url), 1000)
	}
	async function inspect(event: Event) {
		const input = event.target as HTMLInputElement
		const file = input.files?.[0]
		const id = ++readId
		pending = null
		pendingRaw = ''
		status = ''
		if (!file) return
		reading = true
		try {
			if (file.size > maxBackupBytes) throw new Error('size')
			const raw = await file.text()
			const parsed = parseBackup(raw)
			if (id !== readId) return
			pendingRaw = raw
			pending = parsed
		} catch (error) {
			if (id === readId) status = error instanceof Error && error.message === 'version' ? 'profile_version_error' : 'profile_invalid'
		} finally {
			if (id === readId) reading = false
			input.value = ''
		}
	}
	function restore() {
		if (!pending) return
		if (restoreProfile(pendingRaw)) {
			pseudonym = playerProfile.data.pseudonym
			pending = null
			pendingRaw = ''
			status = 'profile_restored'
		}
	}
</script>

<svelte:head><title>{translate(messages.profile_title)} · Pixel’s War</title></svelte:head>
<main class="site-page">
	<header>
		<h1>{translate(messages.profile_title)}</h1>
		<p>{translate(messages.profile_intro)}</p>
	</header>
	<form
		onsubmit={(event) => {
			event.preventDefault()
			if (saveProfile({ ...playerProfile.data, pseudonym: pseudonym.trim() })) status = 'profile_saved'
		}}
	>
		<label for="pseudonym">{translate(messages.profile_pseudonym)}</label>
		<div class="actions"><input id="pseudonym" bind:value={pseudonym} maxlength="40" /><button type="submit">{translate(messages.profile_save)}</button></div>
	</form>
	{#if playerProfile.storageError}<p role="alert">{translate(messages.profile_storage_error)}</p>{/if}
	<p role="status">{status ? translate(messages[status as keyof typeof messages]) : ''}</p>
	<section class="panel">
		<h2>{translate(messages.profile_backup)}</h2>
		<p>{translate(messages.profile_backup_help)}</p>
		<div class="actions">
			<button onclick={download}>{translate(messages.profile_export)}</button>
			<label class="import button">{translate(messages.profile_import)}<input type="file" accept=".json,application/json" onchange={inspect} disabled={reading} /></label>
		</div>
		{#if pending}
			<section class="restore-preview" aria-label={translate(messages.profile_preview)}>
				<h3>{translate(messages.profile_preview)}</h3>
				<p>{pending.profile.pseudonym || '—'}</p>
				<p>{translate(messages.profile_summary, { medals: pending.profile.medals.length, challenges: pending.profile.challenges.length })}</p>
				<p>{translate(messages.profile_exported, { date: new Date(pending.exportedAt).toLocaleString(preferences.locale) })}</p>
				<p>{translate(messages.profile_replace_warning)}</p>
				<div class="actions">
					<button onclick={download}>{translate(messages.profile_backup_current)}</button>
					<button class="primary" onclick={restore}>{translate(messages.profile_replace)}</button>
					<button
						onclick={() => {
							pending = null
							pendingRaw = ''
						}}>{translate(messages.cancel_close)}</button
					>
				</div>
			</section>
		{/if}
	</section>
	<section>
		<h2>{translate(messages.profile_medals)}</h2>
		<p class="section-intro">{translate(messages.profile_medal_rules)}</p>
		<div class="map-progress">
			{#each Object.keys(mapRevisions).filter(isMapInCatalog) as map}
				<article class="panel">
					<h3><a href={`${resolve('/', {})}#maps`}>{mapName(map)}</a></h3>
					<MapMedals {map} />
				</article>
			{/each}
		</div>
	</section>
</main>

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	section {
		margin-top: 32px;
	}
	.panel {
		padding: 20px;
	}
	input {
		max-width: 100%;
		min-width: 0;
	}
	.import {
		position: relative;
		max-width: 100%;
		&:has(input:focus-visible) {
			outline: 3px solid var(--color-accent);
			outline-offset: 3px;
		}
	}
	input[type='file'] {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}
	input:not([type='file']) {
		min-height: 44px;
		padding: 8px;
		font: inherit;
		color: var(--color-text);
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 4px;
	}
	.map-progress {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
		gap: 18px;
	}
	h3 {
		margin-top: 0;
	}
	.restore-preview {
		border-top: 1px solid var(--color-border);
		padding-top: 16px;
		overflow-wrap: anywhere;
	}
</style>
