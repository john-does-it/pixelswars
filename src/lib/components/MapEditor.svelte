<script lang="ts">
	import { unitSpritePath } from '#lib/game/unit-sprites.js'
	import { onMount, tick, untrack } from 'svelte'
	import Modal from './Modal.svelte'
	import TextInput from './TextInput.svelte'
	import MatchSetupModal from './MatchSetupModal.svelte'
	import { library, saveLocalMap } from '#lib/map-editor/local-maps.svelte.js'
	import DimensionStepper from '#lib/components/site/DimensionStepper.svelte'
	import { resizeMap, reconnectEdgeRoads, hasStartingArmies, isLocalMapId } from '#lib/map-editor/model.ts'
	import { asset } from '#lib/game/asset-path.js'
	import { m as messages } from '#lib/paraglide/messages.js'
	import { translate, unitName } from '#lib/i18n.svelte.js'
	import { initializePreferences } from '#lib/preferences.svelte.js'
	import { unitTypes } from '#lib/game/catalog.js'
	import type { GameMap, MapCell, Owner, Player, UnitTypeId } from '#lib/game/types.js'
	import { mapJson, newMap, paintMirroredCell, mirrorMap, mirroredIndex, reconnectBridgeSupports, validateMirrorDimensions, readMap, terrainBrushes, MapEditorError, type Brush, type MirrorMode } from '#lib/map-editor/model.ts'

	let { sourceMap = null }: { sourceMap?: GameMap | null } = $props()
	const savedDraftKey = untrack(() => (sourceMap ? `pixelswar-map-editor-source-${sourceMap.id}-v1` : 'pixelswar-map-editor-draft-v1'))
	const unitTypeIds = Object.keys(unitTypes) as UnitTypeId[]
	type Picker = (typeof pickerGroups)[number]
	const pickerGroups = [
		{ kind: 'terrain', side: 0, label: 'terrain' },
		{ kind: 'building', side: 0, label: 'buildings' },
		{ kind: 'building', side: 2, label: 'buildings' },
		{ kind: 'building', side: 1, label: 'buildings' },
		{ kind: 'unit', side: 2, label: 'map_editor_units' },
		{ kind: 'unit', side: 1, label: 'map_editor_units' }
	] as const
	function tileIcon(classes: string[], player: Owner) {
		return ['cell-container', ...classes, classes.includes('-grass') ? '-variant' : '', classes.includes('-building') && player ? `-capturedby${player}` : ''].join(' ')
	}
	function pickBrush(picker: Picker, value: string) {
		if (picker.kind === 'unit') brush = { kind: 'unit', type: value as UnitTypeId, player: picker.side }
		else {
			const tile = terrainBrushes.find((candidate) => candidate.name === value)
			if (tile) brush = { kind: 'terrain', classes: [...tile.classes], owner: picker.side }
		}
	}

	let map = $state(newMap(25, 17))
	let columns = $state<number | undefined>(12)
	let rows = $state<number | undefined>(10)
	let tileSize = $state(48)
	let brush = $state<Brush>({ kind: 'terrain', classes: ['-grass'], owner: 0 })
	let history = $state<string[]>([])
	let mirrorMode = $state<MirrorMode>(untrack(() => (sourceMap ? 'off' : 'rotation')))
	let statusKey = $state('map_editor_draft_local')
	let statusError = $state(false)
	let hoveredCell = $state<number | null>(null)
	let board: HTMLDivElement
	let canvasScroll: HTMLDivElement
	let mirrorOnOwnRow = $state(false)
	let painting = false
	let lastPainted: number | null = null
	let strokeBrush: Brush = { kind: 'terrain', classes: ['-grass'], owner: 0 }
	let mounted = false
	const unitsByCell = $derived(new Map(map.units.map((unit) => [unit.cell, unit])))
	function t(key: string, inputs: Record<string, unknown> = {}): string {
		return translate(messages[key as keyof typeof messages], inputs)
	}
	function observeToolbar(toolbar: HTMLDivElement) {
		const pickers = toolbar.querySelector('.picker-groups')!
		const toggle = toolbar.querySelector('.mirror-switch')!
		const observer = new ResizeObserver(() => {
			mirrorOnOwnRow = toggle.getBoundingClientRect().top >= pickers.getBoundingClientRect().bottom
		})
		observer.observe(toolbar)
		return { destroy: () => observer.disconnect() }
	}
	async function fitMap() {
		if (!canvasScroll) return
		const style = getComputedStyle(canvasScroll)
		const width = canvasScroll.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
		tileSize = width / map.cols
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
			localStorage.setItem(savedDraftKey, JSON.stringify({ ...map, editorMirrorMode: mirrorMode }))
		} catch {
			notify('map_editor_save_failed', true)
		}
	}
	function remember() {
		history.push(JSON.stringify({ map, mirrorMode }))
		if (history.length > 60) history.shift()
	}
	function replaceMap(nextMap: GameMap, mode: MirrorMode = 'off') {
		reconnectEdgeRoads(nextMap)
		reconnectBridgeSupports(nextMap)
		map = nextMap
		void tick().then(fitMap)
		mirrorMode = mode
		columns = map.cols
		rows = map.rows
		hoveredCell = null
		saveDraft()
	}
	function undo() {
		const previous = history.pop()
		if (previous) {
			const snapshot = JSON.parse(previous)
			replaceMap(snapshot.map, snapshot.mirrorMode)
			notify('map_editor_undone')
		}
	}
	function handleShortcut(event: KeyboardEvent) {
		if (!(event.target instanceof Element && event.target.closest('.map-editor'))) return
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
			event.preventDefault()
			undo()
		}
	}
	function decorateBlankMap(next: GameMap) {
		for (const [index, cell] of next.cells.entries()) cell.classes = (index * 73) % 101 < 26 ? ['-grass', '-variant'] : ['-grass']
		return next
	}
	function createMap() {
		try {
			const nextMap = decorateBlankMap(newMap(Number(columns), Number(rows)))
			validateMirrorDimensions(nextMap.cols, nextMap.rows, mirrorMode)
			nextMap.name = t('map_editor_new_name')
			remember()
			replaceMap(nextMap, mirrorMode)
			notify('map_editor_new_notice')
		} catch (error) {
			reportError(error)
		}
	}

	function setMirrorMode(nextMode: MirrorMode) {
		finishStroke()
		try {
			const nextMap = mirrorMap($state.snapshot(map), nextMode)
			remember()
			replaceMap(nextMap, nextMode)
			notify(nextMode === 'off' ? 'map_editor_mirror_disabled' : 'map_editor_mirror_enabled')
		} catch (error) {
			reportError(error)
		}
	}
	function resizeDimension(dimension: 'cols' | 'rows', value: number) {
		finishStroke()
		try {
			const nextMap = resizeMap($state.snapshot(map), dimension === 'cols' ? value : map.cols, dimension === 'rows' ? value : map.rows, mirrorMode)
			remember()
			replaceMap(nextMap, mirrorMode)
			void fitMap()
			notify('map_editor_saved')
		} catch (error) {
			reportError(error)
		}
	}
	let saveStep = $state<'name' | 'saved' | 'play' | null>(null)
	let proposedName = $state('')
	let fileInput: HTMLInputElement
	let nameInput = $state<HTMLInputElement>()
	let saveError = $state('')

	export function editSavedMap(saved: GameMap) {
		remember()
		replaceMap(structuredClone($state.snapshot(saved)))
		notify('map_editor_loaded')
	}

	async function importMap(input: HTMLInputElement) {
		const file = input.files?.[0]
		if (!file) return
		input.value = ''
		try {
			if (file.size > 2 * 1024 * 1024) throw new MapEditorError('map_editor_too_large')
			const imported = readMap(await file.text())
			if (isLocalMapId(imported.id)) imported.id = 'local-' + crypto.randomUUID()
			remember()
			replaceMap(imported)
			notify('map_editor_imported')
		} catch (error) {
			reportError(error)
		}
	}

	async function askName() {
		proposedName = library.maps.find((saved) => saved.id === map.id)?.name ?? ''
		saveError = ''
		saveStep = 'name'
		await tick()
		nameInput?.focus()
		nameInput?.select()
	}

	function confirmSave(event: SubmitEvent) {
		event.preventDefault()
		const name = proposedName.trim()
		if (!name) return
		try {
			const saved = saveLocalMap(map, name)
			map.id = saved.id
			map.name = saved.name
			saveDraft()
			saveStep = 'saved'
		} catch (error) {
			saveError = error instanceof MapEditorError ? error.key : 'map_editor_save_failed'
		}
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
			notify(hasStartingArmies(map) ? 'map_editor_exported' : 'map_editor_exported_draft')
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
			for (let step = 1; step <= steps; step++) paintMirroredCell(map, (startRow + Math.round((rowDistance * step) / steps)) * map.cols + startColumn + Math.round((columnDistance * step) / steps), strokeBrush, mirrorMode)
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
		if (sourceMap) map = structuredClone(sourceMap)
		else {
			map.name = t('map_editor_new_name')
			decorateBlankMap(map)
		}
		try {
			const saved = localStorage.getItem(savedDraftKey)
			if (saved) {
				map = readMap(saved)
				mirrorMode = 'off'
				if (JSON.parse(saved).editorMirrorMode === 'rotation') {
					validateMirrorDimensions(map.cols, map.rows, 'rotation')
					mirrorMode = 'rotation'
				}
				notify('map_editor_restored')
			}
		} catch {
			notify('map_editor_restore_failed', true)
		}
		replaceMap(map, mirrorMode)
		const resize = new ResizeObserver(() => void fitMap())
		resize.observe(canvasScroll)
		return () => {
			resize.disconnect()
			finishStroke()
			mounted = false
		}
	})
</script>

<svelte:window onkeydown={handleShortcut} />
{#snippet spritePicker(picker: Picker)}
	{@const { kind, side } = picker}
	{@const label = kind === 'terrain' ? t(picker.label) : t(picker.label) + ' · ' + (side ? teamName(side) : t('map_editor_neutral'))}
	{@const tiles = terrainBrushes.filter((tile) => tile.classes.includes('-building') === (kind === 'building'))}
	{@const options = kind === 'unit' ? unitTypeIds.map((type) => ({ value: type, label: unitName(type), classes: '', image: asset(unitSpritePath(type, side)) })) : tiles.map((tile) => ({ value: tile.name, label: t(tile.name), classes: tileIcon(tile.classes, side), image: '' }))}
	{@const activeTile = brush.kind === 'terrain' ? brush.classes.join(' ') : ''}
	{@const value = brush.kind === 'unit' && kind === 'unit' && brush.player === side ? brush.type : brush.kind === 'terrain' && kind !== 'unit' && brush.owner === side ? tiles.find((tile) => tile.classes.join(' ') === activeTile)?.name : undefined}
	{@const selected = options.find((option) => option.value === value)}
	{@const iconClass = selected?.classes ?? (kind === 'unit' ? '' : tileIcon(tiles[0].classes, side))}
	{@const image = selected?.image ?? (kind === 'unit' ? asset(unitSpritePath('infantry', side)) : '')}
	<select id={kind + '-picker-' + side} class="sprite-picker {kind}-picker {iconClass}" aria-label={label} title={selected ? label + ' · ' + selected.label : label} value={value ?? ''} style:background-image={image ? `url("${image}")` : undefined} class:active-brush={!!selected} style:--ring-factor={1 / Math.sin(Math.PI / options.length)} onchange={(event) => pickBrush(picker, event.currentTarget.value)}>
		<option value="" disabled hidden>{label}</option>
		{#each options as option, index}
			<option class={option.classes} value={option.value} title={option.label} style:--angle={`${(360 * index) / options.length - 90}deg`} style:background-image={option.image ? `url("${option.image}")` : undefined}>{option.label}</option>
		{/each}
	</select>
{/snippet}
{#snippet pickerRow()}
	<div class="picker-groups">
		{#each pickerGroups as group}{@render spritePicker(group)}{/each}
	</div>
{/snippet}
{#snippet mirrorSwitch()}
	<button class="mirror-switch" id="mirror-mode" type="button" role="switch" aria-label={t('map_editor_mirror')} aria-checked={mirrorMode !== 'off'} onclick={() => setMirrorMode(mirrorMode === 'off' ? 'rotation' : 'off')}>
		<span class="switch-track" aria-hidden="true">
			<span class:visible={mirrorMode === 'off'}>{t('site_mirror_inactive')}</span>
			<span class:visible={mirrorMode !== 'off'}>{t('site_mirror_active')}</span>
		</span>
	</button>
{/snippet}
{#snippet boardCanvas()}
	<div id="canvas-scroll" bind:this={canvasScroll}>
		<div id="board" bind:this={board} role="group" aria-label={t('map_editor_board_label')} style:--tile-size={tileSize + 'px'} style:grid-template-columns={`repeat(${map.cols}, var(--tile-size))`} onpointerdown={startStroke} onpointermove={movePointer} onpointerleave={() => (hoveredCell = null)} onpointerup={finishStroke} onpointercancel={finishStroke} onlostpointercapture={finishStroke} oncontextmenu={(event) => event.preventDefault()}>
			{#each map.cells as cell, index}{@const unit = unitsByCell.get(index)}<button type="button" class="cell-container pixel-corners {cell.classes.join(' ')}{cell.owner ? ` -capturedby${cell.owner}` : ''}{cell.capturePoints < 20 ? ' -halfcaptured' : ''}" class:mirror-target={mirrorMode !== 'off' && hoveredCell !== null && (index === hoveredCell || index === mirroredIndex(map, hoveredCell, mirrorMode))} class:mirror-centre={mirrorMode !== 'off' && index === mirroredIndex(map, index, mirrorMode)} data-cell={index} aria-label={cellLabel(index, cell, unit)} onclick={(event) => paintWithKeyboard(event, index)}
					>{#if unit}<img src={asset(unitSpritePath(unit.type, unit.player))} alt="" draggable="false" />{/if}</button
				>{/each}
		</div>
	</div>
{/snippet}
<div class="map-editor embedded">
	<div class="compact-editor">
		<div class="brush-toolbar" use:observeToolbar class:stacked={mirrorOnOwnRow}>{@render pickerRow()}{@render mirrorSwitch()}</div>
		<div class="compact-board">
			{@render boardCanvas()}
			<div class="dimension-controls">
				<DimensionStepper label={t('map_editor_columns')} value={map.cols} min={mirrorMode === 'off' ? 2 : 3} max={mirrorMode === 'off' ? 32 : 31} step={mirrorMode === 'off' ? 1 : 2} onchange={(value) => resizeDimension('cols', value)} />
				<DimensionStepper label={t('map_editor_rows')} value={map.rows} min={mirrorMode === 'off' ? 2 : 3} max={mirrorMode === 'off' ? 32 : 31} step={mirrorMode === 'off' ? 1 : 2} onchange={(value) => resizeDimension('rows', value)} />
			</div>
			<div class="compact-actions">
				<input hidden type="file" accept=".json,application/json" bind:this={fileInput} onchange={(event) => importMap(event.currentTarget)} />
				<button class="site-action" onclick={createMap}>{t('site_reset')}</button>
				<button class="site-action" onclick={() => fileInput.click()}>{t('editor_import_file')}</button>
				<button class="site-action" onclick={exportMap}>{t('site_export')}</button>
				<button class="primary site-action" aria-label={t('editor_save_map')} aria-haspopup="dialog" onclick={askName}>{t('profile_save')}</button>
			</div>
			{#if statusError}<p role="alert" class="editor-error">{t(statusKey)}</p>{/if}
		</div>
	</div>
</div>

{#if saveStep === 'name'}
	<Modal title={t('editor_save_map')} onclose={() => (saveStep = null)}>
		<form class="name-form" onsubmit={confirmSave}>
			<label for="map-save-name">{t('map_editor_name')}</label>
			<TextInput id="map-save-name" bind:element={nameInput} bind:value={proposedName} placeholder={t('map_editor_new_name')} required maxlength={120} />
			{#if saveError}<p role="alert">{t(saveError)}</p>{/if}
			<button type="submit" class="primary" disabled={!proposedName.trim()}>{t('confirm')}</button>
		</form>
	</Modal>
{:else if saveStep === 'saved'}
	<Modal title={t('editor_map_saved', { name: map.name })} onclose={() => (saveStep = null)}>
		{#if !hasStartingArmies(map)}<p>{t('editor_armies_needed')}</p>{/if}
		<div class="save-choices">
			<button class="primary" disabled={!hasStartingArmies(map)} onclick={() => (saveStep = 'play')}>{t('editor_play_map')}</button>
			<button onclick={() => (saveStep = null)}>{t('editor_continue')}</button>
		</div>
	</Modal>
{:else if saveStep === 'play'}
	<MatchSetupModal map={map.id} localMap={map} onclose={() => (saveStep = null)} />
{/if}

<style>
	.name-form {
		--text-input-width: 100%;
		display: grid;
		gap: 12px;
	}
	.name-form button {
		justify-self: end;
	}
	.save-choices {
		display: flex;
		flex-wrap: wrap;
		gap: var(--action-gap);
	}
	.sprite-picker {
		box-shadow: none;
		min-height: 0;
		--option-size: 40px;
		width: 44px;
		height: 44px;
		min-width: 0;
		padding: 0;
		border: 3px solid var(--site-plum);
		border-image: none;
		border-radius: 50%;
		font-size: 0;
		background-color: var(--site-yellow);
		background-position: center;
		background-size: cover;
		background-repeat: no-repeat;
		image-rendering: pixelated;
		cursor: pointer;
	}
	.sprite-picker option {
		font-size: 1rem;
	}
	@supports (appearance: base-select) {
		.sprite-picker,
		.sprite-picker::picker(select) {
			appearance: base-select;
		}
		.sprite-picker::picker(select) {
			/* Leave one option width plus a gap between neighboring sprite centers. */
			--ring-span: calc((var(--option-size) + 6px) * var(--ring-factor));
			--diameter: calc(var(--ring-span) + var(--option-size) + 16px);
			--radius: calc(var(--ring-span) / 2);
			position: absolute;
			position-anchor: --editor-board;
			position-area: none;
			position-try-fallbacks: none;
			inset: auto;
			left: anchor(center);
			top: anchor(center);
			translate: -50% -50%;
			min-width: 0;
			width: var(--diameter);
			height: var(--diameter);
			max-height: none;
			margin: 0;
			padding: 0;
			border: 3px solid var(--site-plum);
			box-shadow: none;
			border-radius: 50%;
			background: var(--site-cream);
			overflow: visible;
		}
		.sprite-picker::picker-icon,
		.sprite-picker option::checkmark {
			display: none;
		}
		.sprite-picker option {
			position: absolute;
			left: calc(50% + var(--radius) * cos(var(--angle)));
			top: calc(50% + var(--radius) * sin(var(--angle)));
			translate: -50% -50%;
			width: var(--option-size);
			height: var(--option-size);
			min-width: 0;
			padding: 0;
			border: 3px solid var(--site-plum);
			box-shadow: none;
			border-radius: 50%;
			background-color: var(--site-cream);
			background-position: center;
			background-size: cover;
			background-repeat: no-repeat;
			font-size: 0;
			image-rendering: pixelated;
			pointer-events: auto;
			cursor: pointer;
		}
		.sprite-picker option:is(:hover, :focus-visible, :checked) {
			background-color: var(--site-yellow);
			outline: 2px solid var(--site-plum);
		}
		.sprite-picker:open {
			outline: 3px solid var(--site-plum);
			outline-offset: 2px;
		}

		.compact-editor:has(.sprite-picker:open) #board {
			filter: brightness(0.6);
		}

		@media (prefers-reduced-motion: no-preference) {
			.sprite-picker:open option:enabled {
				animation: reveal-unit 180ms ease-out;
			}
			@keyframes reveal-unit {
				from {
					left: 50%;
					top: 50%;
					scale: 0.55;
					opacity: 0;
				}
			}
		}
	}
	#board .mirror-centre {
		outline: 1px dashed var(--color-accent);
		outline-offset: -3px;
	}
	#board .mirror-target::before {
		background: var(--pixel-corner-frame);
	}
	#board {
		--color-accent: var(--site-yellow);
		--pixel-corner-color: var(--site-yellow);
	}
	#board {
		anchor-name: --editor-board;
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
	#board img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.embedded {
		font-size: 16px;
	}
	.compact-editor {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
		align-items: start;
	}
	.brush-toolbar,
	.picker-groups {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
	}
	.picker-groups {
		gap: 6px;
	}
	.picker-groups .active-brush {
		outline: 2px solid var(--player-blue);
		outline-offset: 1px;
	}
	.brush-toolbar {
		column-gap: 2em;
		justify-content: space-between;
		padding-inline: 10px;
	}
	.map-editor .mirror-switch {
		display: inline-flex;
		flex: 0 0 max-content;
		max-width: 100%;
		align-items: center;
		min-height: 44px;
		padding: 4px;
		border: 0;
		background: transparent;
		box-shadow: none;
		color: inherit;
	}
	/* Growing only after wrapping keeps the intrinsic width available for the next layout. */
	.brush-toolbar.stacked .mirror-switch {
		flex-grow: 1;
	}
	.mirror-switch::before,
	.mirror-switch::after {
		display: none;
	}
	.switch-track {
		--thumb-size: 20px;
		flex: auto;
		position: relative;
		display: grid;
		align-items: center;
		border: 4px solid var(--site-plum);
		background: #585962;
		color: var(--site-paper);
		font: 700 14px/1.4 var(--font-body);
	}
	.switch-track span {
		grid-area: 1 / 1;
		padding: 2px 8px 2px calc(var(--thumb-size) + 8px);
		visibility: hidden;
	}
	.switch-track span:last-child {
		padding-inline: 8px calc(var(--thumb-size) + 8px);
	}
	.switch-track .visible {
		visibility: visible;
	}
	.switch-track::before {
		content: '';
		position: absolute;
		inset-block: 0;
		left: 0;
		width: var(--thumb-size);
		background: var(--site-cream);
	}
	.mirror-switch[aria-checked='true'] .switch-track {
		background: var(--site-yellow);
		color: var(--site-plum);
	}
	.mirror-switch[aria-checked='true'] .switch-track::before {
		left: calc(100% - var(--thumb-size));
		background: var(--site-plum);
	}
	@media (prefers-reduced-motion: no-preference) {
		.switch-track::before {
			transition: left 120ms steps(4);
		}
	}
	.dimension-controls {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 16px;
		flex-wrap: wrap;
		margin: 16px 10px 0;
	}
	.compact-board {
		min-width: 0;
	}
	.embedded #canvas-scroll {
		border: 0;
		border-radius: 0;
		min-height: 0;
		max-height: none;
		padding: 10px;
		overflow: auto;
		background: transparent;
	}
	.embedded #board {
		margin: 0;
		box-shadow: 0 0 0 var(--site-board-border) var(--site-plum);
		isolation: isolate;
	}
	#board .cell-container:is(:hover, :focus-visible, .mirror-target) {
		z-index: 10;
	}
	.compact-actions {
		display: flex;
		justify-content: flex-end;
		align-items: start;
		flex-wrap: wrap;
		gap: var(--action-gap);
		margin: 24px 10px 0;
	}
	.editor-error {
		font-size: 12px;
		color: #92251e;
		margin-top: 12px;
	}
	@media (max-width: 900px) {
		.compact-editor {
			grid-template-columns: 1fr;
			gap: 24px;
		}
	}
</style>
