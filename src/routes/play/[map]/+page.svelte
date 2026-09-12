<script lang="ts">
	import Game from '$lib/components/Game.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
</script>

{#key data.map.id}
	<Game map={data.map} />
{/key}
