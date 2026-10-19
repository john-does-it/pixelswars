<script lang="ts">
	import { asset } from '$lib/game/asset-path'
	import { support } from '$lib/support.ts'
	import { translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	let copyState = $state<'idle' | 'copied' | 'failed'>('idle')
	async function copyAddress() {
		try {
			await navigator.clipboard.writeText(support.crypto.address)
			copyState = 'copied'
		} catch {
			copyState = 'failed'
		}
	}
	const available = !!(support.paypal || (support.crypto.address && support.crypto.network) || (support.bank.iban && support.bank.beneficiary))
</script>

<svelte:head><title>{translate(messages.support_title)} · Pixel’s War</title></svelte:head>
<main class="site-page">
	<header>
		<h1>{translate(messages.support_title)}</h1>
		<p>{translate(messages.support_intro)}</p>
		<p>{translate(messages.support_gratitude)}</p>
	</header>
	<section class="panel">
		<h2>{translate(messages.support_contribute)}</h2>
		{#if !available}<p>{translate(messages.support_pending)}</p>{/if}
		{#if support.paypal}
			<p><a class="button primary" href={support.paypal} target="_blank" rel="noopener noreferrer">{translate(messages.support_paypal)}</a></p>
			{#if support.paypalQrAsset}
				<p>{translate(messages.support_paypal_scan)}</p>
				<img class="qr" src={asset(support.paypalQrAsset)} width="500" height="500" alt={translate(messages.support_paypal_qr)} />
			{/if}
		{/if}
		{#if support.crypto.address && support.crypto.network}
			<div class="crypto-support">
				<h3><img class="crypto-icon" src={asset(support.crypto.iconAsset)} width="32" height="32" alt="" />{translate(messages.support_crypto)}</h3>
				<p>{translate(messages.support_crypto_network, { network: support.crypto.network })}</p>
				<p class="address">{support.crypto.address}</p>
				<button onclick={copyAddress}>{translate(messages.support_crypto_copy)}</button>
				<p class="copy-status" role="status">{copyState === 'copied' ? translate(messages.support_crypto_copied) : copyState === 'failed' ? translate(messages.support_crypto_copy_failed) : ''}</p>
			</div>
		{/if}
		{#if support.bank.iban && support.bank.beneficiary}
			<h3>{translate(messages.support_bank)}</h3>
			<p>{support.bank.beneficiary}</p>
			<p class="address">{support.bank.iban}</p>
			{#if support.bank.qrAsset}<img class="qr" src={asset(support.bank.qrAsset)} alt={translate(messages.support_bank)} />{/if}
		{/if}
	</section>
</main>

<style>
	section {
		margin-top: 24px;
		padding: 20px;
	}
	.crypto-support {
		margin-top: 32px;
	}
	.crypto-support h3 {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}
	.crypto-icon {
		flex: 0 0 32px;
	}
	.copy-status {
		min-height: 1.7em;
	}
	.address {
		overflow-wrap: anywhere;
		user-select: all;
	}
	.qr {
		width: 250px;
		height: auto;
		display: block;
		max-width: 100%;
	}
</style>
