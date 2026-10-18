<script lang="ts">
	import { resolve } from '$app/paths'
	import { asset } from '$lib/game/asset-path'
	import { describeMap } from '$lib/game/map-details'
	import type { GameMap } from '$lib/game/types'
	import MapCharacteristics from './MapCharacteristics.svelte'
	import { translate } from '$lib/i18n.svelte'
	import { m as messages } from '$lib/paraglide/messages'
	let { maps }: { maps: GameMap[] } = $props()
</script>

{#if maps.length}
	<section aria-labelledby="draft-maps-title" class="draft-gallery">
		<h2 id="draft-maps-title">{translate(messages.map_drafts)}</h2>
		<p>{translate(messages.map_drafts_hint)}</p>
		<div class="draft-grid">
			{#each maps as map (map.id)}
				{@const units = new Map(map.units.map((unit) => [unit.cell, unit]))}
				<article class="panel draft-card" data-draft-map={map.id}>
					<div class="preview" aria-hidden="true" style:grid-template-columns={`repeat(${map.cols}, 1fr)`}>
						{#each map.cells as cell, index}
							{@const unit = units.get(index)}
							<span class="cell-container {cell.classes.join(' ')}{cell.owner ? ` -capturedby${cell.owner}` : ''}">
								{#if unit}<img src={asset(`/assets/units/${unit.type}-${unit.player}.png`)} alt="" loading="lazy" />{/if}
							</span>
						{/each}
					</div>
					<span class="draft-badge">{translate(messages.map_draft)}</span>
					<MapCharacteristics details={describeMap(map)} />
					<h3 title={map.name}>{map.name}</h3>
					<p>{map.cols} × {map.rows}</p>
					<div class="actions">
						<a href={`${resolve('/map-editor/', {})}?draft=${map.id}`}>{translate(messages.map_draft_edit)}</a>
					</div>
				</article>
			{/each}
		</div>
	</section>
{/if}

<style>
	.draft-gallery {
		margin-top: 64px;
	}
	.draft-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
		gap: 16px;
	}
	.draft-card {
		min-width: 0;
		padding: 20px;
	}
	.preview {
		display: grid;
		max-width: 240px;
		margin: 0 auto 16px;
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
	.draft-badge {
		display: inline-block;
		color: var(--color-accent);
		border: 1px dashed currentColor;
		padding: 2px 6px;
		margin-bottom: 8px;
	}
	h3 {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
</style>
