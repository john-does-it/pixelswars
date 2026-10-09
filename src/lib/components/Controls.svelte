<script lang="ts">
	import { resolve } from '$app/paths'
	import { selectedUnit, canCapture, locked } from '$lib/game/model.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import { preferences, updatePreferences } from '$lib/preferences.svelte.js'
	import type { GameController, KeyboardLayout } from '$lib/game/types.js'
	import HowToPlayModal from './HowToPlayModal.svelte'
	import LanguageSelect from './LanguageSelect.svelte'
	import SettingSelect from './SettingSelect.svelte'
	import StatsPanel from './StatsPanel.svelte'
	import Modal from './Modal.svelte'
	import UiIcon from './UiIcon.svelte'

	let { game, aiMode = false, showHelp = $bindable(false), showPreview = $bindable(false), onrestart }: { game: GameController; aiMode?: boolean; showHelp?: boolean; showPreview?: boolean; onrestart?: () => void } = $props()
	const gameState = $derived(game.state)
	const selected = $derived(selectedUnit(gameState))
	const previewCell = $derived(gameState.previewIndex === null ? undefined : gameState.cells[gameState.previewIndex])

	const inputLocked = $derived(locked(gameState) || gameState.aiThinking || !!gameState.network?.pending)
	const waiting = $derived(gameState.aiThinking || (gameState.network && (gameState.network.phase !== 'playing' || gameState.player !== gameState.network.player)))
	const captureLabel = $derived(translate(selected && gameState.cells[selected.cell].owner === gameState.player && gameState.cells[selected.cell].capturePoints < 20 ? messages.secure : messages.capture))
	$effect(() => {
		if (waiting || !previewCell) showPreview = false
	})

	function setKeyboardLayout(layout: KeyboardLayout) {
		gameState.keyboardLayout = layout
		updatePreferences({ keyboardLayout: layout })
	}

	function changeKeyboardLayout(layout: string) {
		if (layout === 'azerty' || layout === 'qwerty') setKeyboardLayout(layout)
	}

	function openStatsWithKeyboard(event: KeyboardEvent) {
		if (event.key.toLowerCase() !== 'i' || event.repeat || event.isComposing || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return
		if (!previewCell || inputLocked || waiting || showHelp || showPreview) return
		const target = event.target instanceof Element ? event.target : null
		if (target?.closest('dialog, input, textarea, select') || (target instanceof HTMLElement && target.isContentEditable)) return
		event.preventDefault()
		showPreview = true
	}
</script>

<svelte:window onkeydown={openStatsWithKeyboard} />

<nav aria-label={translate(messages.game_controls)} class:waiting={!!waiting} aria-hidden={!!waiting} inert={!!waiting}>
	<div class="action-controls">
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
		<button class="primary" disabled={inputLocked} aria-label={translate(messages.end_round)} title={translate(messages.end_round)} onclick={() => game.endTurn()}>
			{translate(messages.end_round)}
		</button>
	</div>
</nav>
{#if showPreview && previewCell}
	<Modal title={translate(messages.cell_statistics)} alwaysShowScrollbar={false} onclose={() => (showPreview = false)}>
		<StatsPanel state={gameState} {aiMode} />
	</Modal>
{/if}
{#if showHelp}
	<HowToPlayModal keyboardLayout={gameState.keyboardLayout} onclose={() => (showHelp = false)}>
		{#snippet actions()}
			<div class="match-actions">
				<a class="button map-selection" href={resolve('/', {})}>{translate(messages.choose_another_map)}</a>
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
		{#snippet settings()}
			<div class="settings-controls">
				<div class="audio volume-control">
					<button class="pixel-icon-button" aria-label={translate(preferences.volume > 0 ? messages.sound_on : messages.sound_off)} title={translate(preferences.volume > 0 ? messages.sound_on : messages.sound_off)} aria-pressed={preferences.volume > 0} onclick={() => updatePreferences({ volume: preferences.volume > 0 ? 0 : 100, sound: preferences.volume === 0 })}>
						<UiIcon name={preferences.volume > 0 ? 'icon-play-sound' : 'icon-mute-sound'} />
					</button>
					<label for="sound-volume">{translate(messages.sound)}</label>
					<input id="sound-volume" type="range" min="0" max="100" step="5" value={preferences.volume} aria-label={translate(messages.sound)} aria-valuetext={`${preferences.volume}%`} oninput={(event) => updatePreferences({ volume: event.currentTarget.valueAsNumber, sound: event.currentTarget.valueAsNumber > 0 })} />
					<output aria-hidden="true">{preferences.volume}%</output>
				</div>
				<button class="audio pixel-icon-control" disabled={!gameState.sound} aria-label={translate(gameState.music ? messages.music_on : messages.music_off)} title={translate(gameState.music ? messages.music_on : messages.music_off)} aria-pressed={gameState.music} onclick={() => (gameState.music = !gameState.music)}>
					{translate(messages.music)}
					<UiIcon name={gameState.music ? 'icon-play-sound' : 'icon-mute-sound'} />
				</button>
				<div class="preference-controls">
					<LanguageSelect compact />
					<SettingSelect
						label={translate(messages.animations)}
						value={preferences.animations ? 'on' : 'off'}
						options={[
							{ value: 'on', label: translate(messages.setting_on) },
							{ value: 'off', label: translate(messages.setting_off) }
						]}
						onchange={(value) => updatePreferences({ animations: value === 'on' })}
					/>
					<SettingSelect
						label={translate(messages.keyboard)}
						ariaLabel={translate(messages.keyboard_movement_layout)}
						value={gameState.keyboardLayout}
						options={[
							{ value: 'azerty', label: 'AZERTY · ZQSD' },
							{ value: 'qwerty', label: 'QWERTY · WASD' }
						]}
						onchange={changeKeyboardLayout}
					/>
				</div>
			</div>
		{/snippet}
	</HowToPlayModal>
{/if}

<style>
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
	.settings-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.preference-controls {
		display: grid;
		gap: 10px;
		width: 100%;
		:global(label) {
			display: grid;
			grid-template-columns: 100px minmax(0, 1fr);
			width: min(100%, 320px);
		}
		:global(select) {
			width: 100%;
			min-width: 0;
		}
	}

	.audio {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.volume-control {
		font: 700 16px / 1.5 var(--font-display);
		min-height: 44px;
		max-width: 100%;
		flex-wrap: wrap;
		padding-inline: 0;
	}
	.volume-control input {
		width: 110px;
		min-height: 44px;
		margin: 0;
	}
	.volume-control output {
		min-width: 4ch;
		text-align: right;
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
			}
		}
	}
	@media (max-width: 480px) {
		.action-controls {
			gap: 2px;
			button:not(.primary) {
				flex-basis: 40px;
				width: 40px;
			}
		}
	}
	@media (max-width: 360px) {
		.action-controls {
			button:not(.primary) {
				flex-basis: 36px;
				width: 36px;
			}
			.primary {
				padding-inline: 6px;
			}
		}
	}
</style>
