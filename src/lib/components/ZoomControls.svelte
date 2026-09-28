<script lang="ts">
	import type { MapCamera } from '$lib/game/map-camera.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	let { camera }: { camera?: MapCamera } = $props()
</script>

<div class="zoom-controls" role="group" aria-label={translate(messages.map_zoom)}>
	<button aria-label={translate(messages.zoom_out)} title={translate(messages.zoom_out)} disabled={!camera?.canZoomOut} onclick={() => camera?.zoomOut()}>−</button>
	<button aria-label={translate(messages.zoom_in)} title={translate(messages.zoom_in)} disabled={!camera?.canZoomIn} onclick={() => camera?.zoomIn()}>+</button>
	<button aria-label={translate(messages.fit_map)} title={translate(messages.fit_map)} onclick={() => camera?.fit()}>⛶</button>
</div>

<style>
	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 4px;
		button {
			padding: 0;
			width: 44px;
			font-size: 22px;
		}
	}
</style>
