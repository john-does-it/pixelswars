<script lang="ts">
	import { playerName, translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { preferences } from '$lib/preferences.svelte.js'
	import { playerIncome } from '$lib/game/model.js'
	import type { GameState } from '$lib/game/types.js'
	let { state, aiMode = false }: { state: GameState; aiMode?: boolean } = $props()
	const amounts = $derived(new Intl.NumberFormat(preferences.locale))
	const players = [1, 2] as const
</script>

<div class="budgets">
	{#each players as player}
		<span>
			<span class:player-one={player === 1} class:player-two={player === 2}>{playerName(player, aiMode)}</span>
			<span class="amounts">
				<b>{amounts.format(state.money[player])} $</b>
				<span class="income" title={translate(messages.expected_income_hint)}>{translate(messages.income_per_turn, { income: amounts.format(playerIncome(state, player)) })}</span>
			</span>
		</span>
	{/each}
</div>

<style>
	.budgets {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding-top: 10px;
		border-top: 1px solid rgb(255 255 255 / 10%);
		flex: none;
	}
	.budgets > span {
		display: flex;
		align-items: center;
		gap: 16px;
		min-width: 0;
	}
	.budgets > span:last-child {
		justify-content: flex-end;
		text-align: right;
	}
	.player-one {
		color: #8dcbff;
	}
	.player-two {
		color: #ffb3b1;
	}
	.amounts {
		display: flex;
		align-items: baseline;
		gap: 8px;
		white-space: nowrap;
	}
	.income {
		font-size: 0.85em;
		opacity: 0.8;
	}
	@media (max-width: 900px) {
		.budgets {
			gap: 8px;
			padding-top: 6px;
		}
		.budgets > span {
			gap: 8px;
			flex-wrap: wrap;
			row-gap: 0;
		}
		.amounts {
			flex-direction: column;
			gap: 0;
		}
		.budgets > span:last-child .amounts {
			align-items: flex-end;
		}
	}
</style>
