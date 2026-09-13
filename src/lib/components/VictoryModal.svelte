<script lang="ts">
	import { resolve } from '$app/paths'
	import Modal from './Modal.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { Player } from '$lib/game/types.js'

	let { winner, onrestart }: { winner: Player; onrestart: () => void } = $props()
</script>

<Modal title={translate(messages.victory)}>
	<p>{translate(messages.victory_message, { player: winner })}</p>
	<button class="primary" onclick={onrestart}>{translate(messages.play_again)}</button>
	<a class="button" href={resolve('/', {})}>{translate(messages.choose_another_map)}</a>
</Modal>

<style>
	a:hover {
		text-decoration: none;
	}
</style>
