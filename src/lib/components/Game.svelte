<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte'
	import { createGame } from '$lib/game/game.svelte.js'
	import { createAudio } from '$lib/game/audio.js'
	import { preloadGameAssets } from '$lib/game/preload.js'
	import { initializePreferences, updatePreferences } from '$lib/preferences.svelte.js'
	import { mapName, translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import Board from './Board.svelte'
	import GameHeader from './GameHeader.svelte'
	import Controls from './Controls.svelte'
	import StatsPanel from './StatsPanel.svelte'
	import ProductionModal from './ProductionModal.svelte'
	import VictoryModal from './VictoryModal.svelte'
	import type { AudioController, GameController, GameMap } from '$lib/game/types.js'

	let { map }: { map: GameMap } = $props()
	let audio = $state<AudioController>()
	let game = $state<GameController>(untrack(() => createGame(map, { sound: (name) => audio?.sound(name) })))
	let preferencesLoaded = $state(false)
	const assetsReady = preloadGameAssets()

	onMount(() => {
		const saved = initializePreferences()
		game.state.keyboardLayout = saved.keyboardLayout
		game.state.sound = saved.sound
		game.state.music = saved.music
		preferencesLoaded = true
		audio = createAudio()
		return () => audio?.dispose()
	})

	onDestroy(() => game.dispose())

	$effect(() => {
		audio?.music(game.state.sound && game.state.music, game.state.player)
		if (preferencesLoaded) updatePreferences({ keyboardLayout: game.state.keyboardLayout, sound: game.state.sound, music: game.state.music })
	})

	function restart() {
		const { keyboardLayout, sound, music } = game.state
		game.dispose()
		game = createGame(map, { sound: (name) => audio?.sound(name) })
		game.state.keyboardLayout = keyboardLayout
		game.state.sound = sound
		game.state.music = music
	}
</script>

<svelte:window onkeydown={(event) => game.keydown(event)} />
<svelte:head>
	<title>Pixel’s War · {mapName(map.id)}</title>
</svelte:head>

{#await assetsReady}
	<main class="game-shell loading" aria-busy="true">
		<p role="status">{translate(messages.loading_battlefield)}</p>
	</main>
{:then}
	<main class="game-shell">
		<GameHeader state={game.state} name={mapName(map.id)} />
		<div class="field">
			<div class="board-column">
				<Board {game} name={mapName(map.id)} />
				<Controls {game} />
			</div>
			<StatsPanel state={game.state} />
		</div>
		{#if game.state.productionIndex !== null}
			<ProductionModal {game} />
		{/if}
		{#if game.state.winner !== null}
			<VictoryModal winner={game.state.winner} onrestart={restart} />
		{/if}
	</main>
{/await}

<style>
	.game-shell {
		width: min(1200px, 100% - 32px);
		margin: auto;
	}

	.loading {
		display: grid;
		place-items: center;
		min-height: 100svh;
		color: #ffe985;
		text-align: center;
	}

	.field {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 245px;
		align-items: start;
		gap: 24px;

		@media (max-width: 900px) {
			grid-template-columns: minmax(0, 1fr);

			:global(aside) {
				width: min(100%, 480px);
				justify-self: center;
			}
		}
	}

	.board-column {
		min-width: 0;
	}
</style>
