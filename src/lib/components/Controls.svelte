<script lang="ts">
	import { asset } from '$app/paths'
	import { selectedUnit, canCapture, locked } from '$lib/game/model.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import { updatePreferences } from '$lib/preferences.svelte.js'
	import type { GameController, KeyboardLayout } from '$lib/game/types.js'
	import HowToPlayModal from './HowToPlayModal.svelte'
	import LanguageSelect from './LanguageSelect.svelte'
	import SettingSelect from './SettingSelect.svelte'

	let { game, showHelp = $bindable(false), controlsHeight = $bindable(0) }: { game: GameController; showHelp?: boolean; controlsHeight?: number } = $props()
	const gameState = $derived(game.state)
	const selected = $derived(selectedUnit(gameState))
	const inputLocked = $derived(locked(gameState) || gameState.aiThinking || !!gameState.network?.pending)
	const waiting = $derived(gameState.aiThinking || (gameState.network && (gameState.network.phase !== 'playing' || gameState.player !== gameState.network.player)))

	function setKeyboardLayout(layout: KeyboardLayout) {
		gameState.keyboardLayout = layout
		updatePreferences({ keyboardLayout: layout })
	}

	function changeKeyboardLayout(layout: string) {
		if (layout === 'azerty' || layout === 'qwerty') setKeyboardLayout(layout)
	}
</script>

<nav aria-label={translate(messages.game_controls)} bind:clientHeight={controlsHeight} hidden={!!waiting}>
	<div class="action-controls">
		{#if selected}
			<button disabled={inputLocked} onclick={() => game.cancel()}>{translate(messages.cancel_move)}</button>
			<button disabled={inputLocked} onclick={() => game.confirm()}>{translate(messages.confirm_move)}</button>
		{/if}
		{#if canCapture(gameState)}
			<button disabled={inputLocked} onclick={() => game.capture()}>{translate(selected && gameState.cells[selected.cell].owner === gameState.player && gameState.cells[selected.cell].capturePoints < 20 ? messages.secure : messages.capture)}</button>
		{/if}
		<button class="primary" disabled={inputLocked} onclick={() => game.endTurn()}>{translate(messages.end_round)}</button>
	</div>
</nav>
{#if showHelp}
	<HowToPlayModal keyboardLayout={gameState.keyboardLayout} onclose={() => (showHelp = false)}>
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
{#if gameState.fighting && !gameState.aiThinking}
	<p role="status">{translate(messages.combat_in_progress)}</p>
{/if}

<style>
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

		&[hidden] {
			display: none;
		}
	}

	.action-controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 8px;
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
			justify-content: center;
		}

		.action-controls {
			width: min(100%, 600px);
			justify-content: center;

			button {
				flex: 1 1 auto;
				min-height: 44px;
			}
		}
	}

	[role='status'] {
		text-align: center;
		color: var(--color-accent);
	}
</style>
