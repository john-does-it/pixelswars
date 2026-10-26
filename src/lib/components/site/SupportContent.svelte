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
	const available = !!(support.paypal || (support.crypto.address && support.crypto.network))
</script>

<div class="support-content">
	<header>
		<h2>{translate(messages.support_title)}</h2>
		<p>{translate(messages.support_intro)}</p>
	</header>
	<section class="contributions">
		{#if !available}<p>{translate(messages.support_pending)}</p>{/if}
		{#if support.paypal}<div class="paypal-support">
				<p><a class="button primary site-action" href={support.paypal} target="_blank" rel="noopener noreferrer">{translate(messages.support_paypal)}</a></p>
				{#if support.paypalQrAsset}
					<img class="qr" src={asset(support.paypalQrAsset)} width="500" height="500" alt={translate(messages.support_paypal_qr)} />
				{/if}
			</div>{/if}
		{#if support.crypto.address && support.crypto.network}
			{#if support.paypal}<span class="or">{translate(messages.site_or)}</span>{/if}
			<div class="crypto-support">
				<p>{translate(messages.support_crypto_network, { network: support.crypto.network })}</p>
				<p class="address">{support.crypto.address}</p>
				<button class="primary site-action" onclick={copyAddress}>{translate(messages.support_crypto_copy)}</button>
				<p class="copy-status" role="status">{copyState === 'copied' ? translate(messages.support_crypto_copied) : copyState === 'failed' ? translate(messages.support_crypto_copy_failed) : ''}</p>
			</div>
		{/if}
	</section>
</div>

<style>
	.support-content {
		font-size: 16px;
	}
	h2 {
		margin: 0 0 var(--site-gap-medium);
	}
	header p {
		max-width: 640px;
		margin: 0 0 var(--site-gap-medium);
	}
	.contributions {
		display: flex;
		align-items: flex-start;
		gap: 64px;
	}
	.contributions p {
		margin: 0 0 16px;
	}
	.qr {
		display: block;
		width: 320px;
		max-width: 100%;
		height: auto;
	}
	.or {
		font-size: 12px;
		margin-top: 8px;
	}
	.crypto-support {
		max-width: 440px;
		min-width: 0;
	}
	.crypto-support p {
		margin: 0;
	}
	.crypto-support button {
		margin-top: 16px;
	}
	.address {
		overflow-wrap: anywhere;
		user-select: all;
		font-size: 16px;
	}
	.copy-status {
		margin-top: 12px !important;
	}
	@media (max-width: 900px) {
		.contributions {
			flex-direction: column;
			gap: 24px;
		}
	}
</style>
