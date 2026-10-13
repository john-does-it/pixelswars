<script lang="ts">
	import { asset } from '$lib/game/asset-path'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { playerName, translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'
	import UiIcon from './UiIcon.svelte'

	let { state, name, aiMode = false, onoptions }: { state: GameState; name: string; aiMode?: boolean; onoptions: () => void } = $props()
</script>

<header class="match-summary game-context-container">
	<div class="summary-details">
		<div class="turn" class:player-one={state.player === 1} class:player-two={state.player === 2} aria-live="polite">
			<img src={asset(`/assets/units/infantry-${state.player}-fit.png`)} alt={playerName(state.player, aiMode)} />
			<div class="turn-details"><span class="map-name">{name}</span><strong>{translate(messages.round, { round: state.round })}</strong></div>
		</div>
	</div>
	<button class="options-button pixel-icon-button" aria-label={translate(messages.options_and_help)} title={translate(messages.options_and_help)} aria-haspopup="dialog" onclick={onoptions}><UiIcon name="game-settings" /></button>
</header>

<style>
	.match-summary {
		flex: none;
		padding: 16px var(--game-gutter);
		background: rgb(0 0 0 / 15%);
		backdrop-filter: blur(6px);
		width: calc(100% - 2 * var(--game-gutter));
		margin-top: 12px;
		border-radius: 12px;
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
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 8px;
		font-weight: bold;
		img {
			width: 44px;
			height: 44px;
			object-fit: contain;
			image-rendering: pixelated;
		}
		span {
			color: var(--color-accent);
		}
	}

	.turn-details {
		display: grid;
		gap: 2px;
	}
	.map-name {
		font-weight: 400;
	}
	.turn-details strong {
		font-size: 20px;
		color: var(--color-accent);
	}
	.player-one {
		color: #8dcbff;
	}
	.player-two {
		color: #ffb3b1;
	}
	@media (max-width: 900px) {
		.match-summary {
			padding-block: 8px;
		}
		.summary-details {
			gap: 4px 12px;
		}
		.turn {
			font-size: var(--font-size-ui);
		}
	}
</style>
