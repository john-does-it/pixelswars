<script lang="ts">
	import { asset } from '$app/paths'
	import Modal from './Modal.svelte'
	import { unitTypes, productionBuildings } from '$lib/game/catalog.js'
	import { purchaseStatus, productionBuilding } from '$lib/game/model.js'
	import type { GameController, ProductionBuildingId, UnitTypeId } from '$lib/game/types.js'

	let { game }: { game: GameController } = $props()
	const building = $derived(game.state.productionIndex === null ? null : (game.state.cells[game.state.productionIndex]?.building ?? null))
	const definition = $derived(building && building in productionBuildings ? productionBuildings[building as ProductionBuildingId] : null)
	const offers = $derived((Object.entries(unitTypes) as [UnitTypeId, (typeof unitTypes)[UnitTypeId]][]).filter(([id]) => productionBuilding(id) === building).sort(([, left], [, right]) => left.cost - right.cost))
</script>

{#if definition}
	<Modal title={definition.name} onclose={() => (game.state.productionIndex = null)}>
		<p role="status">Player {game.state.player} · Available: {game.state.money[game.state.player]}$</p>
		{#each offers as [id, type] (id)}
			{@const status = purchaseStatus(game.state, id)}
			<div class="offer" class:affordable={status.available} class:unavailable={!status.available}>
				<img src={asset(`/assets/units/${id}-${game.state.player}-fit.png`)} alt="" />
				<div>
					<strong>{type.name}</strong>
					<p>{type.cost}$</p>
					<small id="availability-{id}">{status.occupied ? `Free this ${definition.name.toLowerCase()} to build a unit` : status.missing ? `Need ${status.missing}$ more` : 'Available'}</small>
				</div>
				<button disabled={!status.available} aria-describedby="availability-{id}" onclick={() => game.buy(id)}>Buy {type.name}</button>
			</div>
		{/each}
	</Modal>
{/if}

<style>
	.offer {
		display: grid;
		grid-template-columns: 48px 1fr auto;
		gap: 12px;
		align-items: center;
		padding: 14px;
		border: 1px solid #91a6b4;
		border-radius: 5px;
		margin: 10px 0;

		@media (max-width: 430px) {
			grid-template-columns: 36px 1fr;
		}
	}

	.affordable {
		background: #17382c;
		border-color: #a7e6c8;
	}

	.unavailable {
		color: #dce6eb;

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
