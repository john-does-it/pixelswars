<script>
	import { base } from '$app/paths'

	let { state, name } = $props()
</script>

<header class:blue={state.player === 1} class:red={state.player === 2}>
	<a href="{base}/">← Pixel’s War</a>
	<h1>{name}</h1>
	<div class="turn" aria-live="polite">Player {state.player} <span>Round {state.round}</span></div>
	<div class="budgets">
		<span>Player 1: <b>{state.money[1]}$</b></span>
		<span>Player 2: <b>{state.money[2]}$</b></span>
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
		color: #c0cbd0;
	}

	a {
		font-weight: bold;
	}

	.turn {
		grid-column: 2;
		grid-row: 1;
		font-weight: bold;

		span {
			margin-left: 12px;
			color: #ffe985;
		}
	}

	.budgets {
		grid-column: 2;
		display: flex;
		gap: 16px;
		font-size: 14px;
	}

	@media (max-width: 500px) {
		.turn,
		.budgets {
			grid-column: 1;
			grid-row: auto;
		}
	}
</style>
