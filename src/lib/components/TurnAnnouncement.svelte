<script lang="ts">
	import PlayerTransition from './PlayerTransition.svelte'
	import type { Player } from '#lib/game/types.js'

	let { player, message }: { player: Player; message: string } = $props()
</script>

<PlayerTransition {player} label={message}>
	<div class="turn-announcement pixel-heading" role="status" aria-live="polite" aria-atomic="true">
		{message}
	</div>
</PlayerTransition>

<style>
	.turn-announcement {
		font-size: inherit;
	}
</style>
