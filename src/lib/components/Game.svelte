<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte'
	import { resolve } from '$app/paths'
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
	import TurnAnnouncement from './TurnAnnouncement.svelte'
	import Modal from './Modal.svelte'
	import type { MatchConnection } from '$lib/game/peer.js'
	import type { AiDifficulty, AudioController, GameController, GameMap } from '$lib/game/types.js'

	let { map, difficulty = null, connection }: { map: GameMap; difficulty?: AiDifficulty | null; connection?: MatchConnection } = $props()
	let audio = $state<AudioController>()
	let game = $state<GameController>(untrack(() => createGame(map, { aiDifficulty: difficulty, sound: (name) => audio?.sound(name) }, connection)))
	const network = $derived(game.state.network)
	const localTurn = $derived(!network || network.player === game.state.player)
	let preferencesLoaded = $state(false)
	let showHelp = $state(false)
	let controlsHeight = $state(0)
	const assetsReady = preloadGameAssets()

	onMount(() => {
		let mounted = true
		const saved = initializePreferences()
		game.state.keyboardLayout = saved.keyboardLayout
		game.state.sound = saved.sound
		game.state.music = saved.music
		preferencesLoaded = true
		audio = createAudio()
		void assetsReady.then(() => {
			if (mounted) game.start?.()
		})
		return () => {
			mounted = false
			audio?.dispose()
		}
	})

	onDestroy(() => game.dispose())

	$effect(() => {
		audio?.music(game.state.sound && game.state.music, game.state.player)
		if (preferencesLoaded) updatePreferences({ keyboardLayout: game.state.keyboardLayout, sound: game.state.sound, music: game.state.music })
	})

	function restart() {
		if (connection) {
			game.requestRematch?.()
			return
		}
		const { keyboardLayout, sound, music } = game.state
		game.dispose()
		game = createGame(map, { aiDifficulty: difficulty, sound: (name) => audio?.sound(name) })
		game.state.keyboardLayout = keyboardLayout
		game.state.sound = sound
		game.state.music = music
		game.start?.()
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
	<main class="game-shell" style:--controls-height={`${controlsHeight}px`}>
		{#key game}
			{#key game.state.round}
				{#if game.state.winner === null && localTurn && (!network || network.phase === 'playing') && (!difficulty || (game.state.player === 2 && !game.state.aiThinking))}
					<TurnAnnouncement player={game.state.player} message={difficulty || network ? translate(messages.your_turn) : translate(messages.player_turn, { player: game.state.player })} />
				{/if}
			{/key}
		{/key}
		<GameHeader aiMode={!!difficulty} state={game.state} name={mapName(map.id)} onhelp={() => (showHelp = true)} />
		{#if network}
			<p class="match-mode" role="status">{translate(network.player === 1 ? messages.online_blue : messages.online_red)}{!localTurn ? ` · ${translate(messages.online_opponent_turn)}` : ''}</p>
		{/if}
		{#if difficulty}
			<p class="match-mode" role="status">{translate(messages.ai_match, { level: translate(messages[`ai_${difficulty}`]) })}{game.state.aiThinking ? ` · ${translate(messages.ai_thinking)}` : ''}</p>
		{/if}
		<div class="field">
			<div class="board-column">
				<Board {game} aiMode={!!difficulty} name={mapName(map.id)} />
				<Controls {game} bind:showHelp bind:controlsHeight />
			</div>
			<StatsPanel aiMode={!!difficulty} state={game.state} />
		</div>
		{#if game.state.productionIndex !== null && !game.state.aiThinking && localTurn && (!network || network.phase === 'playing')}
			<ProductionModal {game} />
		{/if}
		{#if game.state.winner !== null && (!network || network.phase === 'playing')}
			<VictoryModal aiMode={!!difficulty} winner={game.state.winner} onrestart={restart} rematchRequested={network?.rematchRequested} opponentRematchRequested={network?.opponentRematchRequested} />
		{/if}
		{#if network && network.phase !== 'playing'}
			<Modal title={translate(network.phase === 'waiting' ? messages.online_waiting : messages.online_paused)}>
				<p>{translate(network.phase === 'waiting' ? messages.online_waiting_detail : messages.online_paused_detail)}</p>
				<a class="button primary" href={resolve('/', {})}>{translate(messages.choose_another_map)}</a>
			</Modal>
		{/if}
	</main>
{/await}

<style>
	.match-mode {
		font-size: 12px;
		color: #ffe985;
		margin: 0 0 12px;
	}
	.game-shell {
		width: min(1200px, 100% - 32px);
		margin: auto;

		@media (max-width: 900px) {
			padding-bottom: calc(var(--controls-height, 80px) + 24px);
		}
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
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}
</style>
