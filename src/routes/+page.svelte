<script lang="ts">
	import { resolve } from '$app/paths'
	import { asset } from '$lib/game/asset-path'
	import { dev } from '$app/environment'
	import { unitTypes, terrainTypes } from '$lib/game/catalog.js'
	import TerrainIcon from '$lib/components/TerrainIcon.svelte'
	import StatList from '$lib/components/StatList.svelte'
	import mapPreviews from '$lib/data/map-previews.json'
	import HomeNavbar from '$lib/components/HomeNavbar.svelte'
	import HowToPlayModal from '$lib/components/HowToPlayModal.svelte'
	import MatchSetupModal from '$lib/components/MatchSetupModal.svelte'
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
		{ id: 26, title: messages.map_26, text: messages.map_26_description }
	].sort((firstMap, secondMap) => {
		const firstSize = mapPreviews[String(firstMap.id) as keyof typeof mapPreviews]
		const secondSize = mapPreviews[String(secondMap.id) as keyof typeof mapPreviews]
		return firstSize.cols * firstSize.rows - secondSize.cols * secondSize.rows || firstMap.id - secondMap.id
	})
	let showHelp = $state(false)
	let selectedMap = $state<number | null>(null)
</script>

<svelte:head>
	<title>{translate(messages.page_title)}</title>
</svelte:head>
<div class="home-page">
	<HomeNavbar />
	<main id="home">
		<header>
			<p class="eyebrow">{translate(messages.eyebrow)}</p>
			<p>{translate(messages.hero)}</p>
		</header>
		<section aria-labelledby="maps">
			<h2 id="maps">{translate(messages.choose_battlefield)}</h2>
			{#if dev}
				<p><a class="button" href={`${resolve('/play/[map]', { map: 'dev' })}/`}>{translate(messages.dev_map_open)}</a></p>
			{/if}
			<div class="maps">
				{#each maps as map}
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
						<span class="map-metadata">{mapSizeBands.find((band) => preview.cols * preview.rows <= band.maximum)?.label ?? 'XXL'} · {preview.cols} × {preview.rows}</span>
						<h3>{translate(map.title)}</h3>
						<p>{translate(map.text)}</p>
						<strong>{translate(messages.start_game)}</strong>
					</a>
				{/each}
			</div>
		</section>
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
		<footer id="credits">
			<p>{translate(messages.programming)}: <a href="https://johndoesit.be" target="_blank" rel="noopener noreferrer">John Does it</a> · {translate(messages.graphics)}: <a href="https://kenney.nl/assets/tiny-battle" target="_blank" rel="noopener noreferrer">Kenney</a>, <a href="https://bdragon1727.itch.io" target="_blank" rel="noopener noreferrer">bdragon1727</a> · {translate(messages.sounds)}: <a href="https://pixabay.com/fr/sound-effects" target="_blank" rel="noopener noreferrer">Pixabay</a> · {translate(messages.music)}: <a href="https://arcofdream.bandcamp.com/album/monolith-official-soundtrack" target="_blank" rel="noopener noreferrer">Monolith</a> · {translate(messages.quality_assurance)}: Gauthier Miessen</p>
			<p>{translate(messages.feedback)}: <a href="https://github.com/john-does-it/pixelswars/issues" target="_blank" rel="noopener noreferrer">GitHub</a></p>
			<p><a href={resolve('/terms/', {})}>{translate(messages.legal_title)}</a></p>
		</footer>
	</main>
</div>

<style>
	.home-page {
		--home-nav-height: 72px;
		--home-section-spacing: 64px;
		padding-top: var(--home-nav-height);
	}
	main,
	h2[id],
	footer[id] {
		scroll-margin-top: calc(var(--home-nav-height) + 40px);
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

	footer {
		font-size: var(--font-size-ui);
		margin-top: var(--home-section-spacing);

		a {
			text-decoration: underline;
		}
	}
</style>
