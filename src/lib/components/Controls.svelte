<script lang="ts">
	import { base } from '$app/paths'
	import { selectedUnit, canCapture, locked } from '$lib/game/model.js'
	import type { GameController } from '$lib/game/types.js'

	let { game }: { game: GameController } = $props()
	const state = $derived(game.state)
	const selected = $derived(selectedUnit(state))
</script>

<nav aria-label="Game controls">
	<button disabled={locked(state) || !selected} onclick={() => game.confirm()}>Confirm move</button>
	<button disabled={locked(state) || !selected} onclick={() => game.cancel()}>Cancel move</button>
	<button disabled={!canCapture(state)} onclick={() => game.capture()}>{selected && state.cells[selected.cell].owner === state.player && state.cells[selected.cell].capturePoints < 20 ? 'Secure' : 'Capture'}</button>
	<button class="music" aria-label="Music {state.music ? 'on' : 'off'}" title="Music {state.music ? 'on' : 'off'}" aria-pressed={state.music} onclick={() => (state.music = !state.music)}>
		Music
		<img src="{base}/assets/icons/icon-{state.music ? 'play' : 'mute'}-sound.png" alt="" />
	</button>
	<button class="primary" disabled={locked(state)} onclick={() => game.endTurn()}>End round</button>
</nav>
<p class="help">Select a unit, then click adjacent blue cells or use arrows / ZQSD. Enter: confirm · Esc: cancel · Space: capture.</p>
{#if state.fighting}
	<p role="status">Combat in progress…</p>
{/if}

<style>
	.music {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.music img {
		display: block;
		width: 24px;
		height: 24px;
		object-fit: contain;
		image-rendering: pixelated;
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 20px;
	}

	.help {
		text-align: center;
		color: #dce6eb;
		font-size: 12px;
		line-height: 1.6;
	}

	[role='status'] {
		text-align: center;
		color: #ffe985;
	}
</style>
