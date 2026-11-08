<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { goto } from '$app/navigation'
	import { onMount, tick } from 'svelte'
	import { asset } from '#lib/game/asset-path.js'
	import { isMapInCatalog } from '#lib/game/map-catalog.js'
	import mapPreviews from '#lib/data/map-previews.json'
	import { mapName, translate } from '#lib/i18n.svelte.js'
	import { m } from '#lib/paraglide/messages.js'
	import MatchSetupModal from '#lib/components/MatchSetupModal.svelte'
	import TextSelector from './TextSelector.svelte'
	import SelectionCorners from './SelectionCorners.svelte'
	const sizes = ['XS', 'S', 'M', 'L', 'XL']
	const maps = Object.entries(mapPreviews)
		.filter(([id]) => isMapInCatalog(id))
		.map(([id, preview]) => ({ id, ...preview }))
		.sort((a, b) => a.cols * a.rows - b.cols * b.rows || Number(a.id) - Number(b.id))
	function mapSize(cells: number) {
		return cells <= 80 ? 'XS' : cells <= 120 ? 'S' : cells <= 160 ? 'M' : cells <= 200 ? 'L' : 'XL'
	}
	let mounted = $state(false)
	const size = $derived(mounted && sizes.includes(page.url.searchParams.get('size') ?? '') ? page.url.searchParams.get('size')! : 'ALL')
	const filtered = $derived(maps.filter((map) => size === 'ALL' || mapSize(map.cols * map.rows) === size))
	const widestRatio = $derived(Math.max(0, ...filtered.map((map) => map.cols / map.rows)))
	let selectedMap = $state<number | null>(null)
	let expanded = $state(false)
	let position = $state(0)
	let gallery: HTMLDivElement
	const current = $derived(filtered[((position % filtered.length) + filtered.length) % filtered.length])
	async function pickMap(index: number) {
		position = index
		expanded = false
		await tick()
		gallery.querySelector<HTMLAnchorElement>('.selected')?.focus({ preventScroll: true })
		gallery.scrollIntoView({ block: 'nearest' })
	}
	let touchStart: { x: number; y: number } | undefined
	let swiped = false
	function startSwipe(event: TouchEvent) {
		swiped = false
		touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : undefined
	}
	function finishSwipe(event: TouchEvent) {
		if (!touchStart) return
		const dx = event.changedTouches[0].clientX - touchStart.x
		const dy = event.changedTouches[0].clientY - touchStart.y
		touchStart = undefined
		if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy) || filtered.length < 2) return
		swiped = true
		position += dx < 0 ? 1 : -1
	}
	function handleKey(event: KeyboardEvent) {
		if (event.defaultPrevented || selectedMap !== null || !current) return
		const target = event.target
		if (!(target instanceof Element) || target.closest('input, select, textarea, [contenteditable="true"], dialog')) return
		if (!expanded && gallery?.contains(target) && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
			event.preventDefault()
			position += event.key === 'ArrowRight' ? 1 : -1
			return
		}
		if (expanded || event.key !== 'Enter' || event.repeat || target.closest('a, button')) return
		const bounds = gallery?.getBoundingClientRect()
		if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return
		event.preventDefault()
		selectedMap = Number(current.id)
	}
	function selectSize(value: string) {
		const url = new URL(page.url.href)
		for (const key of ['size', 'symmetrical', 'mobile']) url.searchParams.delete(key)
		if (value !== 'ALL') url.searchParams.set('size', value)
		void goto(url, { replace: true, reset: false })
	}
	onMount(() => {
		mounted = true
	})
	$effect(() => {
		size
		position = 0
	})
</script>

<svelte:window onkeydown={handleKey} />

<section aria-labelledby="maps">
	<div class="gallery-heading">
		<h2 id="maps">{translate(m.choose_battlefield)}</h2>
		<div class="gallery-tools">
			<div class="size-options" role="group" aria-label={translate(m.map_filter_size)}>
				{#each [...sizes, 'ALL'] as value}<TextSelector active={size === value} onclick={() => selectSize(value)}>{value}</TextSelector>{/each}
			</div>
			<button class="view-toggle" type="button" disabled={!mounted} aria-expanded={expanded} onclick={() => (expanded = !expanded)}>{translate(expanded ? m.gallery_back_to_preview : m.gallery_view_all)}</button>
		</div>
	</div>
	{#snippet arrow(direction: number)}
		<button class="gallery-arrow" class:next={direction === 1} type="button" aria-label={translate(direction === 1 ? m.gallery_next : m.gallery_previous)} onclick={() => (position += direction)}>
			<img src={asset('/assets/interface/gallery-arrow-' + (direction === 1 ? 'right' : 'left') + '.png')} alt="" />
		</button>
	{/snippet}
	<div class="maps" role="group" aria-labelledby="maps" bind:this={gallery} class:grid={expanded} class:featured={!expanded}>
		{#if !current}<p>{translate(m.map_filter_empty)}</p>
		{:else if expanded}
			{#each filtered as map, index (map.id)}
				<a
					class="map"
					class:selected={current.id === map.id}
					data-map-id={map.id}
					href={resolve('/play/[map]', { map: map.id })}
					onclick={(event) => {
						if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
						event.preventDefault()
						void pickMap(index)
					}}
				>
					<div class="map-thumbnail">
						<img src={asset('/assets/map-previews/map-' + map.id + '.png')} alt="" width={Math.round((480 * map.cols) / map.rows)} height="480" loading="lazy" draggable="false" />
						<SelectionCorners />
					</div>
					<h3>{mapName(map.id)}</h3>
				</a>
			{/each}
		{:else}
			<div class="preview-frame" style:--widest-ratio={widestRatio}>
				<div class="stage" role="group" aria-labelledby="map-name" ontouchstart={startSwipe} ontouchend={finishSwipe} ontouchcancel={() => (touchStart = undefined)} onpointerdown={() => (swiped = false)}>
					<a
						class="map selected"
						style:--map-ratio={current.cols / current.rows}
						data-map-id={current.id}
						aria-labelledby="map-name"
						aria-haspopup="dialog"
						href={resolve('/play/[map]', { map: current.id })}
						onclick={(event) => {
							if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
							event.preventDefault()
							if (!swiped) selectedMap = Number(current.id)
							swiped = false
						}}
					>
						<div class="map-thumbnail">
							<img src={asset('/assets/map-previews/map-' + current.id + '.png')} alt="" width={Math.round((480 * current.cols) / current.rows)} height="480" draggable="false" />
							<SelectionCorners />
						</div>
					</a>
				</div>
				{#if filtered.length > 1}{@render arrow(-1)}{/if}
				<h3 class="caption" id="map-name" aria-live="polite">{mapName(current.id)}</h3>
				{#if filtered.length > 1}{@render arrow(1)}{/if}
			</div>
		{/if}
	</div>
</section>
{#if selectedMap !== null}<MatchSetupModal map={selectedMap} onclose={() => (selectedMap = null)} />{/if}

<style>
	section {
		max-width: 1875px;
		margin: auto;
	}
	.gallery-heading {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 24px;
		margin-bottom: 64px;
	}
	h2 {
		margin: 0;
		font-size: clamp(2rem, 3.5vw, 3rem);
	}
	.size-options {
		display: flex;
		gap: 24px;
		align-items: center;
	}
	.grid {
		--selection-gutter: 10px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(210px, 100%), 1fr));
		grid-auto-rows: 1fr;
		gap: 32px;
		padding-inline: var(--selection-gutter);
	}
	.map {
		--selection-corner-size: 28px;
		--selection-corner-inset: calc(-1 * var(--selection-gutter, 10px));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		max-width: 100%;
		min-width: 0;
		text-decoration: none;
	}
	.map-thumbnail {
		position: relative;
		max-width: 100%;
	}
	.map-thumbnail :global(.selection-corners) {
		visibility: hidden;
	}
	@media (hover: hover) {
		.map-thumbnail:hover :global(.selection-corners) {
			visibility: visible;
		}
	}
	.map-thumbnail > img {
		display: block;
		max-width: 100%;
		height: auto;
		image-rendering: pixelated;
	}
	.map h3 {
		margin: 0;
		font-size: clamp(1.25rem, 2.25vw, 2.25rem);
		text-align: center;
		text-wrap: balance;
		--site-heading-outline: min(0.11em, var(--site-card-outline));
	}
	.gallery-tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 32px;
	}
	.grid .map-thumbnail {
		margin-block: auto;
	}
	.grid .map-thumbnail > img {
		max-height: 150px;
		width: auto;
		object-fit: contain;
	}
	.grid h3 {
		font-size: clamp(1.125rem, 2vw, 1.5rem);
		overflow-wrap: anywhere;
	}
	.featured {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		scroll-margin-top: var(--site-nav-height);
		justify-items: center;
		gap: 16px;
	}
	.preview-frame {
		--stage-height: min(480px, 65svh);
		--arrow-width: 44px;
		--frame-gap: 12px;
		--frame-padding: 2rem;
		background: var(--site-yellow);
		border-radius: 4px;
		padding: calc(var(--frame-padding) + 12px) var(--frame-padding);
		width: min(100%, calc(var(--widest-ratio) * var(--stage-height) + 2 * (var(--arrow-width) + var(--frame-gap) + var(--frame-padding))));
		display: grid;
		grid-template-columns: var(--arrow-width) minmax(0, 1fr) var(--arrow-width);
		grid-template-areas: 'prev stage next' '. caption .';
		align-items: center;
		gap: 16px var(--frame-gap);
	}
	.stage {
		grid-area: stage;
		position: relative;
		width: 100%;
		height: var(--stage-height);
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		touch-action: pan-y pinch-zoom;
	}
	.stage .map {
		width: min(100%, calc(var(--stage-height) * var(--map-ratio)));
	}
	.stage .map-thumbnail {
		width: 100%;
		aspect-ratio: var(--map-ratio);
	}
	.stage .map-thumbnail > img {
		width: 100%;
		height: 100%;
	}
	.caption {
		grid-area: caption;
		margin: 0;
		font-size: clamp(1.25rem, 2.25vw, 2.25rem);
		text-align: center;
		text-wrap: balance;
		--site-heading-outline: min(0.11em, var(--site-card-outline));
	}
	.gallery-arrow {
		grid-area: prev;
		display: grid;
		place-items: center;
		width: var(--arrow-width);
		height: var(--arrow-width);
		padding: 0;
		border: none;
		background: transparent;
		box-shadow: none;
		cursor: pointer;
	}
	.gallery-arrow img {
		width: var(--arrow-width);
		image-rendering: pixelated;
	}
	.gallery-arrow.next {
		grid-area: next;
	}
	@media (width < 1568px) {
		.featured {
			margin-inline: calc(-1 * var(--section-gutter));
		}
		.preview-frame {
			--frame-padding: 12px;
			width: 100%;
		}
	}
	@media (max-width: 640px) {
		.preview-frame {
			grid-template-areas: 'stage stage stage' 'prev caption next';
		}
		.gallery-arrow {
			align-self: start;
		}
	}
	.gallery-arrow::before,
	.gallery-arrow::after {
		display: none;
	}
	@media (max-width: 900px) {
		.gallery-heading {
			align-items: flex-start;
			flex-direction: column;
			gap: 24px;
		}
		.size-options {
			gap: 20px;
		}
	}
	@media (max-width: 640px) {
		.grid {
			grid-auto-rows: auto;
			grid-template-columns: repeat(auto-fill, minmax(min(140px, 100%), 1fr));
		}
		.gallery-heading {
			margin-bottom: 32px;
		}
		.grid {
			gap: 24px;
		}
		.size-options {
			gap: 16px;
		}
	}
</style>
