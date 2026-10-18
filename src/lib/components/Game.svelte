<script lang="ts">
	import { recordVictory, playerProfile } from '$lib/profile.svelte.ts'
	import type { Medal } from '$lib/profile.ts'
	import { onMount, onDestroy, untrack } from 'svelte'
	import { resolve } from '$app/paths'
	import TutorialPanel from './TutorialPanel.svelte'
	import { tutorialTarget, type TutorialScenario, type TutorialController } from '$lib/game/tutorial.ts'
	import { createGame, createTutorialGame } from '$lib/game/game.svelte.js'
	import { selectedUnit, unitAt, locked } from '$lib/game/model.js'
	import { createAudio } from '$lib/game/audio.js'
	import { preloadGameAssets } from '$lib/game/preload.js'
	import { initializePreferences, updatePreferences, preferences } from '$lib/preferences.svelte.js'
	import { mapName, translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import Board from './Board.svelte'
	import GameHeader from './GameHeader.svelte'
	import SelectedUnitStrip from './SelectedUnitStrip.svelte'
	import Controls from './Controls.svelte'
	import ProductionModal from './ProductionModal.svelte'
	import VictoryModal from './VictoryModal.svelte'
	import TurnAnnouncement from './TurnAnnouncement.svelte'
	import Modal from './Modal.svelte'
	import type { MatchConnection } from '$lib/game/peer.js'
	import type { AiDifficulty, AudioController, GameController, GameMap } from '$lib/game/types.js'
	import type { GameState } from '$lib/game/types.js'
	import { createSavedMatch, createMatchWriter, type SavedMatch } from '$lib/game/saved-match'

	let { map, difficulty = null, connection, tutorial, resume, autosave = false, saveRaw = null, draft = false }: { map: GameMap; difficulty?: AiDifficulty | null; connection?: MatchConnection; tutorial?: TutorialScenario; resume?: SavedMatch; autosave?: boolean; saveRaw?: string | null; draft?: boolean } = $props()
	let saveError = $state<string | null>(null)
	let confirmRestart = $state(false)
	let sessionId = untrack(() => resume?.id ?? '')
	let writeSave: ReturnType<typeof createMatchWriter> | undefined
	let audio = $state<AudioController>()
	let game = $state<GameController>(untrack(() => createSession(resume)))
	const tutorialProgress = $derived(tutorial ? (game as TutorialController).progress : undefined)
	const title = $derived(draft ? `${translate(messages.map_draft)} · ${map.name}` : tutorial ? translate(messages[tutorial.title]) : mapName(map.id))
	const network = $derived(game.state.network)
	const localTurn = $derived(!network || network.player === game.state.player)
	const waiting = $derived(game.state.aiThinking || !localTurn || !!(network && network.phase !== 'playing') || !!tutorialProgress?.failed)
	let preferencesLoaded = $state(false)
	let earnedMedal = $state<Medal | null>(null)
	let recordedSession: GameController | undefined
	$effect(() => {
		if (draft || !preferencesLoaded || game.state.winner === null || recordedSession === game) return
		const session = game
		untrack(() => {
			recordedSession = session
			earnedMedal = recordVictory({ map: map.id, difficulty, winner: session.state.winner, tutorial: !!tutorial, online: !!connection })
		})
	})
	let showHelp = $state(false)
	let showPreview = $state(false)
	const previewCell = $derived(game.state.previewIndex === null ? undefined : game.state.cells[game.state.previewIndex])
	let gameElement = $state<HTMLElement>()
	const assetsReady = preloadGameAssets()

	function handleKeydown(event: KeyboardEvent) {
		const previousCell = selectedUnit(game.state)?.cell
		game.keydown(event)
		if (event.key === 'Escape' && !event.defaultPrevented && event.target instanceof Element && event.target.closest('.board')) {
			// Escape after cancelling selection leaves map navigation, so Tab can
			// reach the regular controls instead of trapping focus on units.
			gameElement?.querySelector<HTMLElement>('.action-controls .primary')?.focus({ preventScroll: true })
		}
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
		if (autosave && difficulty) {
			try {
				sessionId ||= crypto.randomUUID()
				writeSave = createMatchWriter(localStorage, saveRaw)
				checkpoint(game.state)
			} catch {
				saveError = 'storage'
			}
		}
		audio = createAudio()
		audio.setUnitSelectionEnabled(saved.unitSelectionSounds)
		void assetsReady.then(() => {
			if (mounted) game.start?.()
		})
		return () => {
			mounted = false
			audio?.dispose()
		}
	})

	onDestroy(() => game.dispose())

	// Observe completed human actions, including keyboard moves/cancel/capture.
	// The match controller checkpoints AI turns before and after the whole turn.
	$effect(() => {
		if (!preferencesLoaded || !autosave || game.state.aiThinking || game.state.fighting || game.state.moving) return
		$state.snapshot(game.state)
		untrack(() => checkpoint(game.state))
	})

	function checkpoint(state: GameState) {
		if (!writeSave || !difficulty || saveError || state.fighting || state.moving) return
		try {
			writeSave(state.winner === null ? createSavedMatch(map, state, difficulty, sessionId) : null)
		} catch (error) {
			saveError = error instanceof Error && error.message === 'conflict' ? 'conflict' : 'storage'
		}
	}

	$effect(() => {
		audio?.setVolume(preferences.volume)
		audio?.setUnitSelectionEnabled(preferences.unitSelectionSounds)
		game.state.sound = preferences.volume > 0
	})

	$effect(() => {
		audio?.music(game.state.sound && game.state.music, game.state.player)
	})

	$effect(() => {
		const { keyboardLayout, sound, music } = game.state
		if (preferencesLoaded) untrack(() => updatePreferences({ keyboardLayout, sound, music }))
	})

	function createSession(saved?: SavedMatch) {
		const options = { aiDifficulty: difficulty, sound: (name: string) => audio?.sound(name), onCheckpoint: checkpoint }
		return tutorial ? createTutorialGame(map, tutorial, options) : createGame(map, options, connection, saved)
	}

	function requestRestart() {
		if (autosave && game.state.winner === null) confirmRestart = true
		else restart()
	}

	function restart() {
		confirmRestart = false
		if (connection) {
			game.requestRematch?.()
			return
		}
		const { keyboardLayout, sound, music } = game.state
		game.dispose()
		game = createSession()
		if (autosave) {
			sessionId = crypto.randomUUID()
			checkpoint(game.state)
		}
		earnedMedal = null
		game.state.keyboardLayout = keyboardLayout
		game.state.sound = sound
		game.state.music = music
		game.start?.()
	}
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:head>
	<title>Pixel’s War · {title}</title>
</svelte:head>

{#await assetsReady}
	<main class="game-shell loading" aria-busy="true">
		<p role="status">{translate(messages.loading_battlefield)}</p>
	</main>
{:then}
	<main
		bind:this={gameElement}
		class="game-shell"
		ondragstart={(event) => {
			if (event.target instanceof HTMLImageElement) event.preventDefault()
		}}
	>
		{#key game}
			{#key game.state.round}
				{#if !tutorial && game.state.winner === null && localTurn && (!network || network.phase === 'playing')}
					<TurnAnnouncement player={game.state.player} message={difficulty && game.state.player === 1 ? translate(messages.ai_turn) : difficulty || network ? translate(messages.your_turn) : translate(messages.player_turn, { player: game.state.player })} />
				{/if}
			{/key}
		{/key}
		{#snippet mapStatus()}
			<div class="match-status">
				<p class="combat-status" role="status">{game.state.fighting && !game.state.aiThinking ? translate(messages.combat_in_progress) : ''}</p>
				<div class="unit-footer" class:inactive={waiting} inert={waiting} aria-hidden={waiting}>
					<SelectedUnitStrip cell={previewCell} unit={previewCell ? unitAt(game.state, previewCell.index) : undefined} disabled={locked(game.state) || waiting || !!network?.pending} oninspect={() => (showPreview = true)} />
				</div>
			</div>
		{/snippet}
		<div class="field">
			<div class="board-column">
				<GameHeader name={title} aiMode={!!difficulty} state={game.state} onoptions={() => (showHelp = true)} />
				{#if tutorial && tutorialProgress}
					{#key game}<TutorialPanel state={game.state} scenario={tutorial} progress={tutorialProgress} onrestart={restart} />{/key}
				{/if}
				{#snippet boardDetails()}
					<div class="board-details">
						<div class="board-actions game-context-container">
							{@render mapStatus()}
							<Controls {game} aiMode={!!difficulty} inactive={!!tutorialProgress?.failed} bind:showHelp bind:showPreview onrestart={connection ? undefined : requestRestart} saveStatus={autosave ? (saveError ?? 'saved') : undefined} />
						</div>
					</div>
				{/snippet}
				<Board {game} aiMode={!!difficulty} name={title} {boardDetails} tutorialTarget={tutorial && tutorialProgress ? tutorialTarget(game.state, tutorial, tutorialProgress) : undefined} />
			</div>
		</div>
		{#if game.state.productionIndex !== null && !game.state.aiThinking && localTurn && (!network || network.phase === 'playing')}
			<ProductionModal {game} />
		{/if}
		{#if !tutorial && game.state.winner !== null && (!network || network.phase === 'playing')}
			<VictoryModal {earnedMedal} storageError={playerProfile.storageError} aiMode={!!difficulty} winner={game.state.winner} onrestart={restart} rematchRequested={network?.rematchRequested} opponentRematchRequested={network?.opponentRematchRequested} />
		{/if}
		{#if network && network.phase !== 'playing'}
			<Modal title={translate(network.phase === 'waiting' ? messages.online_waiting : messages.online_paused)}>
				<p>{translate(network.phase === 'waiting' ? messages.online_waiting_detail : messages.online_paused_detail)}</p>
				<a class="button primary" href={resolve('/', {})}>{translate(messages.choose_another_map)}</a>
			</Modal>
		{/if}
		{#if confirmRestart}
			<Modal title={translate(messages.save_replace_title)} onclose={() => (confirmRestart = false)}>
				<p>{translate(messages.save_discard_confirm)}</p>
				<button class="primary" onclick={restart}>{translate(messages.restart_game)}</button>
			</Modal>
		{/if}
		{#if saveError}<p class="save-error" role="alert">{translate(saveError === 'conflict' ? messages.save_conflict : messages.save_storage)}</p>{/if}
	</main>
{/await}

<style>
	.save-error {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		margin: 0;
		padding: 12px;
		background: var(--color-surface);
		border-top: 1px solid var(--color-accent);
	}
	.game-shell:has(:global(.turn-sweep)) :global(.unit-sprite),
	.game-shell:has(:global(.turn-sweep)) :global(.water-shimmer) {
		animation-play-state: paused;
	}
	.match-status {
		flex: 1 1 324px;
		min-width: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		column-gap: 16px;
		font-size: var(--font-size-ui);
		color: var(--color-accent);
	}
	.combat-status {
		margin: 0;
	}
	.combat-status {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.unit-footer {
		container: unit-footer / inline-size;
		display: flex;
		align-items: center;
		height: 75px;
		min-width: 0;
		color: var(--color-text);
	}
	.inactive {
		visibility: hidden;
	}
	.game-shell {
		--game-panel-inset: 16px;
		-webkit-user-select: none;
		user-select: none;
		width: 100%;
		margin: auto;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		gap: 8px;
		@media (max-width: 900px) {
			--game-panel-inset: 10px;
		}
	}

	.game-shell :global(input),
	.game-shell :global(textarea),
	.game-shell :global([contenteditable='true']) {
		-webkit-user-select: text;
		user-select: text;
	}
	.game-shell :global(img) {
		-webkit-user-drag: none;
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
		height: 100dvh;
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
	}
	.board-details {
		flex: none;
		width: 100%;
		background: rgb(0 0 0 / 15%);
		backdrop-filter: blur(6px);
	}
	.board-actions {
		padding: 16px var(--game-panel-inset);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	@media (max-width: 900px) {
		.board-actions {
			padding: 6px var(--game-panel-inset);
			gap: 8px;
			flex-wrap: nowrap;
		}
		.match-status {
			flex-basis: 44px;
			min-width: 44px;
		}
		.unit-footer {
			height: 44px;
		}
	}
</style>
