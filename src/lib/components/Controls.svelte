<script lang="ts">
	import { resolve } from '$app/paths'
	import { selectedUnit, canCapture, locked } from '#lib/game/model.js'
	import { hasAvailableAction } from '#lib/game/available-actions.js'
	import { m as messages } from '#lib/paraglide/messages.js'
	import { translate } from '#lib/i18n.svelte.js'
	import { preferences, updatePreferences } from '#lib/preferences.svelte.js'
	import type { GameController, KeyboardLayout } from '#lib/game/types.js'
	import HowToPlayModal from './HowToPlayModal.svelte'
	import PreferencesPanel from './site/PreferencesPanel.svelte'
	import StatsPanel from './StatsPanel.svelte'
	import Modal from './Modal.svelte'
	import UiIcon from './UiIcon.svelte'
	import CargoTray from './CargoTray.svelte'

	let { game, aiMode = false, inactive = false, showHelp = $bindable(false), showPreview = $bindable(false), onrestart, saveStatus }: { game: GameController; aiMode?: boolean; inactive?: boolean; showHelp?: boolean; showPreview?: boolean; onrestart?: () => void; saveStatus?: string } = $props()
	const gameState = $derived(game.state)
	let pendingEndTurn = $state<{ game: GameController; round: number } | null>(null)
	const selected = $derived(selectedUnit(gameState))
	const previewCell = $derived(gameState.previewIndex === null ? undefined : gameState.cells[gameState.previewIndex])

	const inputLocked = $derived(locked(gameState) || gameState.aiThinking || !!gameState.network?.pending)
	const waiting = $derived(inactive || gameState.aiThinking || (gameState.network && (gameState.network.phase !== 'playing' || gameState.player !== gameState.network.player)))
	const captureLabel = $derived(translate(selected && gameState.cells[selected.cell].owner === gameState.player && gameState.cells[selected.cell].capturePoints < 20 ? messages.secure : messages.capture))
	$effect(() => {
		if (waiting || !previewCell) showPreview = false
	})
	$effect(() => {
		if (pendingEndTurn && (pendingEndTurn.game !== game || pendingEndTurn.round !== gameState.round || inputLocked || waiting || showHelp)) pendingEndTurn = null
	})

	function requestEndTurn() {
		if (inputLocked || waiting) return

		if (preferences.confirmEndTurn && hasAvailableAction(gameState)) pendingEndTurn = { game, round: gameState.round }
		else game.endTurn()
	}

	function confirmEndTurn() {
		const pending = pendingEndTurn
		pendingEndTurn = null
		if (pending?.game === game && pending.round === gameState.round && !inputLocked && !waiting) game.endTurn()
	}

	function setKeyboardLayout(layout: KeyboardLayout) {
		gameState.keyboardLayout = layout
		updatePreferences({ keyboardLayout: layout })
	}

	function changeKeyboardLayout(layout: string) {
		if (layout === 'azerty' || layout === 'qwerty') setKeyboardLayout(layout)
	}

	function handleShortcuts(event: KeyboardEvent) {
		if (event.repeat || event.isComposing || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return
		if (inputLocked || waiting || showHelp || showPreview || pendingEndTurn) return
		const target = event.target instanceof Element ? event.target : null
		if (target?.closest('dialog, input, textarea, select') || (target instanceof HTMLElement && target.isContentEditable)) return
		if (event.key === 'End' && target?.closest('.board')) {
			event.preventDefault()
			requestEndTurn()
			return
		}
		if (event.key.toLowerCase() !== 'i' || !previewCell) return
		event.preventDefault()
		showPreview = true
	}
</script>

<svelte:window onkeydown={handleShortcuts} />

<nav aria-label={translate(messages.game_controls)} class:waiting={!!waiting} aria-hidden={!!waiting} inert={!!waiting}>
	<div class="action-controls">
		<!-- Remote selections must not change the size of the hidden action bar. -->
		{#if !waiting}
			<CargoTray {game} disabled={inputLocked} />
			{#if selected}
				<button class="pixel-icon-button" disabled={inputLocked} aria-label={translate(messages.cancel_move)} title={translate(messages.cancel_move)} onclick={() => game.cancel()}>
					<UiIcon name="previous-action" />
				</button>
				<button class="pixel-icon-button" disabled={inputLocked} aria-label={translate(messages.confirm_move)} title={translate(messages.confirm_move)} onclick={() => game.confirm()}>
					<UiIcon name="validate-action" />
				</button>
			{/if}
			{#if canCapture(gameState)}
				<button class="pixel-icon-button" disabled={inputLocked} aria-label={captureLabel} title={captureLabel} onclick={() => game.capture()}>
					<UiIcon name="icon-capture" />
				</button>
			{/if}
		{/if}
		<button class="primary" disabled={inputLocked} aria-label={translate(messages.end_round)} aria-keyshortcuts="End" title={`${translate(messages.end_round)} (${translate(messages.key_end)})`} onclick={requestEndTurn}>
			{translate(messages.end_round)}
		</button>
	</div>
</nav>
{#if pendingEndTurn}
	<Modal title={translate(messages.end_round)} alwaysShowScrollbar={false} onclose={() => (pendingEndTurn = null)}>
		<p>{translate(messages.end_turn_warning)}</p>
		<div class="confirmation-actions">
			<button onclick={() => (pendingEndTurn = null)}>{translate(messages.answer_no)}</button>
			<button class="primary" onclick={confirmEndTurn}>{translate(messages.answer_yes)}</button>
		</div>
	</Modal>
{/if}
{#if showPreview && previewCell}
	<Modal title={translate(messages.cell_statistics)} alwaysShowScrollbar={false} onclose={() => (showPreview = false)}>
		<StatsPanel state={gameState} />
	</Modal>
{/if}
{#if showHelp}
	<HowToPlayModal keyboardLayout={gameState.keyboardLayout} onclose={() => (showHelp = false)}>
		{#snippet actions()}
			{#if saveStatus && saveStatus !== 'saved'}<p>{translate(saveStatus === 'conflict' ? messages.save_conflict : messages.save_storage)}</p>{/if}
			<div class="match-actions">
				<a class="button map-selection" href={resolve('/')}>{translate(messages.choose_another_map)}</a>
				{#if onrestart}
					<button
						onclick={() => {
							showHelp = false
							showPreview = false
							onrestart?.()
						}}>{translate(messages.restart_game)}</button
					>
				{/if}
			</div>
		{/snippet}
		{#snippet settings()}<PreferencesPanel onmusic={(value) => (gameState.music = value)} onkeyboard={changeKeyboardLayout} />{/snippet}
	</HowToPlayModal>
{/if}

<style>
	.confirmation-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 16px;
	}
	.match-actions {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 8px;
		margin-bottom: 24px;
		a,
		button {
			display: flex;
			align-items: center;
			justify-content: center;
			text-align: center;
		}
	}

	nav {
		width: auto;
		max-width: 100%;
		margin-left: auto;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 8px;

		&.waiting {
			visibility: hidden;
		}
	}

	.action-controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 4px;
		button {
			display: grid;
			place-items: center;
			flex: 0 0 48px;
			width: 48px;
			height: 48px;
			padding: 0;
		}
		.primary {
			flex-basis: auto;
			flex-shrink: 1;
			min-width: 0;
			width: auto;
			padding-inline: 14px;
			padding-bottom: 2px;
			white-space: nowrap;
		}
	}

	@media (max-width: 900px) {
		.action-controls {
			width: min(100%, 480px);
			flex-wrap: nowrap;
			justify-content: flex-end;
			.primary {
				white-space: normal;
				line-height: 1.1;
			}
		}
	}
	@media (max-width: 480px) {
		.action-controls {
			gap: 2px;
			.primary {
				padding-inline: 6px;
			}
			button:not(.primary) {
				flex-basis: 40px;
				width: 40px;
			}
		}
	}
	@media (max-width: 360px) {
		nav {
			min-width: 0;
		}
		.action-controls {
			flex-wrap: wrap;
			button:not(.primary) {
				flex-basis: 36px;
				width: 36px;
			}
		}
	}
</style>
