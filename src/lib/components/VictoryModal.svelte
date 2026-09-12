<script lang="ts">
	import { base } from '$app/paths'
	import Modal from './Modal.svelte'
	import type { Player } from '$lib/game/types.js'

	let { winner, onrestart }: { winner: Player; onrestart: () => void } = $props()
</script>

<Modal title="Victory">
	<p>Player {winner}, congratulations — you win!</p>
	<button class="primary" onclick={onrestart}>Play again</button>
	<a class="button" href="{base}/">Choose another map</a>
</Modal>
