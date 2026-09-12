<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte'
	import { base } from '$app/paths'
	import { createGame } from '$lib/game/game.svelte.js'
	import { createAudio } from '$lib/game/audio.js'
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

	onMount(() => {
		audio = createAudio(base)
		return () => audio?.dispose()
	})

	onDestroy(() => game.dispose())

	$effect(() => {
		audio?.music(game.state.music, game.state.player)
	})

	function restart() {
		const keyboardLayout = game.state.keyboardLayout
		game.dispose()
		game = createGame(map, { sound: (name) => audio?.sound(name) })
		game.state.keyboardLayout = keyboardLayout
	}
</script>

<svelte:window onkeydown={(event) => game.keydown(event)} />
<svelte:head>
	<title>Pixel’s War · {map.name}</title>
</svelte:head>
<main class="game-shell">
	<GameHeader state={game.state} name={map.name} />
	<div class="field">
		<div class="board-column">
			<Board {game} name={map.name} />
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

<style>
	.game-shell {
		width: min(1200px, 100% - 32px);
		margin: auto;
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
