<script lang="ts">
	import { asset } from '$app/paths'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { playerName, translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'

	let { state, aiMode = false }: { state: GameState; aiMode?: boolean } = $props()
</script>

<header class:blue={state.player === 1} class:red={state.player === 2}>
	<div class="match-summary">
		<div class="turn" class:player-one={state.player === 1} class:player-two={state.player === 2} aria-live="polite">
			<img src={asset(`/assets/units/infantry-${state.player}-fit.png`)} alt="" />{playerName(state.player, aiMode)}
			<span>{translate(messages.round, { round: state.round })}</span>
		</div>
		<div class="budgets">
			<span><span class="player-one">{playerName(1, aiMode)}</span> <b>{state.money[1]}$</b></span>
			<span><span class="player-two">{playerName(2, aiMode)}</span> <b>{state.money[2]}$</b></span>
		</div>
	</div>
</header>

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 20;
		background: var(--color-background);
		padding: 8px 0;
		border-bottom: 3px solid #71b9ee;
		margin-bottom: 0;
		&.red {
			border-color: #f59b9b;
		}
	}
	.match-summary {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 8px 20px;
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
		header {
			padding: 8px 0;
			margin-bottom: 0;
		}
		.match-summary {
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
