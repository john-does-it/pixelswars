<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { resolve } from '$app/paths'
	import Game from './Game.svelte'
	import { PeerConnection, PeerError } from '$lib/game/peer.js'
	import { mapName, translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import type { GameMap } from '$lib/game/types.js'

	let { map }: { map: GameMap } = $props()
	let peer = $state<PeerConnection>()
	let role = $state<'host' | 'join' | null>(null)
	let connected = $state(false)
	let busy = $state(false)
	let input = $state('')
	let invited = $state(false)
	let output = $state('')
	let joining = $state(false)
	let copied = $state(false)
	let error = $state('')
	let supported = $state(true)
	const errors = { invalid: messages.online_error_invalid, incompatible: messages.online_error_incompatible, wrong_map: messages.online_error_map, unsupported: messages.online_error_unsupported, failed: messages.online_error_failed, service: messages.online_error_service, unavailable: messages.online_error_unavailable, network: messages.online_error_network, no_candidates: messages.online_error_no_candidates, relay: messages.online_error_relay }

	onMount(() => {
		supported = typeof RTCPeerConnection !== 'undefined'
		readInvitation()
	})
	function readInvitation() {
		const invitation = new URLSearchParams(location.hash.slice(1)).get('invite')
		if (invitation && supported && !connected && !busy) {
			peer?.close()
			peer = undefined
			output = error = ''
			joining = false
			role = 'join'
			input = invitation
			invited = true
		}
	}
	onDestroy(() => {
		peer?.close()
	})

	function createPeer(host: boolean) {
		const previous = peer
		peer = undefined
		previous?.close()
		const connection = new PeerConnection(map, host)
		peer = connection
		connection.onStatus((status) => {
			if (peer !== connection) return
			if (status === 'connected') {
				connected = true
				error = ''
			} else if (status === 'connecting' && !connected) error = ''
		})
		connection.onError((failure) => {
			if (peer !== connection || connected) return
			error = translate(errors[failure.message as keyof typeof errors] ?? errors.failed)
			joining = false
		})
		return connection
	}
	async function perform(action: () => Promise<void>) {
		busy = true
		error = ''
		try {
			await action()
		} catch (failure) {
			joining = false
			peer?.close()
			error = translate(failure instanceof PeerError ? (errors[failure.message as keyof typeof errors] ?? errors.failed) : errors.failed)
		} finally {
			busy = false
		}
	}
	async function host() {
		role = 'host'
		output = ''
		copied = false
		await perform(async () => {
			const connection = createPeer(true)
			const token = await connection.createInvitation()
			if (peer !== connection) return
			const invitation = new URL(location.href)
			invitation.search = '?online=1'
			invitation.hash = 'invite=' + token
			output = invitation.href
		})
	}
	async function join() {
		await perform(async () => {
			const connection = createPeer(false)
			joining = true
			await connection.acceptInvitation(input)
		})
	}
	async function copy() {
		try {
			await navigator.clipboard.writeText(output)
			copied = true
		} catch {
			error = translate(messages.online_copy_manually)
		}
	}
</script>

<svelte:window onhashchange={readInvitation} />
<svelte:head><title>{translate(invited ? messages.online_challenge : messages.play_online)} · {mapName(map.id)} · Pixel’s War</title></svelte:head>

{#if connected && peer}
	<Game {map} connection={peer} />
{:else}
	<main class="online-setup">
		<a href={resolve('/', {})}>← Pixel’s War</a>
		<section class="panel">
			<h1>{translate(invited ? messages.online_challenge : messages.play_online)}</h1>
			<p>{mapName(map.id)}</p>
			{#if role !== 'join'}<p>{translate(messages.online_intro)}</p>{/if}
			{#if !supported}
				<p role="alert">{translate(messages.online_error_unsupported)}</p>
			{:else if !role}
				<div class="choices">
					<button class="primary" onclick={host}>{translate(messages.online_create)}</button>
					<button class="primary" onclick={() => (role = 'join')}>{translate(messages.online_join)}</button>
				</div>
			{:else}
				{#if !invited}<h2>{translate(role === 'host' ? messages.online_create : messages.online_join)}</h2>{/if}
				{#if output}
					<label for="connection-output">{translate(messages.online_invitation)}</label>
					<textarea id="connection-output" readonly value={output} rows="3" onfocus={(event) => event.currentTarget.select()}></textarea>
					<button onclick={copy}>{translate(copied ? messages.online_copied : messages.online_copy)}</button>
					<p>{translate(messages.online_host_steps)}</p>
				{/if}
				{#if role === 'join'}
					<form
						onsubmit={(event) => {
							event.preventDefault()
							if (!busy && !joining && input.trim()) void join()
						}}
					>
						{#if invited}
							<p>{translate(messages.online_guest_steps)}</p>
						{:else}
							<label for="connection-input">{translate(messages.online_paste_invitation)}</label>
							<textarea id="connection-input" bind:value={input} rows="3" maxlength="2048" required spellcheck="false"></textarea>
						{/if}
						<button class="primary" disabled={busy || joining || !input.trim()}>{translate(messages.online_connect)}</button>
					</form>
				{/if}
				{#if busy}<p role="status">{translate(messages.online_preparing)}</p>{/if}
				{#if joining || (role === 'host' && output && !error)}<p role="status">{translate(messages.online_connecting)}</p>{/if}
				{#if role === 'host' && error && !busy}
					<button onclick={host}>{translate(messages.online_create)}</button>
				{/if}
			{/if}
			{#if error}<p role="alert">{error}</p>{/if}
			<p class="connection-note"><a href={resolve('/terms/', {})}>{translate(messages.legal_title)}</a></p>
		</section>
	</main>
{/if}

<style>
	.online-setup {
		width: min(640px, calc(100% - 32px));
		margin: 24px auto;
	}
	.panel {
		margin-top: 20px;
	}
	h1 {
		font-size: 24px;
	}
	h2 {
		font-size: 18px;
		color: #ffe985;
	}
	p {
		line-height: 1.6;
	}
	.choices,
	form {
		display: grid;
		gap: 12px;
		margin: 20px 0;
	}
	label {
		display: block;
		margin: 16px 0 8px;
	}
	textarea {
		box-sizing: border-box;
		width: 100%;
		padding: 12px;
		border: 1px solid #a9bbc6;
		border-radius: 4px;
		background: #0d1216;
		color: #ffffff;
		font: inherit;
		font-size: 12px;
		resize: vertical;
	}
	button {
		min-height: 44px;
		white-space: normal;
	}
	[role='alert'] {
		color: #ffb3b1;
	}
	[role='status'] {
		color: #ffe985;
	}
	.connection-note {
		border-top: 1px solid #78909f;
		padding-top: 16px;
		margin-top: 24px;
		font-size: 12px;
		color: #e1e9ed;
	}
</style>
