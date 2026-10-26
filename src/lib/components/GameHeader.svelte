<script lang="ts">
	import { unitSpritePath } from '$lib/game/unit-sprites'
	import Sprite from './Sprite.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { matchPlayerName, translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'
	import UiIcon from './UiIcon.svelte'
	import PlayerBudgets from './PlayerBudgets.svelte'

	let { state, name, aiMode = false, onoptions }: { state: GameState; name: string; aiMode?: boolean; onoptions: () => void } = $props()
</script>

<header class="match-summary">
	<div class="summary-content game-context-container">
		<div class="summary-row">
			<div class="summary-details">
				<div class="turn" class:player-one={state.player === 1} class:player-two={state.player === 2} aria-live="polite">
					<Sprite src={unitSpritePath('infantry', state.player)} alt={matchPlayerName(state.player, aiMode, state.network?.player)} size="m" />
					<div class="turn-details"><span class="map-name pixel-heading">{name}</span><strong>{translate(messages.round, { round: state.round })}</strong></div>
				</div>
			</div>
			<button class="options-button pixel-icon-button" aria-label={translate(messages.options_and_help)} title={translate(messages.options_and_help)} aria-haspopup="dialog" onclick={onoptions}><UiIcon name="game-settings" /></button>
		</div>
		<PlayerBudgets {state} {aiMode} />
	</div>
</header>

<style>
	.match-summary {
		flex: none;
		width: 100%;
		background: var(--site-yellow);
		border-bottom: var(--interface-border) solid var(--site-plum);
	}
	.summary-content {
		padding: 16px var(--game-panel-inset);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.summary-row {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}
	.summary-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		gap: 8px 20px;
	}
	.options-button {
		display: grid;
		place-items: center;
		align-self: center;
		flex: none;
		width: 40px;
		height: 40px;
		padding: 0;
	}
	.turn {
		display: flex;
		align-items: center;
		min-width: 0;
		gap: 8px;
		font-weight: bold;
	}

	.turn-details {
		min-width: 0;
		display: grid;
		gap: 2px;
	}
	.map-name {
		--site-heading-outline: var(--interface-heading-outline);
		font-size: 28px;
		font-weight: 700;
		overflow-wrap: anywhere;
	}
	.turn-details strong {
		font-size: 20px;
		color: var(--site-plum);
	}
	.player-one {
		color: var(--player-blue);
	}
	.player-two {
		color: var(--player-red);
	}
	@media (max-width: 900px) {
		.map-name {
			font-size: 24px;
		}
		.summary-content {
			padding-block: 8px;
			gap: 8px;
		}
		.summary-details {
			gap: 4px 12px;
		}
		.turn {
			font-size: var(--font-size-ui);
		}
	}
</style>
