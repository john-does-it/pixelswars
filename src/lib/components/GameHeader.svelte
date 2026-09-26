<script lang="ts">
	import { asset, resolve } from '$app/paths'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { playerName, translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'

	let { state, name, onhelp, aiMode = false }: { state: GameState; name: string; onhelp: () => void; aiMode?: boolean } = $props()
</script>

<header class:blue={state.player === 1} class:red={state.player === 2}>
	<div class="header-navigation">
		<a href={resolve('/', {})} aria-label="← Pixel’s War">← <span>Pixel’s War</span></a>
		<button class="options-button" aria-label={translate(messages.options_and_help)} title={translate(messages.options_and_help)} aria-haspopup="dialog" onclick={onhelp}><span aria-hidden="true">⚙</span></button>
	</div>
	<div class="match-summary">
		<h1>{name}</h1>
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
		gap: 16px;
		margin-bottom: 12px;
	}
	a {
		font-weight: bold;
	}
	.options-button {
		width: 44px;
		min-height: 44px;
		padding: 0;
		font-size: 24px;
	}
	.match-summary {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px 20px;
	}
	h1 {
		font-size: 16px;
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
		grid-column: 1 / -1;
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
		.header-navigation {
			margin-bottom: 8px;
		}
		.match-summary {
			grid-template-columns: minmax(0, 1fr);
			gap: 8px;
		}
		h1 {
			font-size: 14px;
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
