<script lang="ts">
	import Sprite from './Sprite.svelte'
	import { asset } from '$lib/game/asset-path'
	import { selectedUnit } from '$lib/game/model.js'
	import { unitTypes } from '$lib/game/catalog.js'
	import { deploymentCells, selectedPassenger } from '$lib/game/transport.js'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { translate, unitName } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import type { GameController } from '$lib/game/types.js'
	import Modal from './Modal.svelte'
	let { game, disabled = false }: { game: GameController; disabled?: boolean } = $props()
	const transport = $derived(selectedUnit(game.state))
	const passenger = $derived(selectedPassenger(game.state))
	const guidedBlocked = $derived(!!transport?.cargo?.length && !transport.cargo.some((u) => game.allowsAction?.('selectPassenger', u.id) !== false))
	const hasLandingTile = $derived(!!transport?.cargo?.some((unit) => deploymentCells(game.state, transport, unit).length))
	let showPassengers = $state(false)
	function openPassengersWithKeyboard(event: KeyboardEvent) {
		if (event.key.toLowerCase() !== 't' || event.repeat || event.isComposing || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return
		if (disabled || guidedBlocked || showPassengers || !transport?.cargo?.length || !unitTypes[transport.type].capacity || document.querySelector('dialog[open]')) return
		const target = event.target instanceof Element ? event.target : null
		if (target?.closest('input, textarea, select') || (target instanceof HTMLElement && target.isContentEditable)) return
		event.preventDefault()
		showPassengers = true
	}
	$effect(() => {
		if (disabled || !transport?.cargo?.length) showPassengers = false
	})
</script>

<svelte:window onkeydown={openPassengersWithKeyboard} />

{#if transport && unitTypes[transport.type].capacity}
	{@const label = translate(messages.transport_cargo, { count: transport.cargo?.length ?? 0, capacity: unitTypes[transport.type].capacity ?? 0 })}
	<section class="cargo-tray" aria-label={translate(messages.transport_title)}>
		<button class="cargo-toggle pixel-icon-button" disabled={disabled || guidedBlocked || !transport.cargo?.length} aria-label={label} aria-keyshortcuts="T" title={`${label} (T)`} aria-haspopup="dialog" onclick={() => (showPassengers = true)}>
			<span class="cargo-face" style:background-image={`url('${asset('/assets/icons/action-frame.svg')}')`}>{transport.cargo?.length ?? 0}/{unitTypes[transport.type].capacity}</span>
		</button>
		{#if showPassengers}
			<Modal title={label} alwaysShowScrollbar={false} onclose={() => (showPassengers = false)}>
				<p class="instruction">{translate(hasLandingTile ? messages.transport_choose_passenger : messages.transport_blocked)}</p>
				<div class="passengers">
					{#each transport.cargo ?? [] as unit (unit.id)}
						{@const definition = unitTypes[unit.type]}
						{@const blocked = !deploymentCells(game.state, transport, unit).length}
						{@const passengerLabel = `${unitName(unit.type)}, ${unit.health} / ${unitTypes[unit.type].maxHealth} ${translate(messages.stat_health)}, ${unit.movement}/${definition.movement} ${translate(messages.stat_movement)}, ${unit.attacks}/${definition.attacks} ${translate(messages.stat_attacks)}, ${translate(messages.capture)}: ${unit.capture}`}
						<button
							class="passenger"
							disabled={disabled || blocked || game.allowsAction?.('selectPassenger', unit.id) === false}
							title={blocked ? translate(messages.transport_blocked) : undefined}
							data-passenger={unit.id}
							aria-label={passengerLabel}
							aria-pressed={passenger?.id === unit.id}
							onclick={() => {
								game.selectPassenger(unit.id)
								showPassengers = false
							}}
						>
							<Sprite src={unitSprite(unit)} size="s" />
							<span class="passenger-stats">
								<span class="health"><span class="status-icon health-icon"><img src={asset('/assets/icons/icon-health.png')} alt={translate(messages.stat_health)} /></span>{unit.health}/{definition.maxHealth}</span>
								<span class="movement" title={`${translate(messages.stat_movement)}: ${unit.movement}/${definition.movement}`}><span class="status-icon movement-icon" class:spent={unit.movement === 0}><img src={asset('/assets/icons/icon-movement.png')} alt={translate(messages.stat_movement)} /></span></span>
								<span class="ammunition" title={`${translate(messages.stat_attacks)}: ${unit.attacks}/${definition.attacks}`}>
									{#each Array(definition.attacks) as _, index}<span class="status-icon ammo-icon" class:spent={index < definition.attacks - unit.attacks}><img src={asset('/assets/icons/icon-attack-capacity.png')} alt={translate(messages.stat_attacks)} /></span>{/each}
								</span>
								{#if definition.captures}<span class="capture" title={`${translate(messages.capture)}: ${unit.capture}`}><span class="status-icon capture-icon" class:spent={unit.capture === 0}><img src={asset('/assets/icons/icon-capture-capacity.png')} alt={translate(messages.capture)} /></span></span>{/if}
							</span>
						</button>
					{/each}
				</div>
			</Modal>
		{/if}
		<p class="sr-only" role="status">{translate(passenger ? (deploymentCells(game.state, transport, passenger).length ? messages.transport_choose_tile : messages.transport_blocked) : transport.cargo?.length ? messages.transport_choose_passenger : messages.transport_board_hint)}</p>
	</section>
{/if}

<style>
	.cargo-tray {
		--modal-max-width: 400px;
		display: flex;
		align-items: center;
		flex: none;
		height: 48px;
	}
	.cargo-toggle {
		width: 48px;
		height: 48px;
		padding: 0;
	}
	.cargo-face {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		padding-bottom: 4px;
		background-size: contain;
		background-repeat: no-repeat;
		image-rendering: pixelated;
		color: #dfe0e8;
	}
	@media (max-width: 480px) {
		.cargo-toggle {
			width: 40px;
		}
	}
	@media (max-width: 360px) {
		.cargo-toggle {
			width: 36px;
		}
	}
	.instruction {
		margin: 0 0 12px;
		font-size: var(--font-size-ui);
	}
	.passengers {
		display: grid;
		gap: 8px;
	}
	.passenger {
		background: var(--site-paper);
		border: 2px solid var(--site-plum);
		border-radius: 0;
		color: var(--site-plum);
		font-family: var(--font-body);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		text-align: left;
		padding: 4px;
	}
	.passenger-stats {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.passenger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.passenger-stats > .ammunition {
		align-self: flex-end;
		flex-direction: column;
		gap: 0;
		transform: translateY(-4px);
	}
	.passenger-stats > span {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
		font-size: var(--font-size-ui);
	}
	.status-icon {
		position: relative;
		display: block;
		flex: none;
		width: 16px;
		overflow: hidden;
		img {
			position: absolute;
			left: var(--icon-left);
			top: var(--icon-top);
			width: var(--icon-width);
			height: auto;
			max-width: none;
		}
	}
	.health-icon {
		aspect-ratio: 24 / 20;
		--icon-left: -12.5%;
		--icon-top: -25%;
		--icon-width: 125%;
	}
	.movement-icon {
		aspect-ratio: 18 / 19;
		--icon-left: calc(-3 / 18 * 100%);
		--icon-top: calc(-3 / 19 * 100%);
		--icon-width: calc(25 / 18 * 100%);
	}
	.capture-icon {
		aspect-ratio: 13 / 15;
		--icon-left: calc(-6 / 13 * 100%);
		--icon-top: calc(-5 / 15 * 100%);
		--icon-width: calc(25 / 13 * 100%);
	}
	.ammo-icon {
		width: 9.6px;
		aspect-ratio: 17 / 13;
		--icon-left: calc(-4 / 17 * 100%);
		--icon-top: calc(-6 / 13 * 100%);
		--icon-width: calc(25 / 17 * 100%);
	}
	.spent {
		opacity: 0.5;
	}
	img {
		width: 36px;
		height: 36px;
		object-fit: contain;
		image-rendering: pixelated;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
