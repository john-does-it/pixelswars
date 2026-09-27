<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
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
		}, 2200)
		return () => {
			clearTimeout(timeout)
			dialog?.close()
		}
	})
</script>

{#snippet content()}
	<div class="turn-sweep" class:red={player === 2} class:persistent>
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
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		overflow: auto;
		background: #174a70;
		color: #ffffff;
		animation: turn-sweep 2200ms ease-in-out forwards;

		&.red {
			background: #792d3a;
		}

		&.persistent {
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
		}
		20%,
		75% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(100%);
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
