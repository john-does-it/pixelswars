<script>
	import { base } from '$app/paths'
	import Modal from './Modal.svelte'

	let { winner, onrestart } = $props()
</script>

<Modal title="Victory">
	<p>Player {winner}, congratulations — you win!</p>
	<button class="primary" onclick={onrestart}>Play again</button>
	<a class="button" href="{base}/">Choose another map</a>
</Modal>
