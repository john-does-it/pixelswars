<script lang="ts">
	import { unitSpritePath } from '#lib/game/unit-sprites.js'
	import { onMount, type Snippet } from 'svelte'
	import UiIcon from './UiIcon.svelte'
	import { m as messages } from '#lib/paraglide/messages.js'
	import { translate } from '#lib/i18n.svelte.js'
	import Sprite from './Sprite.svelte'
	import { turnTransitionDuration } from '#lib/game/timing.js'
	import type { Player } from '#lib/game/types.js'

	let { player, persistent = false, showUnit = true, translucent = false, onclose, controls, label, children }: { player: Player; persistent?: boolean; showUnit?: boolean; translucent?: boolean; onclose?: () => void; controls?: Snippet; label?: string; children: Snippet } = $props()
	let visible = $state(true)
	let blurReady = $state(false)
	let contentReady = $state(false)
	let arrivedBands = 0
	let dialog = $state<HTMLDialogElement>()
	const bands = [
		{ delay: 0, duration: 0.89 },
		{ delay: 0.03, duration: 0.88 },
		{ delay: 0.048, duration: 0.9 },
		{ delay: 0.037, duration: 0.87 },
		{ delay: 0.075, duration: 0.89 },
		{ delay: 0.093, duration: 0.9 }
	].map(({ delay, duration }) => ({ delay: delay * turnTransitionDuration, duration: duration * turnTransitionDuration }))
	const revealDelay = Math.max(...bands.map((band) => band.delay + band.duration * 0.2))

	onMount(() => {
		dialog?.showModal()
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			blurReady = true
			contentReady = true
		}
		if (persistent) {
			return () => dialog?.close()
		}
		const timeout = setTimeout(() => {
			dialog?.close()
			visible = false
		}, turnTransitionDuration)
		return () => {
			clearTimeout(timeout)
			dialog?.close()
		}
	})
</script>

{#snippet content()}
	<div class="turn-sweep" class:red={player === 2} class:persistent style:--turn-duration={`${turnTransitionDuration}ms`} style:--reveal-delay={`${revealDelay}ms`}>
		<div class="transition-bands" aria-hidden="true">
			{#each bands as band}
				<div
					class="transition-band"
					onanimationend={(event) => {
						if (event.animationName.includes('band-arrival') && ++arrivedBands === bands.length) blurReady = true
					}}
					style:--band-delay={`${band.delay}ms`}
					style:--band-duration={`${band.duration}ms`}
					style:--entrance-duration={`${band.duration * 0.2}ms`}
				></div>
			{/each}
		</div>
		<div
			class="transition-content"
			onanimationend={(event) => {
				if (event.target === event.currentTarget && event.animationName.includes('message-arrival')) contentReady = true
			}}
		>
			{#if showUnit}<div class="transition-unit"><Sprite src={unitSpritePath('infantry', player)} size="xl" /></div>{/if}
			{@render children()}
		</div>
	</div>
{/snippet}

{#if visible}
	<dialog
		bind:this={dialog}
		class="turn-transition"
		class:translucent
		class:blur-ready={blurReady}
		aria-label={label}
		oncancel={(event) => {
			event.preventDefault()
			onclose?.()
		}}
	>
		{@render content()}
		{#if controls}{@render controls()}{:else if onclose && (!persistent || contentReady)}<button class="transition-close pixel-icon-button" aria-label={translate(messages.close)} onclick={onclose}><UiIcon name="close" /></button>{/if}
	</dialog>
{/if}

<style>
	.translucent {
		backdrop-filter: blur(0px);
		-webkit-backdrop-filter: blur(0px);
		transition:
			backdrop-filter 400ms ease,
			-webkit-backdrop-filter 400ms ease;
	}
	.translucent.blur-ready {
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}
	.translucent .persistent .transition-band {
		background: color-mix(in srgb, var(--transition-color) 94%, transparent);
	}
	.transition-close {
		position: absolute;
		top: 24px;
		right: 24px;
		z-index: 1;
	}
	.turn-transition {
		position: fixed;
		inset: 0;
		z-index: 20;
		width: 100%;
		height: 100%;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		overflow: hidden;
		background: transparent;
		pointer-events: auto;

		&::backdrop {
			background: transparent;
		}
	}

	.turn-sweep {
		--transition-color: var(--site-sky);
		position: relative;
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		overflow-x: hidden;
		overflow-y: auto;
		color: var(--site-plum);

		&.red {
			--transition-color: var(--site-yellow);
		}
	}
	.turn-sweep:not(.persistent) {
		--transition-color: var(--player-blue);
		color: var(--site-paper);

		&.red {
			--transition-color: var(--player-red);
		}
	}
	.transition-bands {
		position: absolute;
		inset: 0;
		overflow: hidden;
		display: grid;
		grid-template-rows: repeat(6, 1fr);
		pointer-events: none;
	}
	.transition-band {
		background: color-mix(in srgb, var(--transition-color) 72%, transparent);
		animation: band-sweep var(--band-duration) cubic-bezier(0.45, 0, 0.55, 1) var(--band-delay) both;
	}
	.persistent .transition-band {
		background: var(--transition-color);
		animation-name: band-arrival;
		animation-duration: var(--entrance-duration);
	}

	.transition-content {
		--site-heading-outline: var(--interface-heading-outline);
		font-family: var(--font-display);
		position: relative;
		width: min(960px, calc(100% - 32px));
		margin: auto;
		padding: 24px 0;
		font-size: clamp(20px, 4vw, 40px);
		font-weight: bold;
		line-height: 1.5;
		text-align: center;
		text-shadow: none;
		animation: message-sweep var(--turn-duration) ease-in-out both;
	}
	.transition-unit {
		display: block;
		margin: 0 auto 20px;
		filter: drop-shadow(0 6px 0 #0003);
	}
	.persistent .transition-content {
		animation: message-arrival 350ms ease-out var(--reveal-delay) both;
	}
	@keyframes band-sweep {
		0% {
			transform: translateX(-100%);
		}
		20%,
		76% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(100%);
		}
	}
	@keyframes band-arrival {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}
	@keyframes message-sweep {
		0%,
		30% {
			opacity: 0;
			visibility: hidden;
			transform: translateX(-24px);
		}
		40%,
		64% {
			opacity: 1;
			visibility: visible;
			transform: translateX(0);
		}
		78%,
		100% {
			opacity: 0;
			visibility: hidden;
			transform: translateX(48px);
		}
	}
	@keyframes message-arrival {
		from {
			opacity: 0;
			visibility: hidden;
			transform: translateX(-24px);
		}
		to {
			opacity: 1;
			visibility: visible;
			transform: translateX(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.translucent {
			transition: none;
		}
		.transition-band,
		.transition-content {
			animation: none !important;
			transform: none;
		}
	}
</style>
