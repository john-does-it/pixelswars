import '../../src/lib/app.css'
import './style.css'
import { translate as t, translatePage, changeLocale, locale } from './i18n.ts'
import { unitTypes } from '../../src/lib/game/catalog.ts'
import type { GameMap, Owner, Player, UnitTypeId } from '../../src/lib/game/types.ts'
import { mapJson, newMap, paintCell, readMap, terrainBrushes, MapEditorError, type Brush } from './model.ts'

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const input = (id: string) => element<HTMLInputElement>(id)
const gameBase = import.meta.env.GAME_BASE ?? ''
element<HTMLAnchorElement>('back-to-game').href = `${gameBase}/`
const board = element<HTMLDivElement>('board')
const status = element<HTMLParagraphElement>('status')
const savedDraftKey = 'pixelswar-map-editor-draft-v1'
const existingMaps = Object.values(import.meta.glob<{ default: GameMap }>('../../src/lib/data/*.json', { eager: true }))
	.map((module) => module.default)
	.filter((map) => Array.isArray(map.cells))
	.sort((first, second) => Number(first.id) - Number(second.id))
let map = newMap(12, 10)
map.name = t('map_editor_new_name')
let brush: Brush = { kind: 'terrain', classes: ['-grass'], owner: 0 }
let statusKey = 'map_editor_draft_local'
const history: string[] = []
let painting = false
let lastPainted: number | null = null
let strokeBrush: Brush = brush

function notify(key: string, error = false) {
	statusKey = key
	status.textContent = t(key)
	status.classList.toggle('error', error)
}
function save() {
	if (element<HTMLDetailsElement>('json-panel').open) showJson()
	try {
		localStorage.setItem(savedDraftKey, JSON.stringify(map))
	} catch {
		notify('map_editor_save_failed', true)
	}
}
function showJson() {
	try {
		element<HTMLTextAreaElement>('json-output').value = mapJson(map)
	} catch (error) {
		element<HTMLTextAreaElement>('json-output').value = ''
		reportError(error)
	}
}
element<HTMLDetailsElement>('json-panel').ontoggle = showJson
element('copy').onclick = async () => {
	showJson()
	const output = element<HTMLTextAreaElement>('json-output')
	if (!output.value) return
	try {
		await navigator.clipboard.writeText(output.value)
		notify('map_editor_copied')
	} catch {
		output.focus()
		output.select()
		notify('map_editor_copy_fallback')
	}
}
function remember() {
	history.push(JSON.stringify(map))
	if (history.length > 60) history.shift()
	input('undo').disabled = false
}
function reportError(error: unknown) {
	notify(error instanceof MapEditorError ? error.key : error instanceof SyntaxError ? 'map_editor_error_json' : 'map_editor_load_failed', true)
}

function renderBoard() {
	const units = new Map(map.units.map((unit) => [unit.cell, unit]))
	const fragment = document.createDocumentFragment()
	map.cells.forEach((cell, index) => {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = `cell-container ${cell.classes.join(' ')}${cell.owner ? ` -capturedby${cell.owner}` : ''}${cell.capturePoints < 20 ? ' -halfcaptured' : ''}`
		button.dataset.cell = String(index)
		const unit = units.get(index)
		const terrain = t(cell.classes.includes('-water') ? 'terrain_water' : cell.classes.includes('-road') ? 'terrain_road' : ([...terrainBrushes].reverse().find((terrain) => terrain.classes.every((name) => cell.classes.includes(name)))?.name ?? 'terrain_grass'))
		button.setAttribute('aria-label', `${t('map_editor_coordinates', { column: (index % map.cols) + 1, row: Math.floor(index / map.cols) + 1 })} · ${terrain}${unit ? ` · ${unitName(unit.type)} ${teamName(unit.player)}` : ''}`)
		if (unit) {
			const sprite = document.createElement('img')
			sprite.src = `${gameBase}/assets/units/${unit.type}-${unit.player}.png`
			sprite.alt = ''
			sprite.draggable = false
			button.append(sprite)
		}
		fragment.append(button)
	})
	board.style.gridTemplateColumns = `repeat(${map.cols}, var(--tile-size))`
	board.replaceChildren(fragment)
	element('counts').textContent = t('map_editor_counts', { cols: map.cols, rows: map.rows, blue: map.units.filter((unit) => unit.player === 1).length, red: map.units.filter((unit) => unit.player === 2).length })
}
function renderMap() {
	input('name').value = map.name
	input('map-id').value = map.id
	input('columns').value = String(map.cols)
	input('rows').value = String(map.rows)
	renderBoard()
	save()
}
function activateBrush(nextBrush: Brush, name: string, button: HTMLButtonElement) {
	brush = nextBrush
	element('brush-name').textContent = t('map_editor_brush', { name })
	document.querySelectorAll<HTMLButtonElement>('[data-brush]').forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)))
}
function paletteButton(name: string, classes: string[], sprite?: string): HTMLButtonElement {
	const button = document.createElement('button')
	button.type = 'button'
	button.dataset.brush = name
	button.setAttribute('aria-pressed', 'false')
	const icon = document.createElement('span')
	icon.className = `palette-icon cell-container ${classes.join(' ')}`
	icon.setAttribute('aria-hidden', 'true')
	if (sprite) icon.style.backgroundImage = `url('${sprite}')`
	const label = document.createElement('span')
	label.textContent = name
	button.append(icon, label)
	return button
}
function renderTerrainPalette() {
	const palette = element('terrain-palette')
	palette.replaceChildren()
	for (const terrain of terrainBrushes) {
		const name = t(terrain.name)
		const button = paletteButton(name, terrain.classes)
		button.onclick = () => activateBrush({ kind: 'terrain', classes: terrain.classes, owner: Number(input('owner').value) as Owner }, name, button)
		palette.append(button)
		if (brush.kind === 'terrain' && brush.classes.join(' ') === terrain.classes.join(' ')) activateBrush(brush, name, button)
	}
}
function unitName(type: UnitTypeId): string {
	return t('unit_' + type.replaceAll('-', '_'))
}
function teamName(player: Player): string {
	return t(player === 1 ? 'map_editor_blue' : 'map_editor_red')
}
function renderUnitPalette() {
	const team = Number(input('team').value) as Player
	const palette = element('unit-palette')
	palette.replaceChildren()
	for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
		const button = paletteButton(unitName(type), [], `${gameBase}/assets/units/${type}-${team}-fit.png`)
		button.onclick = () => activateBrush({ kind: 'unit', type, player: team }, `${unitName(type)} ${teamName(team)}`, button)
		palette.append(button)
		if (brush.kind === 'unit' && brush.type === type) button.click()
	}
}
input('team').onchange = renderUnitPalette
input('owner').onchange = () => {
	if (brush.kind === 'terrain') brush.owner = Number(input('owner').value) as Owner
}
const eraser = element<HTMLButtonElement>('erase-unit')
eraser.dataset.brush = 'erase-unit'
eraser.setAttribute('aria-pressed', 'false')
eraser.onclick = () => activateBrush({ kind: 'erase-unit' }, t('map_editor_eraser'), eraser)

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
	renderBoard()
}
board.onpointerdown = (event) => {
	if (event.button !== 0 && event.button !== 2) return
	const index = cellUnderPointer(event)
	if (index === null) return
	event.preventDefault()
	remember()
	painting = true
	lastPainted = null
	strokeBrush = event.button === 2 ? (brush.kind === 'terrain' ? { kind: 'terrain', classes: ['-grass'], owner: 0 } : { kind: 'erase-unit' }) : structuredClone(brush)
	board.setPointerCapture(event.pointerId)
	paintTo(index)
}
board.onpointermove = (event) => {
	const index = cellUnderPointer(event)
	if (index === null) {
		lastPainted = null
		return
	}
	element('coordinates').textContent = t('map_editor_coordinates', { column: (index % map.cols) + 1, row: Math.floor(index / map.cols) + 1 })
	if (painting) paintTo(index)
}
function finishStroke() {
	if (painting) save()
	painting = false
	lastPainted = null
}
board.onpointerup = finishStroke
board.onpointercancel = finishStroke
board.onlostpointercapture = finishStroke
board.oncontextmenu = (event) => event.preventDefault()
board.onclick = (event) => {
	// Pointer strokes are handled above; keyboard activation paints one focused cell.
	if (event.detail !== 0) return
	const target = (event.target as Element).closest<HTMLElement>('[data-cell]')
	if (!target) return
	const index = Number(target.dataset.cell)
	remember()
	lastPainted = null
	strokeBrush = brush
	paintTo(index)
	lastPainted = null
	save()
	board.querySelector<HTMLButtonElement>(`[data-cell="${index}"]`)?.focus()
}
function undo() {
	const previous = history.pop()
	if (previous) {
		map = JSON.parse(previous)
		renderMap()
		notify('map_editor_undone')
	}
	input('undo').disabled = history.length === 0
}
element('undo').onclick = undo
document.addEventListener('keydown', (event) => {
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
		event.preventDefault()
		undo()
	}
})
for (const id of ['name', 'map-id'])
	input(id).onchange = () => {
		remember()
		map.name = input('name').value
		map.id = input('map-id').value
		save()
	}
element('new').onclick = () => {
	try {
		const next = newMap(Number(input('columns').value), Number(input('rows').value))
		next.name = t('map_editor_new_name')
		remember()
		map = next
		renderMap()
		notify('map_editor_new_notice')
	} catch (error) {
		reportError(error)
	}
}
function renderExistingMaps() {
	const select = element<HTMLSelectElement>('existing')
	const selected = select.value
	select.replaceChildren(new Option(t('map_editor_choose'), ''))
	for (const existing of existingMaps) select.add(new Option(`${existing.id} · ${t('map_' + existing.id)} (${existing.cols} × ${existing.rows})`, existing.id))
	select.value = selected
}
element('load').onclick = () => {
	const selected = existingMaps.find((candidate) => candidate.id === input('existing').value)
	if (!selected) return notify('map_editor_choose_map')
	remember()
	map = structuredClone(selected)
	renderMap()
	notify('map_editor_loaded')
}
input('import').onchange = async () => {
	const file = input('import').files?.[0]
	if (!file) return
	try {
		if (file.size > 2_000_000) throw new MapEditorError('map_editor_too_large')
		const imported = readMap(await file.text())
		remember()
		map = imported
		renderMap()
		notify('map_editor_imported')
	} catch (error) {
		reportError(error)
	}
	input('import').value = ''
}
element('export').onclick = () => {
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
input('zoom').oninput = () => board.style.setProperty('--tile-size', `${input('zoom').value}px`)
input('grid').onchange = () => board.classList.toggle('show-grid', input('grid').checked)
try {
	const saved = localStorage.getItem(savedDraftKey)
	if (saved) {
		map = readMap(saved)
		notify('map_editor_restored')
	}
} catch {
	notify('map_editor_restore_failed', true)
}
renderMap()
renderLanguage()

function renderLanguage() {
	translatePage()
	input('language').value = locale
	renderTerrainPalette()
	renderUnitPalette()
	renderExistingMaps()
	if (brush.kind === 'erase-unit') activateBrush(brush, t('map_editor_eraser'), eraser)
	renderBoard()
	element('coordinates').textContent = t('map_editor_paint_hint')
	notify(statusKey, status.classList.contains('error'))
}
input('language').onchange = () => {
	finishStroke()
	changeLocale(input('language').value)
	renderLanguage()
}
