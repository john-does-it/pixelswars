<script lang="ts">
	import { onMount, tick } from 'svelte'
	import UiIcon from '$lib/components/UiIcon.svelte'
	import ZoomControls from '$lib/components/ZoomControls.svelte'
	import { asset, resolve } from '$app/paths'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate, unitName, mapName } from '$lib/i18n.svelte.js'
	import { initializePreferences, preferences, updatePreferences, type Preferences } from '$lib/preferences.svelte.js'
	import { unitTypes } from '$lib/game/catalog.js'
	import type { GameMap, MapCell, Owner, Player, UnitTypeId } from '$lib/game/types.js'
	import { mapJson, newMap, paintCell, readMap, terrainBrushes, MapEditorError, type Brush } from '$lib/map-editor/model.ts'

	const savedDraftKey = 'pixelswar-map-editor-draft-v1'
	const unitTypeIds = Object.keys(unitTypes) as UnitTypeId[]
	const existingMaps = Object.values(import.meta.glob<{ default: GameMap }>('/src/lib/data/*.json', { eager: true }))
		.map((module) => module.default)
		.filter((candidate) => Array.isArray(candidate.cells))
		.sort((firstMap, secondMap) => Number(firstMap.id) - Number(secondMap.id))
	let map = $state(newMap(12, 10))
	let columns = $state<number | undefined>(12)
	let rows = $state<number | undefined>(10)
	let owner = $state<Owner>(0)
	let team = $state<Player>(1)
	let existingId = $state('')
	let tileSize = $state(48)
	let brush = $state<Brush>({ kind: 'terrain', classes: ['-grass'], owner: 0 })
	let history = $state<string[]>([])
	let statusKey = $state('map_editor_draft_local')
	let statusError = $state(false)
	let hoveredCell = $state<number | null>(null)
	let jsonOpen = $state(false)
	let board: HTMLDivElement
	let canvasScroll: HTMLDivElement
	const editorCamera = $derived({
		canZoomIn: tileSize < 80,
		canZoomOut: tileSize > 8,
		zoomIn: () => (tileSize = Math.min(80, tileSize + 8)),
		zoomOut: () => (tileSize = Math.max(8, tileSize - 8)),
		fit: fitMap
	})
	let jsonOutput: HTMLTextAreaElement
	let painting = false
	let lastPainted: number | null = null
	let strokeBrush: Brush = { kind: 'terrain', classes: ['-grass'], owner: 0 }
	let mounted = false
	const unitsByCell = $derived(new Map(map.units.map((unit) => [unit.cell, unit])))
	const brushName = $derived(brush.kind === 'unit' ? `${unitName(brush.type)} ${teamName(brush.player)}` : brush.kind === 'erase-unit' ? t('map_editor_eraser') : t(terrainBrushes.find((terrain) => brush.kind === 'terrain' && terrain.classes.join(' ') === brush.classes.join(' '))?.name ?? 'terrain_grass'))
	const jsonText = $derived.by(() => {
		if (!jsonOpen) return ''
		try {
			return mapJson(map)
		} catch {
			return ''
		}
	})

	function t(key: string, inputs: Record<string, unknown> = {}): string {
		return translate(messages[key as keyof typeof messages], inputs)
	}
	async function fitMap() {
		if (!canvasScroll) return
		const style = getComputedStyle(canvasScroll)
		const width = canvasScroll.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
		const height = Math.max(parseFloat(style.minHeight), parseFloat(style.maxHeight)) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth)
		tileSize = Math.max(1, Math.min(80, Math.floor(width / map.cols), Math.floor(height / map.rows)))
		await tick()
		canvasScroll.scrollTo({ left: 0, top: 0 })
	}
	function teamName(player: Player): string {
		return t(player === 1 ? 'map_editor_blue' : 'map_editor_red')
	}
	function coordinates(index: number): string {
		return t('map_editor_coordinates', { column: (index % map.cols) + 1, row: Math.floor(index / map.cols) + 1 })
	}
	function cellLabel(index: number, cell: MapCell, unit: GameMap['units'][number] | undefined): string {
		const terrain = t(cell.classes.includes('-water') ? 'terrain_water' : cell.classes.includes('-road') ? 'terrain_road' : ([...terrainBrushes].reverse().find((terrain) => terrain.classes.every((name) => cell.classes.includes(name)))?.name ?? 'terrain_grass'))
		return `${coordinates(index)} · ${terrain}${unit ? ` · ${unitName(unit.type)} ${teamName(unit.player)}` : ''}`
	}
	function notify(key: string, error = false) {
		statusKey = key
		statusError = error
	}
	function reportError(error: unknown) {
		notify(error instanceof MapEditorError ? error.key : error instanceof SyntaxError ? 'map_editor_error_json' : 'map_editor_load_failed', true)
	}
	function saveDraft() {
		try {
			localStorage.setItem(savedDraftKey, JSON.stringify(map))
		} catch {
			notify('map_editor_save_failed', true)
		}
	}
	function remember() {
		history.push(JSON.stringify(map))
		if (history.length > 60) history.shift()
	}
	function replaceMap(nextMap: GameMap) {
		map = nextMap
		columns = map.cols
		rows = map.rows
		hoveredCell = null
		saveDraft()
	}
	function undo() {
		const previous = history.pop()
		if (previous) {
			replaceMap(JSON.parse(previous))
			notify('map_editor_undone')
		}
	}
	function handleShortcut(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
			event.preventDefault()
			undo()
		}
	}
	function updateIdentity(property: 'id' | 'name', value: string) {
		remember()
		map[property] = value
		saveDraft()
	}
	function createMap() {
		try {
			const nextMap = newMap(Number(columns), Number(rows))
			nextMap.name = t('map_editor_new_name')
			remember()
			replaceMap(nextMap)
			notify('map_editor_new_notice')
		} catch (error) {
			reportError(error)
		}
	}
	function loadMap() {
		const selectedMap = existingMaps.find((candidate) => candidate.id === existingId)
		if (!selectedMap) return notify('map_editor_choose_map')
		remember()
		replaceMap(structuredClone(selectedMap))
		notify('map_editor_loaded')
	}
	async function importMap(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget
		const file = input.files?.[0]
		if (!file) return
		try {
			if (file.size > 2_000_000) throw new MapEditorError('map_editor_too_large')
			const importedMap = readMap(await file.text())
			if (!mounted) return
			remember()
			replaceMap(importedMap)
			notify('map_editor_imported')
		} catch (error) {
			if (mounted) reportError(error)
		}
		input.value = ''
	}
	function exportMap() {
		try {
			const json = mapJson(map)
			const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
			const link = document.createElement('a')
			link.href = url
			link.download = `board-${map.id}.json`
			link.click()
			setTimeout(() => URL.revokeObjectURL(url), 1000)
			const hasBothTeams = [1, 2].every((player) => map.units.some((unit) => unit.player === player))
			notify(hasBothTeams ? 'map_editor_exported' : 'map_editor_exported_draft')
		} catch (error) {
			reportError(error)
		}
	}
	async function copyJson() {
		try {
			const json = mapJson(map)
			try {
				await navigator.clipboard.writeText(json)
				notify('map_editor_copied')
			} catch {
				jsonOutput.focus()
				jsonOutput.select()
				notify('map_editor_copy_fallback')
			}
		} catch (error) {
			reportError(error)
		}
	}
	function cellUnderPointer(event: PointerEvent): number | null {
		const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-cell]')
		return target && board.contains(target) ? Number(target.dataset.cell) : null
	}
	function paintTo(index: number) {
		if (index === lastPainted) return
		const start = lastPainted ?? index
		const startColumn = start % map.cols
		const startRow = Math.floor(start / map.cols)
		const columnDistance = (index % map.cols) - startColumn
		const rowDistance = Math.floor(index / map.cols) - startRow
		const steps = Math.max(Math.abs(columnDistance), Math.abs(rowDistance), 1)
		try {
			for (let step = 1; step <= steps; step++) paintCell(map, (startRow + Math.round((rowDistance * step) / steps)) * map.cols + startColumn + Math.round((columnDistance * step) / steps), strokeBrush)
			notify('map_editor_saved')
		} catch (error) {
			reportError(error)
		}
		lastPainted = index
	}
	function startStroke(event: PointerEvent) {
		if (event.button !== 0 && event.button !== 2) return
		const index = cellUnderPointer(event)
		if (index === null) return
		event.preventDefault()
		remember()
		painting = true
		lastPainted = null
		strokeBrush = event.button === 2 ? (brush.kind === 'terrain' ? { kind: 'terrain', classes: ['-grass'], owner: 0 } : { kind: 'erase-unit' }) : structuredClone($state.snapshot(brush))
		board.setPointerCapture(event.pointerId)
		paintTo(index)
	}
	function movePointer(event: PointerEvent) {
		const index = cellUnderPointer(event)
		hoveredCell = index
		if (index === null) {
			lastPainted = null
			return
		}
		if (painting) paintTo(index)
	}
	function finishStroke() {
		if (painting) saveDraft()
		painting = false
		lastPainted = null
	}
	function paintWithKeyboard(event: MouseEvent, index: number) {
		if (event.detail !== 0) return
		remember()
		lastPainted = null
		strokeBrush = brush
		paintTo(index)
		lastPainted = null
		saveDraft()
	}
	onMount(() => {
		mounted = true
		initializePreferences()
		map.name = t('map_editor_new_name')
		try {
			const saved = localStorage.getItem(savedDraftKey)
			if (saved) {
				map = readMap(saved)
				notify('map_editor_restored')
			}
		} catch {
			notify('map_editor_restore_failed', true)
		}
		replaceMap(map)
		return () => {
			finishStroke()
			mounted = false
		}
	})
</script>

<svelte:head><title>Pixel’s War · {t('map_editor_title')}</title></svelte:head>
<svelte:window onkeydown={handleShortcut} />
<div class="map-editor">
	<header>
		<label class="language-select"
			><span>{t('language')}</span><select
				id="language"
				value={preferences.locale}
				onchange={(event) => {
					finishStroke()
					updatePreferences({ locale: event.currentTarget.value as Preferences['locale'] })
				}}
			>
				<option value="en">{t('language_english')}</option>
				<option value="de">{t('language_german')}</option>
				<option value="fr">{t('language_french')}</option>
			</select></label
		>
		<div class="header-content">
			<div>
				<a id="back-to-game" href={resolve('/', {})}>← Pixel’s War</a>
				<h1>{t('map_editor_title')}</h1>
				<p>{t('map_editor_tagline')}</p>
			</div>
			<div class="toolbar">
				<button class="pixel-icon-button" id="undo" aria-label={t('map_editor_undo')} title={t('map_editor_undo')} disabled={history.length === 0} onclick={undo}><UiIcon name="previous-action" /></button><button id="export" class="primary" onclick={exportMap}>{t('map_editor_export')}</button>
			</div>
		</div>
	</header>
	<main>
		<aside>
			<section>
				<h2>{t('map_editor_map')}</h2>
				<label>{t('map_editor_name')}<input id="name" maxlength="100" value={map.name} onchange={(event) => updateIdentity('name', event.currentTarget.value)} /></label>
				<div class="row">
					<label>ID<input id="map-id" inputmode="numeric" value={map.id} onchange={(event) => updateIdentity('id', event.currentTarget.value)} /></label><label>{t('map_editor_columns')}<input id="columns" type="number" min="2" max="32" bind:value={columns} /></label><label>{t('map_editor_rows')}<input id="rows" type="number" min="2" max="32" bind:value={rows} /></label>
				</div>
				<button id="new" onclick={createMap}>{t('map_editor_new')}</button>
				<details>
					<summary>{t('map_editor_start_from')}</summary>
					<label
						><span>{t('map_editor_existing')}</span><select id="existing" bind:value={existingId}>
							<option value="">{t('map_editor_choose')}</option>{#each existingMaps as existing}<option value={existing.id}>{existing.id} · {mapName(existing.id)} ({existing.cols} × {existing.rows})</option>{/each}
						</select></label
					><button id="load" onclick={loadMap}>{t('map_editor_load')}</button><label class="button file-label">{t('map_editor_import')}<input id="import" onchange={importMap} type="file" accept=".json,application/json" /></label>
				</details>
			</section>
			<section>
				<h2>{t('map_editor_terrains')}</h2>
				<div id="terrain-palette" class="palette">
					{#each terrainBrushes as terrain}<button type="button" data-brush={terrain.name} aria-label={t(terrain.name)} title={t(terrain.name)} aria-pressed={brush.kind === 'terrain' && brush.classes.join(' ') === terrain.classes.join(' ')} onclick={() => (brush = { kind: 'terrain', classes: [...terrain.classes], owner })}><span class="palette-icon cell-container {terrain.classes.join(' ')}" aria-hidden="true"></span></button>{/each}
				</div>
				<label
					><span>{t('map_editor_owner')}</span><select
						id="owner"
						value={owner}
						onchange={(event) => {
							owner = Number(event.currentTarget.value) as Owner
							if (brush.kind === 'terrain') brush.owner = owner
						}}
					>
						<option value={0}>{t('map_editor_neutral')}</option>
						<option value={1}>{t('map_editor_blue')}</option>
						<option value={2}>{t('map_editor_red')}</option>
					</select></label
				>
			</section>
			<section>
				<h2>{t('map_editor_units')}</h2>
				<label
					><span>{t('map_editor_team')}</span><select
						id="team"
						value={team}
						onchange={(event) => {
							team = Number(event.currentTarget.value) as Player
							if (brush.kind === 'unit') brush.player = team
						}}
					>
						<option value={1}>{t('map_editor_blue')}</option>
						<option value={2}>{t('map_editor_red')}</option>
					</select></label
				>
				<div id="unit-palette" class="palette">
					{#each unitTypeIds as unitType}<button type="button" data-brush={unitType} aria-label={unitName(unitType)} title={unitName(unitType)} aria-pressed={brush.kind === 'unit' && brush.type === unitType} onclick={() => (brush = { kind: 'unit', type: unitType, player: team })}><span class="palette-icon" style:background-image={`url('${asset('/assets/units/' + unitType + '-' + team + '-fit.png')}')`} aria-hidden="true"></span></button>{/each}
				</div>
				<button id="erase-unit" data-brush="erase-unit" aria-pressed={brush.kind === 'erase-unit'} onclick={() => (brush = { kind: 'erase-unit' })}>{t('map_editor_erase')}</button>
			</section>
		</aside>
		<div class="workspace">
			<div class="canvas-toolbar">
				<strong id="brush-name">{t('map_editor_brush', { name: brushName })}</strong><ZoomControls camera={editorCamera} />
			</div>
			<div id="canvas-scroll" bind:this={canvasScroll}>
				<div id="board" bind:this={board} role="group" aria-label={t('map_editor_board_label')} style:--tile-size={tileSize + 'px'} style:grid-template-columns={`repeat(${map.cols}, var(--tile-size))`} onpointerdown={startStroke} onpointermove={movePointer} onpointerup={finishStroke} onpointercancel={finishStroke} onlostpointercapture={finishStroke} oncontextmenu={(event) => event.preventDefault()}>
					{#each map.cells as cell, index}{@const unit = unitsByCell.get(index)}<button type="button" class="cell-container {cell.classes.join(' ')}{cell.owner ? ` -capturedby${cell.owner}` : ''}{cell.capturePoints < 20 ? ' -halfcaptured' : ''}" data-cell={index} aria-label={cellLabel(index, cell, unit)} onclick={(event) => paintWithKeyboard(event, index)}
							>{#if unit}<img src={asset('/assets/units/' + unit.type + '-' + unit.player + '.png')} alt="" draggable="false" />{/if}</button
						>{/each}
				</div>
			</div>
			<div class="canvas-footer"><span id="coordinates">{hoveredCell === null ? t('map_editor_paint_hint') : coordinates(hoveredCell)}</span><span id="counts">{t('map_editor_counts', { cols: map.cols, rows: map.rows, blue: map.units.filter((unit) => unit.player === 1).length, red: map.units.filter((unit) => unit.player === 2).length })}</span></div>
			<p id="status" role="status" class:error={statusError}>{t(statusKey)}</p>
			<details id="json-panel" bind:open={jsonOpen}>
				<summary>{t('map_editor_json_panel')}</summary>
				<textarea id="json-output" bind:this={jsonOutput} value={jsonText} aria-label={t('map_editor_json_label')} readonly rows="10"></textarea><button id="copy" onclick={copyJson}>{t('map_editor_copy')}</button>
			</details>
			<p class="hint">{t('map_editor_hint')}</p>
			<section class="submission" aria-labelledby="submit-map">
				<h2 id="submit-map">{t('map_editor_submit')}</h2>
				<ol>
					<li>{t('map_editor_submit_prepare')}</li>
					<li>{t('map_editor_submit_export')}</li>
					<li>{t('map_editor_submit_github')}</li>
				</ol>
				<div class="submission-links">
					<a class="button" href="https://github.com/john-does-it/pixelswars/issues/new?title=%5BMap%5D">{t('map_editor_github')}</a>
				</div>
				<p>{t('map_editor_review')}</p>
				<p>{t('map_editor_privacy')}</p>
			</section>
		</div>
	</main>
</div>

<style>
	.map-editor {
		font-size: 13px;
	}
	header {
		padding: 24px 28px;
		border-bottom: 1px solid var(--color-border);
	}
	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
	}
	h1 {
		margin: 0;
		font-size: 34px;
	}
	h2 {
		margin: 0 0 12px;
		font-size: 22px;
		color: var(--color-accent);
	}
	p {
		margin: 6px 0 0;
	}
	.submission {
		margin-top: 24px;
	}
	.submission li {
		margin-bottom: 12px;
	}
	.submission-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-block: 16px;
	}
	.toolbar,
	.row {
		display: flex;
		gap: 8px;
	}
	.toolbar {
		flex-wrap: wrap;
		align-items: center;
	}
	.language-select {
		display: inline-flex;
		align-items: center;
		margin: 0 0 18px;
		gap: 8px;
		font: 700 16px / 1.5 var(--font-display);
	}
	.language-select span {
		white-space: nowrap;
	}
	.language-select select {
		width: auto;
	}
	main {
		display: grid;
		grid-template-columns: 288px minmax(0, 1fr);
		gap: 24px;
		padding: 24px;
	}
	aside {
		display: grid;
		gap: 16px;
		align-content: start;
	}
	section {
		padding: 16px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
	}
	label {
		display: grid;
		gap: 5px;
		margin-bottom: 10px;
		min-width: 0;
		flex: 1;
	}
	input:not([type='range']),
	select {
		width: 100%;
		min-width: 0;
	}
	input:not([type='range']) {
		min-height: 36px;
		padding: 6px 8px;
		background: var(--color-background);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font: inherit;
	}
	section > button {
		width: 100%;
	}
	summary {
		cursor: pointer;
		color: var(--color-accent);
		padding: 12px 0;
	}
	.file-label {
		margin-top: 12px;
		text-align: center;
		cursor: pointer;
		&:has(input:focus-visible) {
			outline: 3px solid var(--color-accent);
			outline-offset: 3px;
		}
	}
	.file-label input[type='file'] {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}
	.palette {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 2px;
		margin-bottom: 14px;
	}
	.palette button {
		--button-background: transparent;
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		padding: 2px;
		border: 0;
		border-radius: 0;
		background: transparent;
		display: grid;
		place-items: center;
	}
	.palette button::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.palette button[aria-pressed='true']::after,
	.palette button:focus-visible::after {
		background: var(--pixel-corner-frame);
	}
	.palette button:focus-visible {
		outline: none;
	}
	@media (hover: hover) {
		.palette button:hover:not(:disabled) {
			background: transparent;
		}
		.palette button:hover:not(:disabled)::after {
			background: var(--pixel-corner-frame);
		}
	}
	.palette-icon {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		background-size: 100% 100%;
		image-rendering: pixelated;
	}
	#erase-unit[aria-pressed='true'] {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
		background: #56613b;
	}
	.workspace {
		min-width: 0;
		align-self: start;
		position: sticky;
		top: 16px;
	}
	.canvas-toolbar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 16px;
		margin-bottom: 12px;
	}
	.canvas-toolbar strong {
		flex: 1;
		color: var(--color-accent);
	}
	#canvas-scroll {
		max-height: calc(100vh - 290px);
		min-height: 260px;
		overflow: auto;
		padding: 24px;
		background: #1b271d;
		border: 1px solid var(--color-accent);
		border-radius: 5px;
	}
	#board {
		--tile-size: 48px;
		display: grid;
		width: max-content;
		margin: auto;
		touch-action: none;
		user-select: none;
	}
	#board button {
		position: relative;
		width: var(--tile-size);
		height: var(--tile-size);
		min-height: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		background-size: 100% 100%;
		image-rendering: pixelated;
		transition: none;
	}
	#board button:hover,
	#board button:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
		z-index: 1;
	}
	#board img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.canvas-footer {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 10px;
		color: var(--color-muted);
		font-size: 12px;
	}
	#status {
		margin-top: 22px;
		color: var(--color-accent);
	}
	#status.error {
		color: #ffabab;
	}
	.hint {
		color: var(--color-muted);
		font-size: 12px;
		max-width: 700px;
	}
	#json-output {
		width: 100%;
		resize: vertical;
		background: var(--color-surface);
		color: var(--color-text);
		font: 12px var(--font-body);
		padding: 12px;
		border: 1px solid var(--color-border);
	}
	@media (max-width: 780px) {
		header {
			padding: 18px;
		}
		.header-content {
			align-items: start;
			flex-direction: column;
		}
		main {
			grid-template-columns: 1fr;
			padding: 16px;
		}
		.workspace {
			position: static;
			grid-row: 1;
		}
		#canvas-scroll {
			max-height: 55vh;
			padding: 12px;
		}
		aside {
			grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		}
	}
</style>
