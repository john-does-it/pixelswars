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
</script>

<nav aria-label="Game controls">
	<button disabled={locked(gameState) || !selected} onclick={() => game.confirm()}>Confirm move</button>
	<button disabled={locked(gameState) || !selected} onclick={() => game.cancel()}>Cancel move</button>
	<button disabled={!canCapture(gameState)} onclick={() => game.capture()}>{selected && gameState.cells[selected.cell].owner === gameState.player && gameState.cells[selected.cell].capturePoints < 20 ? 'Secure' : 'Capture'}</button>
	<button aria-haspopup="dialog" onclick={() => (showHelp = true)}>How to play</button>
	<button class="music" aria-label="Music {gameState.music ? 'on' : 'off'}" title="Music {gameState.music ? 'on' : 'off'}" aria-pressed={gameState.music} onclick={() => (gameState.music = !gameState.music)}>
		Music
		<img src="{base}/assets/icons/icon-{gameState.music ? 'play' : 'mute'}-sound.png" alt="" />
	</button>
	<button class="primary" disabled={locked(gameState)} onclick={() => game.endTurn()}>End round</button>
</nav>
{#if showHelp}
	<HowToPlayModal keyboardLayout={gameState.keyboardLayout} onlayoutchange={setKeyboardLayout} onclose={() => (showHelp = false)} />
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
		justify-content: center;
		gap: 8px;
		margin-top: 20px;
	}

	[role='status'] {
		text-align: center;
		color: #ffe985;
	}
</style>
