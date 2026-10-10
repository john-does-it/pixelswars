<script lang="ts">
	import { asset } from '$app/paths'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { playerName, translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'
	import UiIcon from './UiIcon.svelte'

	let { state, aiMode = false, onoptions }: { state: GameState; aiMode?: boolean; onoptions: () => void } = $props()
</script>

<header class="match-summary">
	<div class="summary-details">
		<div class="turn" class:player-one={state.player === 1} class:player-two={state.player === 2} aria-live="polite">
			<img src={asset(`/assets/units/infantry-${state.player}-fit.png`)} alt="" />{playerName(state.player, aiMode)}
			<span>{translate(messages.round, { round: state.round })}</span>
		</div>
		<div class="budgets">
			<span><span class="player-one">{playerName(1, aiMode)}</span> <b>{state.money[1]}$</b></span>
			<span><span class="player-two">{playerName(2, aiMode)}</span> <b>{state.money[2]}$</b></span>
		</div>
	</div>
	<button class="options-button pixel-icon-button" aria-label={translate(messages.options_and_help)} title={translate(messages.options_and_help)} aria-haspopup="dialog" onclick={onoptions}><UiIcon name="game-settings" /></button>
</header>

<style>
	.match-summary {
		flex: none;
		padding: 16px var(--game-gutter);
		background: var(--color-background);
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.summary-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 8px 20px;
	}
	.options-button {
		display: grid;
		place-items: center;
		flex: none;
		width: 40px;
		height: 40px;
		padding: 0;
	}
	.turn {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		font-weight: bold;
		img {
			width: 28px;
			height: 28px;
			object-fit: contain;
			image-rendering: pixelated;
		}
		span {
			color: var(--color-accent);
		}
	}
	.budgets {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 8px 16px;
		font-size: 14px;
	}
	.player-one {
		color: #8dcbff;
	}
	.player-two {
		color: #ffb3b1;
	}
	@media (max-width: 900px) {
		.summary-details {
			gap: 4px 12px;
		}
		.turn,
		.budgets {
			font-size: 14px;
		}
		.budgets {
			justify-content: flex-start;
		}
	}
</style>
