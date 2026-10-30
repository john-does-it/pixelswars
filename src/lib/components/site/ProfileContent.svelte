<script lang="ts">
	import { onMount } from 'svelte'
	import PreferencesPanel from '$lib/components/site/PreferencesPanel.svelte'
	import Modal from '$lib/components/Modal.svelte'
	import UiIcon from '$lib/components/UiIcon.svelte'
	let showSettings = $state(false)
	import { playerProfile, initializeProfile, saveProfile, restoreProfile } from '$lib/profile.svelte.ts'
	import { makeBackup, parseBackup, maxBackupBytes, type ProfileBackup } from '$lib/profile.ts'
	import { preferences } from '$lib/preferences.svelte.ts'
	import { translate } from '$lib/i18n.svelte.js'
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

<div class="profile-content">
	<header>
		<h2>{translate(messages.profile_title)}</h2>
		<p>{translate(messages.profile_backup_help)}</p>
	</header>
	<form
		onsubmit={(event) => {
			event.preventDefault()
			if (saveProfile({ ...playerProfile.data, pseudonym: pseudonym.trim() })) status = 'profile_saved'
		}}
	>
		<label class="sr-only" for="pseudonym">{translate(messages.profile_pseudonym)}</label>
		<div class="actions"><input placeholder={translate(messages.profile_pseudonym)} id="pseudonym" bind:value={pseudonym} maxlength="40" /><button type="submit" class="primary site-action">{translate(messages.profile_save)}</button><button type="button" class="pixel-icon-button" aria-label={translate(messages.site_settings)} title={translate(messages.site_settings)} aria-haspopup="dialog" onclick={() => (showSettings = true)}><UiIcon name="game-settings" /></button></div>
	</form>
	{#if playerProfile.storageError}<p role="alert">{translate(messages.profile_storage_error)}</p>{/if}
	<p role="status">{status ? translate(messages[status as keyof typeof messages]) : ''}</p>
	<section class="backup">
		<div class="actions">
			<label class="import button site-action">{translate(messages.profile_import)}<input type="file" accept=".json,application/json" onchange={inspect} disabled={reading} /></label>
			<button class="primary site-action" onclick={download}>{translate(messages.profile_export)}</button>
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
					<button class="primary site-action" onclick={restore}>{translate(messages.profile_replace)}</button>
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
</div>

{#if showSettings}<Modal --modal-max-width="480px" title={translate(messages.site_settings)} onclose={() => (showSettings = false)}><PreferencesPanel /></Modal>{/if}

<style>
	.profile-content {
		font-size: 16px;
	}
	h2 {
		max-width: 440px;
		margin: 0 0 var(--site-gap-medium);
	}
	header p {
		max-width: 640px;
		margin: 0 0 var(--site-gap-medium);
	}
	.actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 24px 40px;
	}
	.backup {
		margin-top: var(--site-gap-medium);
	}
	.import {
		position: relative;
		cursor: pointer;
	}
	.import:has(input:focus-visible) {
		outline: 3px solid var(--site-plum);
		outline-offset: 4px;
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
		width: 295px;
		max-width: 100%;
		min-width: 0;
		min-height: 51px;
		padding: 8px 24px;
		font: inherit;
		border: 2px solid var(--site-muted);
	}
	.restore-preview {
		margin-top: 24px;
		border-top: 1px solid var(--site-muted);
		padding-top: 16px;
		overflow-wrap: anywhere;
	}
	[role='status']:empty {
		display: none;
	}
</style>
