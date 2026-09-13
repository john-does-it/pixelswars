<script lang="ts">
	import { asset, resolve } from '$app/paths'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'

	let { state, name }: { state: GameState; name: string } = $props()
</script>

<header class:blue={state.player === 1} class:red={state.player === 2}>
	<a href={resolve('/', {})}>← Pixel’s War</a>
	<h1>{name}</h1>
	<div class="turn" class:player-one={state.player === 1} class:player-two={state.player === 2} aria-live="polite"><img src={asset(`/assets/units/infantry-${state.player}-fit.png`)} alt="" />{translate(messages.player, { player: state.player })} <span>{translate(messages.round, { round: state.round })}</span></div>
	<div class="budgets">
		<span><span class="player-one">{translate(messages.player, { player: 1 })}</span> <b>{state.money[1]}$</b></span>
		<span><span class="player-two">{translate(messages.player, { player: 2 })}</span> <b>{state.money[2]}$</b></span>
	</div>
</header>

<style>
	header {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px 20px;
		padding: 14px 0;
		border-bottom: 3px solid #71b9ee;
		margin-bottom: 20px;

		@media (max-width: 500px) {
			grid-template-columns: 1fr;
		}

		&.red {
			border-color: #f59b9b;
		}
	}

	h1 {
		grid-column: 1;
		font-size: 16px;
		margin: 0;
		font-weight: normal;
		color: #e5edf1;
	}

	a {
		font-weight: bold;
	}

	.turn {
		display: flex;
		align-items: center;
		gap: 8px;

		img {
			width: 28px;
			height: 28px;
			object-fit: contain;
			image-rendering: pixelated;
		}
		grid-column: 2;
		grid-row: 1;
		font-weight: bold;

		span {
			margin-left: 4px;
			color: #ffe985;
		}
	}

	.budgets {
		grid-column: 2;
		display: flex;
		gap: 16px;
		font-size: 14px;
	}

	.player-one {
		color: #8dcbff;
	}

	.player-two {
		color: #ffb3b1;
	}

	@media (max-width: 500px) {
		.turn,
		.budgets {
			grid-column: 1;
			grid-row: auto;
		}
	}
</style>
