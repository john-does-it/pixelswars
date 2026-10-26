<script lang="ts">
	import { asset } from '$lib/game/asset-path'
</script>

<span class="selection-corners" aria-hidden="true">
	{#each [0, 1, 2, 3] as corner}<img src={asset('/assets/interface/selection-corner.png')} alt="" style:--turn={corner * 90 + 'deg'} class={'corner corner-' + corner} />{/each}
</span>

<style>
	.selection-corners {
		position: absolute;
		inset: var(--selection-corner-inset, -5px);
		pointer-events: none;
		z-index: 5;
	}
	.corner {
		position: absolute;
		width: var(--selection-corner-size, 12px);
		height: var(--selection-corner-size, 12px);
		image-rendering: pixelated;
		transform: rotate(var(--turn));
	}
	.corner-0 {
		left: 0;
		top: 0;
	}
	.corner-1 {
		right: 0;
		top: 0;
	}
	.corner-2 {
		right: 0;
		bottom: 0;
	}
	.corner-3 {
		left: 0;
		bottom: 0;
	}
</style>
