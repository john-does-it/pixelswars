<script lang="ts">
	import { asset } from '$app/paths'
	let { name, size = 40 }: { name: 'arrow-down' | 'arrow-left' | 'arrow-right' | 'arrow-up' | 'close' | 'fit-map' | 'game-settings' | 'icon-capture' | 'icon-mute-sound' | 'icon-play-sound' | 'less-zoom' | 'plus-zoom' | 'previous-action' | 'stats-informations' | 'validate-action'; size?: number } = $props()
</script>

<img src={asset(`/assets/icons/${name}.svg`)} width={size} height={size} alt="" aria-hidden="true" draggable="false" />

<style>
	img {
		display: inline-block;
		flex: none;
		object-fit: contain;
		image-rendering: pixelated;
		vertical-align: middle;
		pointer-events: none;
	}
</style>
