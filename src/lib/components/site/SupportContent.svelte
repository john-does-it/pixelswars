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
		<p class="support-subtitle"><span>{translate(messages.support_intro)}</span><img class="support-heart" src={asset('/assets/icons/icon-health.png')} width="24" height="24" alt="" /></p>
	</header>
	<section class="contributions">
		{#if !available}<p>{translate(messages.support_pending)}</p>{/if}
		{#if support.paypal}<div class="paypal-support">
				<h3>PayPal</h3>
				<p><a class="button primary site-action" href={support.paypal} target="_blank" rel="noopener noreferrer">{translate(messages.support_paypal)}</a></p>
				{#if support.paypalQrAsset}
					<img class="qr" src={asset(support.paypalQrAsset)} width="500" height="500" alt={translate(messages.support_paypal_qr)} />
				{/if}
			</div>{/if}
		{#if support.crypto.address && support.crypto.network}
			{#if support.paypal}<span class="or">{translate(messages.site_or)}</span>{/if}
			<div class="crypto-support">
				<h3>Ethereum</h3>
				<button class="primary site-action" onclick={copyAddress}>{translate(messages.support_crypto_copy)}</button>
				<p>{translate(messages.support_crypto_network, { network: support.crypto.network })}</p>
				<p class="address"><a href={`https://etherscan.io/address/${support.crypto.address}`} target="_blank" rel="noopener noreferrer">{support.crypto.address}</a></p>
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
		margin: 0 0 12px;
	}
	h3 {
		margin: 0 0 16px;
	}
	header p {
		max-width: 640px;
		margin: 0 0 var(--site-gap-medium);
	}
	.support-subtitle {
		color: var(--site-muted);
		display: flex;
		align-items: center;
		gap: 10px;
		line-height: 1.5;
	}
	.support-heart {
		flex: none;
		image-rendering: pixelated;
		animation: support-heartbeat 1.8s ease-in-out infinite;
	}
	@keyframes support-heartbeat {
		0%,
		40%,
		100% {
			transform: scale(1);
		}
		12%,
		28% {
			transform: scale(1.16);
		}
		20% {
			transform: scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.support-heart {
			animation: none;
		}
	}
	.contributions {
		display: flex;
		align-items: flex-start;
		gap: 64px;
		margin-top: var(--site-gap-medium);
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
		margin-bottom: 16px;
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
