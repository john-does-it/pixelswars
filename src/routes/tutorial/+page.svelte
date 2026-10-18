<script lang="ts">
	import Game from '$lib/components/Game.svelte'
	import { tutorialScenario } from '$lib/game/tutorial'
	import type { PageData } from './$types'
	let { data }: { data: PageData } = $props()
</script>

<Game map={data.map} tutorial={tutorialScenario} />
