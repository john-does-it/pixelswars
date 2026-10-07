<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte'
	import { resolve } from '$app/paths'
	import { createGame } from '$lib/game/game.svelte.js'
	import { selectedUnit } from '$lib/game/model.js'
	import { createAudio } from '$lib/game/audio.js'
	import { preloadGameAssets } from '$lib/game/preload.js'
	import { initializePreferences, updatePreferences, preferences } from '$lib/preferences.svelte.js'
	import { mapName, translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import Board from './Board.svelte'
	import ZoomControls from './ZoomControls.svelte'
	import type { MapCamera } from '$lib/game/map-camera.js'
	import GameHeader from './GameHeader.svelte'
	import Controls from './Controls.svelte'
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
	let camera = $state<MapCamera>()
	let gameElement = $state<HTMLElement>()
	const assetsReady = preloadGameAssets()

	function handleKeydown(event: KeyboardEvent) {
		const previousCell = selectedUnit(game.state)?.cell
		game.keydown(event)
		const currentCell = selectedUnit(game.state)?.cell
		if (event.defaultPrevented && currentCell !== undefined && previousCell !== undefined && currentCell !== previousCell) {
			// Let the board's selection effect focus the destination and follow it,
			// including when keyboard movement starts from a toolbar button.
			gameElement?.querySelector<HTMLElement>('.board')?.focus({ preventScroll: true })
		}
	}

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
		audio?.setVolume(preferences.volume)
		game.state.sound = preferences.volume > 0
	})

	$effect(() => {
		audio?.music(game.state.sound && game.state.music, game.state.player)
	})

	$effect(() => {
		const { keyboardLayout, sound, music } = game.state
		if (preferencesLoaded) untrack(() => updatePreferences({ keyboardLayout, sound, music }))
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

<svelte:window onkeydown={handleKeydown} />
<svelte:head>
	<title>Pixel’s War · {mapName(map.id)}</title>
</svelte:head>

{#await assetsReady}
	<main class="game-shell loading" aria-busy="true">
		<p role="status">{translate(messages.loading_battlefield)}</p>
	</main>
{:then}
	<main bind:this={gameElement} class="game-shell" style:--controls-height={`${controlsHeight}px`}>
		{#key game}
			{#key game.state.round}
				{#if game.state.winner === null && localTurn && (!network || network.phase === 'playing')}
					<TurnAnnouncement player={game.state.player} message={difficulty && game.state.player === 1 ? translate(messages.ai_turn) : difficulty || network ? translate(messages.your_turn) : translate(messages.player_turn, { player: game.state.player })} />
				{/if}
			{/key}
		{/key}
		<GameHeader aiMode={!!difficulty} state={game.state} onoptions={() => (showHelp = true)} />
		{#snippet mapStatus()}
			<div class="match-status">
				{#if network}
					<p class="match-mode" role="status">{translate(network.player === 1 ? messages.online_blue : messages.online_red)}{!localTurn ? ` · ${translate(messages.online_opponent_turn)}` : ''}</p>
				{/if}
				<p class="combat-status" role="status"><span class:inactive={!game.state.fighting || game.state.aiThinking} aria-hidden={!game.state.fighting || game.state.aiThinking}>{translate(messages.combat_in_progress)}</span></p>
			</div>
		{/snippet}
		<div class="field">
			<div class="board-column">
				<Board {game} aiMode={!!difficulty} name={mapName(map.id)} bind:camera reservedBottom={controlsHeight} {mapStatus} />
				<div class="board-actions">
					<div class="desktop-zoom"><ZoomControls {camera} /></div>
					<Controls {game} aiMode={!!difficulty} bind:showHelp bind:controlsHeight onrestart={connection ? undefined : restart} />
				</div>
			</div>
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
	.game-shell:has(:global(.turn-sweep)) :global(.unit-sprite),
	.game-shell:has(:global(.turn-sweep)) :global(.water-shimmer) {
		animation-play-state: paused;
	}
	.match-status {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		column-gap: 16px;
		font-size: 14px;
		color: var(--color-accent);
	}
	.match-mode,
	.combat-status {
		margin: 0;
	}
	.combat-status {
		text-align: left;
	}
	.inactive {
		visibility: hidden;
	}
	.game-shell {
		width: calc(100% - 32px);
		margin: auto;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-bottom: 8px;
		@media (max-width: 900px) {
			padding-bottom: calc(var(--controls-height, 0px) + 8px);
			width: calc(100% - 16px);
		}
	}

	.loading {
		display: grid;
		place-items: center;
		min-height: 100svh;
		color: var(--color-accent);
		text-align: center;
	}

	.field {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto;
		align-items: stretch;
		gap: 16px;

		@media (max-width: 900px) {
			grid-template-columns: minmax(0, 1fr);
			gap: 8px;

			:global(aside) {
				width: 100%;
			}
		}
	}

	.board-column {
		height: max(340px, calc(100svh - 210px));
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
		min-height: 0;
	}
	.board-actions {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		flex: none;
		min-height: 46px;
	}
	@media (max-width: 900px) {
		.field {
			flex: 1;
		}
		.board-column {
			height: auto;
			min-height: 240px;
		}
		.desktop-zoom {
			display: none;
		}
		.board-actions {
			display: contents;
		}
	}
</style>
