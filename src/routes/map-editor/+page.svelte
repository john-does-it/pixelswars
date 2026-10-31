<script lang="ts">
	import MapEditor from '#lib/components/MapEditor.svelte'
	import type { PageData } from './$types'
	let { data }: { data: PageData } = $props()
</script>

{#key data.draftMap?.id}
	<MapEditor sourceMap={data.draftMap} />
{/key}
