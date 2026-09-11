<script>
	import { base } from '$app/paths'
	import Modal from './Modal.svelte'
	import { unitTypes } from '$lib/game/catalog.js'
	import { purchaseStatus } from '$lib/game/model.js'

	let { game } = $props()
</script>

<Modal title="Factory" onclose={() => (game.state.factoryIndex = null)}>
	<p role="status">Player {game.state.player} · Available: {game.state.money[game.state.player]}$</p>
	{#each Object.entries(unitTypes) as [id, type] (id)}
		{@const status = purchaseStatus(game.state, id)}
		<div class="offer" class:affordable={status.available} class:unavailable={!status.available}>
			<img src="{base}/assets/units/{id}-{game.state.player}.png" alt="" />
			<div>
				<strong>{type.name}</strong>
				<p>{type.cost}$</p>
				<small id="availability-{id}">{status.occupied ? 'Free this factory to build a unit' : status.missing ? `Need ${status.missing}$ more` : 'Available'}</small>
			</div>
			<button disabled={!status.available} aria-describedby="availability-{id}" onclick={() => game.buy(id)}>Buy {type.name}</button>
		</div>
	{/each}
</Modal>

<style>
	.offer {
		display: grid;
		grid-template-columns: 48px 1fr auto;
		gap: 12px;
		align-items: center;
		padding: 14px 8px;
		border: 1px solid #56636d;
		border-radius: 5px;
		margin: 10px 0;

		@media (max-width: 430px) {
			grid-template-columns: 36px 1fr;
		}
	}

	.affordable {
		background: #294038;
		border-color: #8dc4a7;
	}

	.unavailable {
		color: #b3bac1;

		img {
			opacity: 0.45;
			filter: grayscale(1);
		}
	}

	img {
		width: 48px;
		image-rendering: pixelated;

		@media (max-width: 430px) {
			width: 36px;
		}
	}

	p {
		margin: 5px 0;
	}

	small {
		display: block;
		font-size: 12px;
	}

	@media (max-width: 430px) {
		.offer button {
			grid-column: 2;
		}
	}
</style>
