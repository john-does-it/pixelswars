<script lang="ts">
	import { resolve } from '$app/paths'
	import PlayerTransition from './PlayerTransition.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { Player } from '$lib/game/types.js'

	let { winner, onrestart, aiMode = false, rematchRequested = false, opponentRematchRequested = false }: { winner: Player; onrestart: () => void; aiMode?: boolean; rematchRequested?: boolean; opponentRematchRequested?: boolean } = $props()
	const title = $derived(aiMode ? translate(winner === 1 ? messages.ai_victory_message : messages.human_victory_message) : translate(messages.victory_message, { player: winner }))
</script>

<PlayerTransition player={winner} persistent label={title}>
	<h2>{title}</h2>
	<div class="victory-actions">
		<button class="primary" disabled={rematchRequested} onclick={onrestart}>{translate(rematchRequested ? messages.online_rematch_waiting : opponentRematchRequested ? messages.online_rematch_accept : messages.play_again)}</button>
		<a class="button primary" href={resolve('/', {})}>{translate(messages.choose_another_map)}</a>
	</div>
</PlayerTransition>

<style>
	h2 {
		margin: 0 0 16px;
		font-size: inherit;
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
