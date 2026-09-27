<script lang="ts">
	import { asset, resolve } from '$app/paths'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { playerName, translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'

	let { state, name, onhelp, aiMode = false }: { state: GameState; name: string; onhelp: () => void; aiMode?: boolean } = $props()
</script>

<header class:blue={state.player === 1} class:red={state.player === 2}>
	<div class="header-navigation">
		<div class="map-heading">
			<a href={resolve('/', {})} aria-label="← Pixel’s War">← <span>Pixel’s War</span></a>
			<h1>{name}</h1>
		</div>
		<button class="options-button" aria-label={translate(messages.options_and_help)} title={translate(messages.options_and_help)} aria-haspopup="dialog" onclick={onhelp}><span aria-hidden="true">⚙</span></button>
	</div>
	<div class="match-summary">
		<div class="turn" class:player-one={state.player === 1} class:player-two={state.player === 2} aria-live="polite"><img src={asset(`/assets/units/infantry-${state.player}-fit.png`)} alt="" />{playerName(state.player, aiMode)} <span>{translate(messages.round, { round: state.round })}</span></div>
		<div class="budgets">
			<span><span class="player-one">{playerName(1, aiMode)}</span> <b>{state.money[1]}$</b></span>
			<span><span class="player-two">{playerName(2, aiMode)}</span> <b>{state.money[2]}$</b></span>
		</div>
	</div>
</header>

<style>
	header {
		padding: 12px 0;
		border-bottom: 3px solid #71b9ee;
		margin-bottom: 20px;
		&.red {
			border-color: #f59b9b;
		}
	}
	.header-navigation {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 4px;
	}
	.map-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 16px;
		min-width: 0;
	}
	a {
		font-weight: bold;
	}
	.options-button {
		flex-shrink: 0;
		width: 44px;
		min-height: 44px;
		padding: 0;
		font-size: 24px;
	}
	.match-summary {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 8px 20px;
	}
	h1 {
		font-size: 14px;
		margin: 0;
		font-weight: normal;
		color: #e5edf1;
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
			color: #ffe985;
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
			margin-bottom: 12px;
		}
		.match-summary {
			gap: 4px 12px;
		}
		h1 {
			font-size: 12px;
			line-height: 1.5;
		}
		.turn,
		.budgets {
			font-size: 12px;
		}
		.budgets {
			justify-content: flex-start;
		}
	}
</style>
