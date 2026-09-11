<script>
	import { selectedUnit, canCapture, locked } from '$lib/game/model.js'

	let { game } = $props()
	const state = $derived(game.state)
	const selected = $derived(selectedUnit(state))
	const factoryCell = $derived(state.cells[selected?.cell ?? state.hoveredIndex])
</script>

<nav aria-label="Game controls">
	<button disabled={locked(state) || !selected} onclick={() => game.confirm()}>Confirm move</button>
	<button disabled={locked(state) || !selected} onclick={() => game.cancel()}>Cancel move</button>
	<button disabled={!canCapture(state)} onclick={() => game.capture()}>Capture</button>
	{#if factoryCell?.building === 'factory' && factoryCell?.owner === state.player}
		<button disabled={locked(state)} onclick={() => game.openFactory(factoryCell.index)}>Open factory</button>
	{/if}
	<button aria-pressed={state.music} onclick={() => (state.music = !state.music)}>Music {state.music ? 'on' : 'off'}</button>
	<button class="primary" disabled={locked(state)} onclick={() => game.endTurn()}>End round</button>
</nav>
<p class="help">Select a unit, then click adjacent blue cells or use arrows / ZQSD. Enter: confirm · Esc: cancel · Space: capture.</p>
{#if state.fighting}
	<p role="status">Combat in progress…</p>
{/if}

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 20px;
	}

	.help {
		text-align: center;
		color: #aebbc4;
		font-size: 12px;
		line-height: 1.6;
	}

	[role='status'] {
		text-align: center;
		color: #ffe985;
	}
</style>
