<script>
	import Game from '$lib/components/Game.svelte'

	let { data } = $props()
</script>

{#key data.map.id}
	<Game map={data.map} />
{/key}
