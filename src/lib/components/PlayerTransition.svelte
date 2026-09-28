<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
	import { asset } from '$app/paths'
	import { turnTransitionDuration } from '$lib/game/timing.js'
	import type { Player } from '$lib/game/types.js'

	let { player, persistent = false, label, children }: { player: Player; persistent?: boolean; label?: string; children: Snippet } = $props()
	let visible = $state(true)
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
				<div class="transition-band" style:--band-delay={`${band.delay}ms`} style:--band-duration={`${band.duration}ms`} style:--entrance-duration={`${band.duration * 0.2}ms`}></div>
			{/each}
		</div>
		<div class="transition-content">
			<img class="transition-unit" src={asset(`/assets/units/infantry-${player}-fit.png`)} alt="" />
			{@render children()}
		</div>
	</div>
{/snippet}

{#if visible}
	<dialog bind:this={dialog} class="turn-transition" aria-label={label} oncancel={(event) => event.preventDefault()}>
		{@render content()}
	</dialog>
{/if}

<style>
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
		--transition-color: #174a70;
		position: relative;
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		overflow-x: hidden;
		overflow-y: auto;
		color: #ffffff;

		&.red {
			--transition-color: #792d3a;
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
		position: relative;
		width: min(960px, calc(100% - 32px));
		margin: auto;
		padding: 24px 0;
		font-size: clamp(20px, 4vw, 40px);
		font-weight: bold;
		line-height: 1.5;
		text-align: center;
		text-shadow: 2px 2px #0006;
		animation: message-sweep var(--turn-duration) ease-in-out both;
	}
	.transition-unit {
		display: block;
		width: clamp(64px, 12vw, 112px);
		height: clamp(64px, 12vw, 112px);
		object-fit: contain;
		image-rendering: pixelated;
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
		.transition-band,
		.transition-content {
			animation: none !important;
			transform: none;
		}
	}
</style>
