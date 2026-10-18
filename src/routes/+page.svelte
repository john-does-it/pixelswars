<script lang="ts">
	import type { PageData } from './$types'
	let { data }: { data: PageData } = $props()
	import { resolve } from '$app/paths'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { asset } from '$lib/game/asset-path'
	import { browser, dev } from '$app/environment'
	import { unitTypes, terrainTypes } from '$lib/game/catalog.js'
	import TerrainIcon from '$lib/components/TerrainIcon.svelte'
	import UiIcon from '$lib/components/UiIcon.svelte'
	import StatList from '$lib/components/StatList.svelte'
	import mapPreviews from '$lib/data/map-previews.json'
	import MapCharacteristics from '$lib/components/MapCharacteristics.svelte'
	import mapDetails from '$lib/data/map-details.json'
	import { isMapInCatalog } from '$lib/game/map-catalog'
	import HowToPlayModal from '$lib/components/HowToPlayModal.svelte'
	import MatchSetupModal from '$lib/components/MatchSetupModal.svelte'
	import SavedMatchCard from '$lib/components/SavedMatchCard.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { buildingName, translate, terrainName, unitName } from '$lib/i18n.svelte.js'
	import { preferences } from '$lib/preferences.svelte.js'
	import type { BuildingId, StatItem, TerrainDefinition, TerrainId, UnitDefinition, UnitTypeId } from '$lib/game/types.js'

	const mapSizeBands = [
		{ maximum: 64, label: 'XXS' },
		{ maximum: 80, label: 'XS' },
		{ maximum: 120, label: 'S' },
		{ maximum: 160, label: 'M' },
		{ maximum: 200, label: 'L' },
		{ maximum: 280, label: 'XL' },
		{ maximum: 360, label: 'XXL' }
	]

	const unitDescriptions = {
		'attack-ship': messages.unit_attack_ship_description,
		'transport-ship': messages.unit_transport_ship_description,
		infantry: messages.unit_infantry_description,
		'infantry-rocket': messages.unit_infantry_rocket_description,
		'infantry-sniper': messages.unit_infantry_sniper_description,
		jeep: messages.unit_jeep_description,
		transport: messages.unit_transport_description,
		artillery: messages.unit_artillery_description,
		tank: messages.unit_tank_description,
		'anti-air': messages.unit_anti_air_description,
		helicopter: messages.unit_helicopter_description,
		'transport-helicopter': messages.unit_transport_helicopter_description,
		plane: messages.unit_plane_description
	}
	const terrainDescriptions = { road: messages.terrain_road_description, grass: messages.terrain_grass_description, forest: messages.terrain_forest_description, moutain: messages.terrain_moutain_description, water: messages.terrain_water_description, building: messages.terrain_building_description, blocker: messages.terrain_blocker_description }
	const unitGroups: { name: (...parameters: any[]) => string; description: (...parameters: any[]) => string; ids: UnitTypeId[] }[] = [
		{ name: messages.infantry_group, description: messages.infantry_group_description, ids: ['infantry', 'infantry-rocket', 'infantry-sniper'] },
		{ name: messages.vehicles_group, description: messages.vehicles_group_description, ids: ['jeep', 'transport', 'artillery', 'tank', 'anti-air'] },
		{ name: messages.aircraft_group, description: messages.aircraft_group_description, ids: ['helicopter', 'transport-helicopter', 'plane'] },
		{ name: messages.naval_group, description: messages.naval_group_description, ids: ['attack-ship', 'transport-ship'] }
	]
	const terrainGroups: { name: (...parameters: any[]) => string; ids: Exclude<TerrainId, 'void'>[] }[] = [
		{ name: messages.ground_group, ids: ['road', 'grass', 'forest', 'moutain', 'blocker'] },
		{ name: messages.waterways_group, ids: ['water'] }
	]
	const unitStats = (unit: UnitDefinition): StatItem[] => [
		{ icon: 'icon-money', label: translate(messages.stat_cost), value: `${unit.cost}$` },
		{ icon: 'icon-health', label: translate(messages.stat_health), value: unit.maxHealth },
		{ icon: 'icon-movement', label: translate(messages.stat_movement), value: unit.movement },
		{ icon: 'icon-attack-capacity', label: translate(messages.stat_attacks), value: unit.attacks },
		{ icon: 'icon-attack-damage', label: translate(messages.stat_attack), value: unit.attack },
		{ icon: 'icon-defense', label: translate(messages.stat_defense), value: unit.defense },
		{ icon: 'icon-attack-range', label: translate(messages.stat_range), value: unit.attack ? `${unit.exclusion + 1}–${unit.range}` : '—' }
	]
	const terrainStats = (terrain: TerrainDefinition, rangeBonus = 0): StatItem[] => [{ icon: 'icon-movement', label: translate(messages.stat_movement), value: terrain === terrainTypes.blocker ? '∞' : terrain.cost }, { icon: 'icon-defense', label: translate(messages.stat_defense), value: terrain.defense }, ...(rangeBonus ? [{ icon: 'icon-attack-range', label: translate(messages.stat_range_bonus), value: `+${rangeBonus}` }] : [])]

	const buildings: { id: BuildingId; description: (...parameters: any[]) => string }[] = [
		{ id: 'city', description: messages.building_city_description },
		{ id: 'big-city', description: messages.building_big_city_description },
		{ id: 'hospital', description: messages.building_hospital_description },
		{ id: 'factory', description: messages.building_factory_description },
		{ id: 'airport', description: messages.building_airport_description },
		{ id: 'naval-base', description: messages.building_naval_base_description }
	]
	const maps = [
		{ id: 1, title: messages.map_1, text: messages.map_1_description },
		{ id: 2, title: messages.map_2, text: messages.map_2_description },
		{ id: 3, title: messages.map_3, text: messages.map_3_description },
		{ id: 4, title: messages.map_4, text: messages.map_4_description },
		{ id: 5, title: messages.map_5, text: messages.map_5_description },
		{ id: 6, title: messages.map_6, text: messages.map_6_description },
		{ id: 7, title: messages.map_7, text: messages.map_7_description },
		{ id: 8, title: messages.map_8, text: messages.map_8_description },
		{ id: 9, title: messages.map_9, text: messages.map_9_description },
		{ id: 10, title: messages.map_10, text: messages.map_10_description },
		{ id: 11, title: messages.map_11, text: messages.map_11_description },
		{ id: 12, title: messages.map_12, text: messages.map_12_description },
		{ id: 13, title: messages.map_13, text: messages.map_13_description },
		{ id: 14, title: messages.map_14, text: messages.map_14_description },
		{ id: 15, title: messages.map_15, text: messages.map_15_description },
		{ id: 16, title: messages.map_16, text: messages.map_16_description },
		{ id: 17, title: messages.map_17, text: messages.map_17_description },
		{ id: 18, title: messages.map_18, text: messages.map_18_description },
		{ id: 19, title: messages.map_19, text: messages.map_19_description },
		{ id: 20, title: messages.map_20, text: messages.map_20_description },
		{ id: 21, title: messages.map_21, text: messages.map_21_description },
		{ id: 22, title: messages.map_22, text: messages.map_22_description },
		{ id: 23, title: messages.map_23, text: messages.map_23_description },
		{ id: 24, title: messages.map_24, text: messages.map_24_description },
		{ id: 25, title: messages.map_25, text: messages.map_25_description },
		{ id: 26, title: messages.map_26, text: messages.map_26_description },
		{ id: 27, title: messages.map_27, text: messages.map_27_description },
		{ id: 28, title: messages.map_28, text: messages.map_28_description },
		{ id: 29, title: messages.map_29, text: messages.map_29_description },
		{ id: 30, title: messages.map_30, text: messages.map_30_description },
		{ id: 31, title: messages.map_31, text: messages.map_31_description },
		{ id: 35, title: messages.map_35, text: messages.map_35_description },
		{ id: 36, title: messages.map_36, text: messages.map_36_description }
	]
		.filter((map) => isMapInCatalog(map.id))
		.sort((firstMap, secondMap) => {
			const firstSize = mapPreviews[String(firstMap.id) as keyof typeof mapPreviews]
			const secondSize = mapPreviews[String(secondMap.id) as keyof typeof mapPreviews]
			return firstSize.cols * firstSize.rows - secondSize.cols * secondSize.rows || firstMap.id - secondMap.id
		})
	let showHelp = $state(false)
	let selectedMap = $state<number | null>(null)
	let filtersOpen = $state(false)
	const selectedSizes = $derived(
		browser
			? mapSizeBands
					.map((band) => band.label)
					.filter((size) =>
						page.url.searchParams
							.getAll('size')
							.flatMap((value) => value.split(','))
							.includes(size)
					)
			: []
	)
	const symmetricalOnly = $derived(browser && page.url.searchParams.get('symmetrical') === '1')
	const mobileFriendlyOnly = $derived(browser && page.url.searchParams.get('mobile') === '1')
	const activeFilterCount = $derived(selectedSizes.length + Number(symmetricalOnly) + Number(mobileFriendlyOnly))
	function updateFilters(sizes = selectedSizes, symmetrical = symmetricalOnly, mobile = mobileFriendlyOnly) {
		const url = new URL(page.url)
		const orderedSizes = mapSizeBands.map((band) => band.label).filter((size) => sizes.includes(size))
		if (orderedSizes.length) url.searchParams.set('size', orderedSizes.join(','))
		else url.searchParams.delete('size')
		if (symmetrical) url.searchParams.set('symmetrical', '1')
		else url.searchParams.delete('symmetrical')
		if (mobile) url.searchParams.set('mobile', '1')
		else url.searchParams.delete('mobile')
		void goto(url, { replaceState: true, noScroll: true, keepFocus: true, state: page.state })
	}
	function mapSize(id: number) {
		const { cols, rows } = mapPreviews[String(id) as keyof typeof mapPreviews]
		return mapSizeBands.find((band) => cols * rows <= band.maximum)?.label ?? 'XXL'
	}
	const filteredMaps = $derived(
		maps.filter((map) => {
			const details = mapDetails[String(map.id) as keyof typeof mapDetails]
			return (!selectedSizes.length || selectedSizes.includes(mapSize(map.id))) && (!symmetricalOnly || details.symmetrical) && (!mobileFriendlyOnly || details.mobileFriendly)
		})
	)
	function resetFilters() {
		updateFilters([], false, false)
	}
</script>

<svelte:head>
	<title>{translate(messages.page_title)}</title>
</svelte:head>
<div class="home-page">
	<main id="home">
		<header>
			<p class="eyebrow">{translate(messages.eyebrow)}</p>
			<p>{translate(messages.hero)}</p>
		</header>
		<SavedMatchCard />
		<section aria-labelledby="maps">
			<h2 id="maps">{translate(messages.choose_battlefield)}</h2>
			{#if dev}
				<p><a class="button" href={`${resolve('/play/[map]', { map: 'dev' })}/`}>{translate(messages.dev_map_open)}</a></p>
				{#if data.draftMaps.length}<p><a href="#draft-maps">{translate(messages.map_drafts)} ({data.draftMaps.length})</a></p>{/if}
			{/if}
			<div class="map-filters" role="group" aria-label={translate(messages.map_filters)}>
				<button class="filter-toggle" aria-expanded={filtersOpen} aria-controls="map-filter-options" onclick={() => (filtersOpen = !filtersOpen)}>{translate(messages.map_filter_toggle, { count: activeFilterCount })}</button>
				<div id="map-filter-options" class="filter-options" class:expanded={filtersOpen}>
					<fieldset class="size-filter">
						<legend>{translate(messages.map_filter_size)}</legend>
						<div class="size-options">
							<button class="filter-pill pixel-icon-control" aria-pressed={selectedSizes.length === 0} onclick={() => updateFilters([])}>{translate(messages.map_filter_all_sizes)}</button>
							{#each mapSizeBands as band}
								<label class="filter-pill"><input type="checkbox" checked={selectedSizes.includes(band.label)} onchange={(event) => updateFilters(event.currentTarget.checked ? [...selectedSizes, band.label] : selectedSizes.filter((size) => size !== band.label))} />{band.label}</label>
							{/each}
						</div>
					</fieldset>
					<fieldset class="tag-filters">
						<legend>{translate(messages.map_filter_tags)}</legend>
						<div class="size-options">
							<label class="filter-pill"><input type="checkbox" checked={symmetricalOnly} onchange={(event) => updateFilters(selectedSizes, event.currentTarget.checked)} />{translate(messages.map_symmetrical)}</label>
							<label class="filter-pill"><input type="checkbox" checked={mobileFriendlyOnly} onchange={(event) => updateFilters(selectedSizes, symmetricalOnly, event.currentTarget.checked)} />{translate(messages.map_mobile)}</label>
						</div>
					</fieldset>
				</div>
				<div class="filter-summary">
					<p class="filter-results" role="status">{translate(messages.map_filter_results, { count: filteredMaps.length, total: maps.length })}</p>
					<button class="pixel-icon-button" onclick={resetFilters} disabled={!selectedSizes.length && !symmetricalOnly && !mobileFriendlyOnly} aria-label={translate(messages.map_filter_reset)} title={translate(messages.map_filter_reset)}><UiIcon name="previous-action" /></button>
				</div>
			</div>
			<div class="maps">
				{#each filteredMaps as map (map.id)}
					{@const preview = mapPreviews[String(map.id) as keyof typeof mapPreviews]}
					<a
						class="panel map"
						href={`${resolve('/play/[map]', { map: String(map.id) })}/`}
						aria-haspopup="dialog"
						onclick={(event) => {
							if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
							event.preventDefault()
							selectedMap = map.id
						}}
					>
						<div class="map-thumbnail" aria-hidden="true"><img src={asset(`/assets/map-previews/map-${map.id}.png`)} alt="" width={preview.cols * 16} height={preview.rows * 16} loading="lazy" decoding="async" /></div>
						<MapCharacteristics details={mapDetails[String(map.id) as keyof typeof mapDetails]} />
						<span class="map-metadata">{mapSize(map.id)} · {preview.cols} × {preview.rows}</span>
						<h3 title={translate(map.title)}>{translate(map.title)}</h3>
						<p>{translate(map.text)}</p>
						<strong>{translate(messages.start_game)}</strong>
					</a>
				{:else}
					<p class="empty-maps">{translate(messages.map_filter_empty)}</p>
				{/each}
			</div>
		</section>
		{#if dev && data.draftMaps.length}
			<div id="draft-maps">
				{#await import('$lib/components/DraftMapGallery.svelte') then module}
					<module.default maps={data.draftMaps} />
				{/await}
			</div>
		{/if}
		<section class="panel map-editor-intro" aria-labelledby="editor-title">
			<h2 id="editor-title">{translate(messages.editor_title)}</h2>
			<p>{translate(messages.editor_description)}</p>
			<a class="button primary" href={resolve('/map-editor/', {})}>{translate(messages.editor_open)}</a>
		</section>
		<section class="panel">
			<h2 id="how-to-play">{translate(messages.how_to_play)}</h2>
			<p>{translate(messages.home_rules_1)}</p>
			<p>{translate(messages.home_rules_3)}</p>
			<p>{translate(messages.home_rules_2)}</p>
			<p>{translate(messages.home_rules_mobile)}</p>
			<button class="learn-more" aria-haspopup="dialog" onclick={() => (showHelp = true)}>{translate(messages.learn_more)}</button>
		</section>
		{#if showHelp}
			<HowToPlayModal keyboardLayout={preferences.keyboardLayout} onclose={() => (showHelp = false)} />
		{/if}
		{#if selectedMap !== null}
			<MatchSetupModal map={selectedMap} onclose={() => (selectedMap = null)} />
		{/if}
		<section>
			<h2 id="army">{translate(messages.your_army)}</h2>
			{#each unitGroups as group}
				<div class="catalog-group">
					<h3>{translate(group.name)}</h3>
					<p class="group-description">{translate(group.description)}</p>
					<div class="catalog">
						{#each group.ids as id}
							{@const unit = unitTypes[id]}
							<article class="panel">
								<img src={asset(`/assets/units/${id}-1.png`)} alt={unitName(id)} />
								<h4>{unitName(id)}</h4>
								<StatList items={unitStats(unit)} />
								<p class="stat-description">{translate(unitDescriptions[id])}</p>
							</article>
						{/each}
					</div>
				</div>
			{/each}
		</section>
		<section>
			<h2 id="terrain">{translate(messages.terrain)}</h2>
			{#each terrainGroups as group}
				<div class="catalog-group">
					<h3>{translate(group.name)}</h3>
					<div class="catalog">
						{#each group.ids as id}
							{@const terrain = terrainTypes[id]}
							<article class="panel">
								<TerrainIcon terrain={id} size={70} />
								<h4>{terrainName(id)}</h4>
								<StatList items={terrainStats(terrain, id === 'moutain' ? 1 : 0)} />
								<p class="stat-description">{translate(terrainDescriptions[id])}</p>
							</article>
						{/each}
					</div>
				</div>
			{/each}
			<div class="catalog-group">
				<h3>{translate(messages.buildings)}</h3>
				<div class="catalog">
					{#each buildings as building}
						<article class="panel">
							<TerrainIcon terrain={building.id} size={70} />
							<h4>{buildingName(building.id)}</h4>
							<StatList items={terrainStats(terrainTypes.building)} />
							<p class="stat-description">{translate(building.description)}</p>
						</article>
					{/each}
				</div>
			</div>
		</section>
	</main>
</div>

<style>
	.map-filters {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		gap: 20px 32px;
		margin: 24px 0;
	}
	.filter-toggle {
		display: none;
	}
	.filter-options {
		display: flex;
		flex-wrap: wrap;
		gap: 20px 32px;
		width: 100%;
	}
	@media (max-width: 640px) {
		.map-filters {
			gap: 12px;
		}
		.filter-toggle {
			display: block;
		}
		.filter-options:not(.expanded) {
			display: none;
		}
	}
	.filter-pill {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 44px;
		padding: 8px 12px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		cursor: pointer;
	}
	.filter-pill:has(input:checked),
	.filter-pill[aria-pressed='true'] {
		border-color: var(--color-accent);
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
	}
	.filter-pill:has(input:focus-visible) {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}
	.map-filters fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	.map-filters legend {
		padding: 0 0 8px;
		color: var(--color-muted);
		font-size: 14px;
	}
	.size-options {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.map-filters input {
		width: 18px;
		height: 18px;
		margin: 0;
		accent-color: var(--color-accent);
	}
	.filter-summary {
		flex-basis: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.filter-results {
		color: var(--color-muted);
		font-size: 14px;
		margin: 0;
	}
	.empty-maps {
		grid-column: 1 / -1;
		margin: 0;
	}
	.home-page {
		--home-section-spacing: 64px;
	}
	main,
	h2[id] {
		scroll-margin-top: calc(var(--site-nav-height) + 40px);
	}

	.map-editor-intro .button {
		margin-top: 8px;
	}
	main {
		max-width: 1320px;
		padding: 32px 20px;
		margin: auto;
	}

	header {
		padding: 32px 0 0;
		max-width: 730px;
	}

	.eyebrow {
		font-size: var(--font-size-ui);
		letter-spacing: 0.12em;
		color: var(--color-muted);
	}

	p {
		line-height: 1.7;
		color: var(--color-text);
	}

	section {
		margin: var(--home-section-spacing) 0 0;
	}

	.maps,
	.catalog {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		grid-auto-rows: 1fr;
		gap: 18px;

		@media (max-width: 1150px) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		@media (max-width: 880px) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		@media (max-width: 580px) {
			grid-template-columns: minmax(0, 1fr);
			grid-auto-rows: auto;
		}
	}

	.map {
		display: flex;
		flex-direction: column;
		padding: 22px;
		min-width: 0;
		text-decoration: none;
		transition:
			border-color 0.2s,
			background-color 0.2s;

		&:hover {
			border-color: var(--color-accent);
			background: color-mix(in srgb, var(--color-surface) 92%, var(--color-accent));
		}
	}

	.map span,
	.map strong {
		color: var(--color-accent);
	}
	.map-thumbnail {
		border: 1px solid var(--color-accent);
		aspect-ratio: 16 / 10;
		width: 100%;
		margin-bottom: 16px;
		background: var(--color-background);
		border-radius: 4px;
		overflow: hidden;
		img {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: contain;
			image-rendering: pixelated;
		}
	}
	.map-metadata {
		font-size: var(--font-size-ui);
	}

	.map p {
		margin-bottom: 24px;
	}
	.map h3 {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.map strong {
		margin-top: auto;
	}

	.catalog-group {
		margin-top: 24px;

		h3 {
			margin-bottom: 6px;
			color: var(--color-muted);
		}
	}

	.catalog {
		grid-auto-rows: auto;
	}

	.group-description {
		max-width: 720px;
		margin: 0 0 14px;
		font-size: var(--font-size-ui);
	}

	article {
		display: grid;
		grid-row: span 4;
		grid-template-rows: subgrid;
		row-gap: 0;
		min-width: 0;

		h4 {
			font-size: 18px;
			margin: 16px 0 0;
		}
	}

	article img {
		width: 70px;
		height: 70px;
		object-fit: contain;
		image-rendering: pixelated;
	}

	article p {
		font-size: 16px;
	}
</style>
