<script lang="ts">
	import { browser } from '$app/environment'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { goto } from '$app/navigation'
	import { onMount, tick } from 'svelte'
	import { asset } from '$lib/game/asset-path'
	import { isMapInCatalog } from '$lib/game/map-catalog'
	import mapPreviews from '$lib/data/map-previews.json'
	import mapDetails from '$lib/data/map-details.json'
	import { mapName, translate } from '$lib/i18n.svelte'
	import { m } from '$lib/paraglide/messages'
	import MatchSetupModal from '$lib/components/MatchSetupModal.svelte'
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
	const size = $derived(browser && sizes.includes(page.url.searchParams.get('size') ?? '') ? page.url.searchParams.get('size')! : 'ALL')
	const filtered = $derived(maps.filter((map) => size === 'ALL' || mapSize(map.cols * map.rows) === size))
	let pointer = $state<{ id: string; x: number; y: number } | null>(null)
	let selectedMap = $state<number | null>(null)
	let highlighted = $state(maps[0]?.id)
	let gallery: HTMLDivElement
	let touching = false
	let touchOrigin: { id: string; x: number; y: number; pointerId: number } | null = null
	let settleTimer: ReturnType<typeof setTimeout> | undefined
	let canPrevious = $state(false),
		canNext = $state(false)
	function startCardTouch(event: PointerEvent, id: string) {
		if (event.pointerType === 'touch') touchOrigin = { id, x: event.clientX, y: event.clientY, pointerId: event.pointerId }
	}
	function finishCardTouch(event: PointerEvent, id: string) {
		const origin = touchOrigin
		touchOrigin = null
		if (event.pointerType !== 'touch' || origin?.id !== id || origin.pointerId !== event.pointerId) return
		if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 8) return
		highlighted = id
		selectedMap = Number(id)
	}
	function trackPointer(event: PointerEvent, id: string) {
		if (event.pointerType !== 'mouse') {
			pointer = null
			return
		}
		const art = event.currentTarget instanceof HTMLElement ? event.currentTarget.querySelector<HTMLElement>('.map-art') : null
		if (!art) return
		const rect = art.getBoundingClientRect()
		const x = event.clientX - rect.left,
			y = event.clientY - rect.top
		pointer = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? { id, x, y } : null
	}
	function scheduleSettle() {
		clearTimeout(settleTimer)
		if (!touching && matchMedia('(pointer: coarse)').matches) settleTimer = setTimeout(settleScroll, 160)
	}
	function endTouch() {
		touching = false
		scheduleSettle()
	}
	function updateScroll() {
		pointer = null

		if (gallery) {
			canPrevious = gallery.scrollLeft > 4
			canNext = gallery.scrollLeft + gallery.clientWidth < gallery.scrollWidth - 4
			scheduleSettle()
		}
	}
	function settleScroll() {
		if (touching || !gallery || !matchMedia('(pointer: coarse)').matches) return
		const inset = parseFloat(getComputedStyle(gallery).paddingLeft)
		const max = gallery.scrollWidth - gallery.clientWidth
		const stops = [...gallery.querySelectorAll<HTMLElement>('.map')].map((card) => Math.max(0, Math.min(max, card.offsetLeft - inset)))
		const target = stops.reduce((nearest, stop) => (Math.abs(stop - gallery.scrollLeft) < Math.abs(nearest - gallery.scrollLeft) ? stop : nearest), 0)
		highlighted = filtered[stops.indexOf(target)]?.id ?? highlighted
		// Finish native touch momentum on the same card edge as keyboard/arrow navigation.
		if (Math.abs(target - gallery.scrollLeft) > 1) gallery.scrollTo({ left: target, behavior: 'instant' })
	}
	function scroll(direction: number) {
		gallery.scrollBy({ left: direction * gallery.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
	}
	function selectSize(value: string) {
		const url = new URL(page.url)
		for (const key of ['size', 'symmetrical', 'mobile']) url.searchParams.delete(key)
		if (value !== 'ALL') url.searchParams.set('size', value)
		void goto(url, { replaceState: true, noScroll: true, keepFocus: true })
	}
	onMount(() => {
		const observer = new ResizeObserver(updateScroll)
		observer.observe(gallery)
		updateScroll()
		return () => {
			observer.disconnect()
			clearTimeout(settleTimer)
		}
	})
	$effect(() => {
		filtered
		void tick().then(() => {
			if (gallery) gallery.scrollLeft = 0
			highlighted = filtered[0]?.id
			updateScroll()
		})
	})
</script>

<section aria-labelledby="maps">
	<div class="gallery-heading">
		<h2 id="maps">{translate(m.choose_battlefield)}</h2>
		<div class="size-options" role="group" aria-label={translate(m.map_filter_size)}>
			{#each [...sizes, 'ALL'] as value}<TextSelector active={size === value} onclick={() => selectSize(value)}>{value}</TextSelector>{/each}
		</div>
	</div>
	<div class="gallery-shell">
		<button class="gallery-arrow previous" aria-label={translate(m.gallery_previous)} disabled={!canPrevious} onclick={() => scroll(-1)}><img src={asset('/assets/interface/gallery-arrow-left.png')} alt="" /></button>
		<div
			class="maps"
			role="group"
			aria-labelledby="maps"
			bind:this={gallery}
			onscroll={updateScroll}
			onscrollend={settleScroll}
			ontouchstart={() => {
				touching = true
				clearTimeout(settleTimer)
			}}
			ontouchend={endTouch}
			ontouchcancel={endTouch}
		>
			{#each filtered as map (map.id)}
				<a
					class="map"
					class:selected={highlighted === map.id}
					class:has-pointer={pointer?.id === map.id}
					onpointerdown={(event) => startCardTouch(event, map.id)}
					onpointerup={(event) => finishCardTouch(event, map.id)}
					onpointercancel={() => (touchOrigin = null)}
					onpointermove={(event) => trackPointer(event, map.id)}
					onpointerleave={() => (pointer = null)}
					href={resolve('/play/[map]/', { map: map.id })}
					aria-haspopup="dialog"
					onfocus={() => (highlighted = map.id)}
					onmouseenter={() => (highlighted = map.id)}
					draggable="false"
					onclick={(event) => {
						if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
						event.preventDefault()
						highlighted = map.id
						selectedMap = Number(map.id)
					}}
				>
					<div class="map-art">
						<img draggable="false" class="illustration" src={asset('/assets/illustrations/' + mapDetails[map.id as keyof typeof mapDetails].illustration + '.png')} alt="" width="280" height="320" />
						<h3>{mapName(map.id)}</h3>
						{#if highlighted === map.id}<SelectionCorners />{/if}
						{#if pointer?.id === map.id}<img class="crosshair" style:left={pointer.x + 'px'} style:top={pointer.y + 'px'} src={asset('/assets/icons/icon-crosshair.png')} alt="" />{/if}
					</div>
					<div class="map-thumbnail"><img src={asset('/assets/map-previews/map-' + map.id + '.png')} alt="" width={map.cols * 16} height={map.rows * 16} /></div>
				</a>
			{:else}<p>{translate(m.map_filter_empty)}</p>{/each}
		</div>
		<button class="gallery-arrow next" aria-label={translate(m.gallery_next)} disabled={!canNext} onclick={() => scroll(1)}><img src={asset('/assets/interface/gallery-arrow-right.png')} alt="" /></button>
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
		justify-content: space-between;
		align-items: center;
		gap: 24px;
		padding-inline: 56px;
		margin-bottom: 64px;
	}
	h2 {
		margin: 0;
	}
	.size-options {
		display: flex;
		gap: 24px;
		align-items: center;
	}
	.gallery-shell {
		display: grid;
		grid-template-columns: 40px minmax(0, 1fr) 40px;
		gap: 16px;
		align-items: start;
	}
	.maps {
		position: relative;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 327px;
		gap: 32px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		overscroll-behavior-x: contain;
		touch-action: pan-x pan-y pinch-zoom;
		scroll-padding-inline: 7px;
		padding: 7px;
	}
	.maps::-webkit-scrollbar {
		display: none;
	}
	.map {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-decoration: none;
		scroll-snap-align: start;
		scroll-snap-stop: always;
		min-width: 0;
	}
	.map.selected {
		z-index: 2;
	}
	.map-art {
		position: relative;
		width: 280px;
		aspect-ratio: 7/8;
	}
	.illustration {
		width: 100%;
		height: 100%;
		object-fit: cover;
		image-rendering: pixelated;
		display: block;
		filter: brightness(0.7);
	}
	.selected .illustration {
		filter: none;
	}
	.map-art h3 {
		position: absolute;
		inset: 42% 4px auto;
		text-align: center;
		margin: 0;
		font-size: 36px;
		--site-heading-outline: var(--site-card-outline);
		z-index: 1;
	}
	.has-pointer .map-art {
		cursor: none;
	}
	.crosshair {
		position: absolute;
		pointer-events: none;
		z-index: 3;

		width: 40%;
		height: auto;
		image-rendering: pixelated;
		transform: translate(-50%, -50%);
	}
	.map-thumbnail {
		width: 183px;
		max-width: 75%;
		height: 92px;
		margin-top: 24px;
		display: flex;
		justify-content: center;
	}
	.map-thumbnail img {
		width: 100%;
		height: 92px;
		max-height: 100%;
		min-height: 0;
		object-fit: contain;
		image-rendering: pixelated;
	}
	.gallery-arrow {
		min-width: 0;
		min-height: 0;
		border: 0;
		box-shadow: none;
		background: none;
		padding: 0;
		width: 40px;
		height: 44px;
		margin-top: 138px;
	}
	.gallery-arrow::before,
	.gallery-arrow::after {
		display: none;
	}
	.gallery-arrow img {
		width: 40px;
		height: 40px;
		object-fit: contain;
		image-rendering: pixelated;
	}
	.gallery-arrow:disabled {
		opacity: 0.4;
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
		.gallery-heading {
			padding-inline: 0;
			margin-bottom: 32px;
		}
		.gallery-shell {
			position: relative;
			display: block;
		}
		.maps {
			grid-auto-columns: min(78vw, 280px);
			gap: 24px;
			padding: 8px 16px;
			scroll-padding-inline: 16px;
		}
		.map-art {
			width: 100%;
		}
		.map-art h3 {
			font-size: 28px;
		}
		.gallery-arrow {
			position: absolute;
			z-index: 4;
			top: min(44.57vw, 160px);
			transform: translateY(-50%);
			width: 44px;
			height: 44px;
			margin-top: 8px;
		}
		.previous {
			left: -16px;
		}
		.next {
			right: -16px;
		}
		.gallery-arrow img {
			width: 24px;
			height: 24px;
		}
		.size-options {
			gap: 16px;
		}
		.map-thumbnail {
			height: 76px;
			width: 151px;
			margin-top: 16px;
		}
	}
</style>
