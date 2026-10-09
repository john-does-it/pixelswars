<script lang="ts">
	import type { MapCamera } from '$lib/game/map-camera.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import UiIcon from './UiIcon.svelte'
	let { camera }: { camera?: Pick<MapCamera, 'canZoomIn' | 'canZoomOut' | 'zoomIn' | 'zoomOut' | 'fit'> } = $props()
</script>

<div class="zoom-controls" role="group" aria-label={translate(messages.map_zoom)}>
	<button class="pixel-icon-button" aria-label={translate(messages.zoom_out)} title={translate(messages.zoom_out)} disabled={!camera?.canZoomOut} onclick={() => camera?.zoomOut()}><UiIcon name="less-zoom" /></button>
	<button class="pixel-icon-button" aria-label={translate(messages.zoom_in)} title={translate(messages.zoom_in)} disabled={!camera?.canZoomIn} onclick={() => camera?.zoomIn()}><UiIcon name="plus-zoom" /></button>
	<button class="pixel-icon-button" aria-label={translate(messages.fit_map)} title={translate(messages.fit_map)} onclick={() => camera?.fit()}><UiIcon name="fit-map" /></button>
</div>

<style>
	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 4px;
		button {
			padding: 0;
			width: 44px;
		}
	}
</style>
