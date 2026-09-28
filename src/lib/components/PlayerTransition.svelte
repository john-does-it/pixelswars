<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
	import { turnTransitionDuration } from '$lib/game/timing.js'
	import type { Player } from '$lib/game/types.js'

	let { player, persistent = false, label, children }: { player: Player; persistent?: boolean; label?: string; children: Snippet } = $props()
	let visible = $state(true)
	let dialog = $state<HTMLDialogElement>()

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
	<div class="turn-sweep" class:red={player === 2} class:persistent style:--turn-duration={`${turnTransitionDuration}ms`}>
		<div class="transition-content">
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
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		overflow: auto;
		background: color-mix(in srgb, var(--transition-color) 72%, transparent);
		color: #ffffff;
		animation: turn-sweep var(--turn-duration) cubic-bezier(0.45, 0, 0.55, 1) forwards;

		&.red {
			--transition-color: #792d3a;
		}

		&.persistent {
			background: var(--transition-color);
			animation: victory-sweep 440ms ease-in-out forwards;
		}

		@media (prefers-reduced-motion: reduce) {
			&,
			&.persistent {
				animation: none;
			}
		}
	}

	.transition-content {
		width: min(960px, calc(100% - 32px));
		margin: auto;
		padding: 24px 0;
		font-size: clamp(20px, 4vw, 40px);
		font-weight: bold;
		line-height: 1.5;
		text-align: center;
		text-shadow: 2px 2px #0006;
	}

	@keyframes turn-sweep {
		0% {
			transform: translateX(-100%);
			opacity: 0;
		}
		28%,
		72% {
			transform: translateX(0);
			opacity: 1;
		}
		100% {
			transform: translateX(100%);
			opacity: 0;
		}
	}

	@keyframes victory-sweep {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}
</style>
