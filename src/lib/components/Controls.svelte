<script lang="ts">
	import { asset, resolve } from '$app/paths'
	import { selectedUnit, unitAt, canCapture, locked } from '$lib/game/model.js'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import { preferences, updatePreferences } from '$lib/preferences.svelte.js'
	import type { GameController, KeyboardLayout } from '$lib/game/types.js'
	import HowToPlayModal from './HowToPlayModal.svelte'
	import LanguageSelect from './LanguageSelect.svelte'
	import SettingSelect from './SettingSelect.svelte'
	import TerrainIcon from './TerrainIcon.svelte'
	import StatsPanel from './StatsPanel.svelte'
	import Modal from './Modal.svelte'

	let { game, aiMode = false, showHelp = $bindable(false), controlsHeight = $bindable(0), onrestart }: { game: GameController; aiMode?: boolean; showHelp?: boolean; controlsHeight?: number; onrestart?: () => void } = $props()
	let showPreview = $state(false)
	const gameState = $derived(game.state)
	const selected = $derived(selectedUnit(gameState))
	const previewCell = $derived(gameState.previewIndex === null ? undefined : gameState.cells[gameState.previewIndex])
	const previewUnit = $derived(previewCell && unitAt(gameState, previewCell.index))

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
</script>

<nav aria-label={translate(messages.game_controls)} bind:offsetHeight={controlsHeight} class:waiting={!!waiting} aria-hidden={!!waiting} inert={!!waiting}>
	<div class="action-controls">
		{#if previewCell}
			<button class="inspect-action" disabled={inputLocked} aria-label={translate(messages.preview_expand)} title={translate(messages.preview_expand)} aria-haspopup="dialog" onclick={() => (showPreview = true)}>
				<span class="tile-thumbnail" aria-hidden="true">
					<TerrainIcon cell={previewCell} size="fill" />
					{#if previewUnit}<img src={asset(unitSprite(previewUnit))} alt="" />{/if}
					<span class="info-badge">i</span>
				</span>
			</button>
		{/if}
		{#if selected}
			<button disabled={inputLocked} aria-label={translate(messages.cancel_move)} title={translate(messages.cancel_move)} onclick={() => game.cancel()}>
				<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4-5 5 5 5M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
			</button>
			<button disabled={inputLocked} aria-label={translate(messages.confirm_move)} title={translate(messages.confirm_move)} onclick={() => game.confirm()}>
				<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
			</button>
		{/if}
		{#if canCapture(gameState)}
			<button disabled={inputLocked} aria-label={captureLabel} title={captureLabel} onclick={() => game.capture()}>
				<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3h14l-3 5 3 5H5" /></svg>
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
				<button class="audio" aria-label={translate(gameState.sound ? messages.sound_on : messages.sound_off)} title={translate(gameState.sound ? messages.sound_on : messages.sound_off)} aria-pressed={gameState.sound} onclick={() => (gameState.sound = !gameState.sound)}>
					{translate(messages.sound)}
					<img src={asset(`/assets/icons/icon-${gameState.sound ? 'play' : 'mute'}-sound.png`)} alt="" />
				</button>
				<button class="audio" disabled={!gameState.sound} aria-label={translate(gameState.music ? messages.music_on : messages.music_off)} title={translate(gameState.music ? messages.music_on : messages.music_off)} aria-pressed={gameState.music} onclick={() => (gameState.music = !gameState.music)}>
					{translate(messages.music)}
					<img src={asset(`/assets/icons/icon-${gameState.music ? 'play' : 'mute'}-sound.png`)} alt="" />
				</button>
				<LanguageSelect compact />
				<button aria-label={translate(preferences.animations ? messages.animations_on : messages.animations_off)} aria-pressed={preferences.animations} onclick={() => updatePreferences({ animations: !preferences.animations })}>
					{translate(messages.animations)} · {translate(preferences.animations ? messages.setting_on : messages.setting_off)}
				</button>
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

	.audio {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.audio img {
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

		&.waiting {
			visibility: hidden;
		}
	}

	.action-controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 8px;
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
			white-space: nowrap;
		}
	}
	.tile-thumbnail {
		position: relative;
		display: block;
		width: 34px;
		height: 34px;
		pointer-events: none;
		img {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			image-rendering: pixelated;
		}
	}
	.info-badge {
		position: absolute;
		right: -3px;
		bottom: -3px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--color-accent);
		color: var(--color-background);
		font-size: 12px;
		font-weight: bold;
		line-height: 16px;
		text-align: center;
	}
	.action-icon {
		display: block;
		width: 24px;
		height: 24px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	@media (max-width: 900px) {
		nav {
			position: fixed;
			inset: auto 0 0;
			z-index: 10;
			padding: 10px max(12px, env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
			border-top: 1px solid var(--color-border);
			background: color-mix(in srgb, var(--color-surface) 96%, transparent);
			box-shadow: 0 -4px 16px #0005;
			justify-content: flex-end;
		}

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
			gap: 4px;
			button:not(.primary) {
				flex-basis: 40px;
				width: 40px;
			}
		}
		.tile-thumbnail {
			width: 28px;
			height: 28px;
		}
	}
	@media (max-width: 360px) {
		.action-controls {
			gap: 4px;
			button:not(.primary) {
				flex-basis: 36px;
				width: 36px;
			}
			.primary {
				padding-inline: 6px;
				font-size: 13px;
			}
		}
	}
</style>
