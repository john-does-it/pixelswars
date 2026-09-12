<script lang="ts">
	import { onMount } from 'svelte'
	import { base } from '$app/paths'
	import { selectedUnit, canCapture, locked } from '$lib/game/model.js'
	import type { GameController, KeyboardLayout } from '$lib/game/types.js'
	import HowToPlayModal from './HowToPlayModal.svelte'

	const keyboardPreferenceKey = 'pixel-wars-keyboard-layout'
	let { game }: { game: GameController } = $props()
	let showHelp = $state(false)
	const gameState = $derived(game.state)
	const selected = $derived(selectedUnit(gameState))

	onMount(() => {
		const savedLayout = localStorage.getItem(keyboardPreferenceKey)
		if (savedLayout === 'azerty' || savedLayout === 'qwerty') gameState.keyboardLayout = savedLayout
	})

	function setKeyboardLayout(layout: KeyboardLayout) {
		gameState.keyboardLayout = layout
		localStorage.setItem(keyboardPreferenceKey, layout)
	}

	function changeKeyboardLayout(event: Event) {
		const layout = (event.currentTarget as HTMLSelectElement).value
		if (layout === 'azerty' || layout === 'qwerty') setKeyboardLayout(layout)
	}
</script>

<nav aria-label="Game controls">
	<div class="utility-controls">
		<button class="music" aria-label="Music {gameState.music ? 'on' : 'off'}" title="Music {gameState.music ? 'on' : 'off'}" aria-pressed={gameState.music} onclick={() => (gameState.music = !gameState.music)}>
			Music
			<img src="{base}/assets/icons/icon-{gameState.music ? 'play' : 'mute'}-sound.png" alt="" />
		</button>
		<button aria-haspopup="dialog" onclick={() => (showHelp = true)}>How to play</button>
		<label class="keyboard-layout">
			<span>Keyboard</span>
			<select aria-label="Keyboard movement layout" value={gameState.keyboardLayout} onchange={changeKeyboardLayout}>
				<option value="azerty">AZERTY · ZQSD</option>
				<option value="qwerty">QWERTY · WASD</option>
			</select>
		</label>
	</div>
	<div class="action-controls">
		<button disabled={locked(gameState) || !selected} onclick={() => game.confirm()}>Confirm move</button>
		<button disabled={locked(gameState) || !selected} onclick={() => game.cancel()}>Cancel move</button>
		<button disabled={!canCapture(gameState)} onclick={() => game.capture()}>{selected && gameState.cells[selected.cell].owner === gameState.player && gameState.cells[selected.cell].capturePoints < 20 ? 'Secure' : 'Capture'}</button>
		<button class="primary" disabled={locked(gameState)} onclick={() => game.endTurn()}>End round</button>
	</div>
</nav>
{#if showHelp}
	<HowToPlayModal keyboardLayout={gameState.keyboardLayout} onclose={() => (showHelp = false)} />
{/if}
{#if gameState.fighting}
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
		justify-content: flex-end;
		gap: 8px;
		margin-top: 20px;
	}

	.utility-controls,
	.action-controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 8px;
	}

	.keyboard-layout {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding-left: 10px;
		color: #dce6eb;
		background: #19242c;
		border: 1px solid #78909f;
		border-radius: 5px;
	}

	.keyboard-layout span {
		font-size: 13px;
		font-weight: bold;
	}

	select {
		align-self: stretch;
		font: inherit;
		font-size: 13px;
		color: inherit;
		background: #2b3d49;
		border: 0;
		border-left: 1px solid #78909f;
		border-radius: 0 4px 4px 0;
		padding: 0 9px;
		cursor: pointer;
	}

	@media (max-width: 900px) {
		nav,
		.utility-controls,
		.action-controls {
			justify-content: center;
		}
	}

	[role='status'] {
		text-align: center;
		color: #ffe985;
	}
</style>
