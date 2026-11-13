<script lang="ts">
	import { unitSpritePath } from '#lib/game/unit-sprites.js'
	import { asset } from '#lib/game/asset-path.js'
	import type { GameMap } from '#lib/game/types.js'

	let { map }: { map: GameMap } = $props()
	const units = $derived(new Map(map.units.map((unit) => [unit.cell, unit])))
</script>

<div class="preview" aria-hidden="true" style:grid-template-columns={`repeat(${map.cols}, 1fr)`}>
	{#each map.cells as cell, index}
		{@const unit = units.get(index)}
		<span class="cell-container {cell.classes.join(' ')}{cell.owner ? ` -capturedby${cell.owner}` : ''}">
			{#if unit}<img src={asset(unitSpritePath(unit.type, unit.player))} alt="" loading="lazy" />{/if}
		</span>
	{/each}
</div>

<style>
	.preview {
		display: grid;
		width: 100%;
	}
	.preview .cell-container {
		display: block;
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		background-size: 100% 100%;
		image-rendering: pixelated;
	}
	.preview img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: pixelated;
	}
</style>
