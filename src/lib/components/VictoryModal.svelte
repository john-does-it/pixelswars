<script lang="ts">
	import { resolve } from '$app/paths'
	import PlayerTransition from './PlayerTransition.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { Medal } from '$lib/profile.ts'
	import type { Player } from '$lib/game/types.js'

	let { winner, onrestart, earnedMedal = null, storageError = false, aiMode = false, rematchRequested = false, opponentRematchRequested = false }: { earnedMedal?: Medal | null; storageError?: boolean; winner: Player; onrestart: () => void; aiMode?: boolean; rematchRequested?: boolean; opponentRematchRequested?: boolean } = $props()
	const title = $derived(aiMode ? translate(winner === 1 ? messages.ai_victory_message : messages.human_victory_message) : translate(messages.victory_message, { player: winner }))
</script>

<PlayerTransition player={winner} persistent label={title}>
	<h2 class="pixel-heading">{title}</h2>
	{#if earnedMedal}
		<p class="medal-award">{translate(messages.medal_new, { difficulty: translate(messages[`ai_${earnedMedal.difficulty}`]) })}</p>
		{#if storageError}<p role="alert">{translate(messages.profile_storage_error)}</p>{/if}
	{/if}
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
