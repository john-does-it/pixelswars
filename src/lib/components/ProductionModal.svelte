<script lang="ts">
	import { unitSpritePath } from '#lib/game/unit-sprites.js'
	import Sprite from './Sprite.svelte'
	import Modal from './Modal.svelte'
	import { unitTypes, productionBuildings } from '#lib/game/catalog.js'
	import { purchaseStatus, productionBuilding } from '#lib/game/model.js'
	import { m as messages } from '#lib/paraglide/messages.js'
	import { buildingName, translate, unitName } from '#lib/i18n.svelte.js'
	import type { GameController, ProductionBuildingId, UnitTypeId } from '#lib/game/types.js'

	let { game }: { game: GameController } = $props()
	const building = $derived(game.state.productionIndex === null ? null : (game.state.cells[game.state.productionIndex]?.building ?? null))
	const definition = $derived(building && building in productionBuildings ? productionBuildings[building as ProductionBuildingId] : null)
	const offers = $derived((Object.entries(unitTypes) as [UnitTypeId, (typeof unitTypes)[UnitTypeId]][]).filter(([id]) => productionBuilding(id) === building).sort(([, left], [, right]) => left.cost - right.cost))
</script>

{#if definition}
	<Modal title={buildingName(building as ProductionBuildingId)} onclose={() => game.closeProduction()}>
		<p role="status">{translate(messages.available_money, { player: game.state.player, money: game.state.money[game.state.player] })}</p>
		{#each offers as [id, type] (id)}
			{@const status = purchaseStatus(game.state, id)}
			<div class="offer" class:affordable={status.available} class:unavailable={!status.available}>
				<Sprite src={unitSpritePath(id, game.state.player)} size="m" />
				<div>
					<strong>{unitName(id)}</strong>
					<p>{type.cost}$</p>
					<small id="availability-{id}">{status.occupied ? translate(messages.free_building) : status.missing ? translate(messages.need_more, { money: status.missing }) : translate(messages.available)}</small>
				</div>
				<button disabled={!status.available || !!game.state.network?.pending} aria-describedby="availability-{id}" onclick={() => game.buy(id)}>{translate(messages.buy_unit, { unit: unitName(id) })}</button>
			</div>
		{/each}
	</Modal>
{/if}

<style>
	.offer {
		display: grid;
		grid-template-columns: 64px minmax(0, 1fr);
		gap: 16px;
		align-items: center;
		padding: 14px;
		border: 2px solid var(--site-plum);
		border-radius: 0;
		background: var(--site-paper);
		margin: 10px 0;

		button {
			grid-column: 2;
			justify-self: start;
			max-width: 100%;
			white-space: normal;
		}
	}

	.affordable {
		background: var(--site-yellow);
	}

	.unavailable {
		color: var(--color-text);

		:global(.sprite) {
			opacity: 0.45;
			filter: grayscale(1);
		}
	}

	p {
		margin: 5px 0;
	}

	small {
		display: block;
		font-size: var(--font-size-ui);
	}

	@media (max-width: 430px) {
		.offer button {
			grid-column: 2;
		}
	}
</style>
