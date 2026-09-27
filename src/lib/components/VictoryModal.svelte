<script lang="ts">
	import { resolve } from '$app/paths'
	import PlayerTransition from './PlayerTransition.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { playerName, translate } from '$lib/i18n.svelte.js'
	import type { Player } from '$lib/game/types.js'

	let { winner, onrestart, aiMode = false }: { winner: Player; onrestart: () => void; aiMode?: boolean } = $props()
</script>

<PlayerTransition player={winner} persistent label={translate(messages.victory)}>
	<h2>{translate(messages.victory)}</h2>
	<p>{aiMode ? translate(messages.ai_victory_message, { winner: playerName(winner, true) }) : translate(messages.victory_message, { player: winner })}</p>
	<div class="victory-actions">
		<button class="primary" onclick={onrestart}>{translate(messages.play_again)}</button>
		<a class="button primary" href={resolve('/', {})}>{translate(messages.choose_another_map)}</a>
	</div>
</PlayerTransition>

<style>
	h2 {
		margin: 0 0 16px;
		font-size: inherit;
	}

	p {
		margin: 0;
		font-size: clamp(16px, 2.5vw, 24px);
	}

	.victory-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
		margin-top: 32px;
		text-shadow: none;

		button,
		a {
			min-height: 44px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
		}
	}
</style>
