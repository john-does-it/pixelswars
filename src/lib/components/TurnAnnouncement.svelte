<script lang="ts">
	import { onMount } from 'svelte'
	import type { Player } from '$lib/game/types.js'

	let { player, message }: { player: Player; message: string } = $props()
	let visible = $state(true)

	onMount(() => {
		const timeout = setTimeout(() => (visible = false), 2800)
		return () => clearTimeout(timeout)
	})
</script>

{#if visible}
	<div class="turn-announcement" class:red={player === 2} role="status" aria-live="polite" aria-atomic="true">
		{message}
	</div>
{/if}

<style>
	.turn-announcement {
		position: fixed;
		top: 22svh;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		width: max-content;
		max-width: calc(100% - 32px);
		padding: 16px 24px;
		border: 2px solid #8dcbff;
		border-radius: 8px;
		background: #19242cf5;
		color: #8dcbff;
		box-shadow: 0 8px 24px #0007;
		font-size: clamp(16px, 3vw, 22px);
		text-align: center;
		pointer-events: none;
		animation: turn-fade 2800ms ease-out forwards;

		&.red {
			border-color: #ffb3b1;
			color: #ffb3b1;
		}

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	}

	@keyframes turn-fade {
		0%,
		65% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
