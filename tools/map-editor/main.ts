import '../../src/lib/app.css'
import './style.css'
import { unitTypes } from '../../src/lib/game/catalog.ts'
import type { GameMap, Owner, Player, UnitTypeId } from '../../src/lib/game/types.ts'
import { mapJson, newMap, paintCell, readMap, terrainBrushes, type Brush } from './model.ts'

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const input = (id: string) => element<HTMLInputElement>(id)
const gameBase = import.meta.env.GAME_BASE ?? ''
element<HTMLAnchorElement>('back-to-game').href = `${gameBase}/`
const board = element<HTMLDivElement>('board')
const status = element<HTMLParagraphElement>('status')
const savedDraftKey = 'pixelswar-map-editor-draft-v1'
const existingMaps = Object.values(import.meta.glob<{ default: GameMap }>('../../src/lib/data/board-*.json', { eager: true }))
	.map((module) => module.default)
	.sort((first, second) => Number(first.id) - Number(second.id))
let map = newMap(12, 10)
let brush: Brush = { kind: 'terrain', classes: ['-grass'], owner: 0 }
let brushName = 'Herbe'
const history: string[] = []
let painting = false
let lastPainted: number | null = null
let strokeBrush: Brush = brush

function notify(message: string, error = false) {
	status.textContent = message
	status.classList.toggle('error', error)
}
function save() {
	if (element<HTMLDetailsElement>('json-panel').open) showJson()
	try {
		localStorage.setItem(savedDraftKey, JSON.stringify(map))
	} catch {
		notify('Sauvegarde locale indisponible : pense à exporter ton JSON.', true)
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
		notify('JSON copié.')
	} catch {
		output.focus()
		output.select()
		notify('Sélectionne Copier dans le navigateur ou utilise Ctrl/Cmd + C.')
	}
}
function remember() {
	history.push(JSON.stringify(map))
	if (history.length > 60) history.shift()
	input('undo').disabled = false
}
function reportError(error: unknown) {
	notify(error instanceof Error ? error.message : 'Impossible de charger cette carte.', true)
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
		const terrain = cell.classes.includes('-water') ? 'Eau' : cell.classes.includes('-road') ? 'Route' : ([...terrainBrushes].reverse().find((terrain) => terrain.classes.every((name) => cell.classes.includes(name)))?.name ?? 'Terrain')
		button.setAttribute('aria-label', `C${(index % map.cols) + 1} L${Math.floor(index / map.cols) + 1} · ${terrain}${unit ? ` · ${unitTypes[unit.type].name} ${unit.player === 1 ? 'bleu' : 'rouge'}` : ''}`)
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
	element('counts').textContent = `${map.cols} × ${map.rows} · Bleus ${map.units.filter((unit) => unit.player === 1).length} / Rouges ${map.units.filter((unit) => unit.player === 2).length}`
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
	brushName = name
	element('brush-name').textContent = `Pinceau : ${name}`
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
for (const terrain of terrainBrushes) {
	const button = paletteButton(terrain.name, terrain.classes)
	button.onclick = () => activateBrush({ kind: 'terrain', classes: terrain.classes, owner: Number(input('owner').value) as Owner }, terrain.name, button)
	if (terrain.name === brushName) button.setAttribute('aria-pressed', 'true')
	element('terrain-palette').append(button)
}
function renderUnitPalette() {
	const team = Number(input('team').value) as Player
	const palette = element('unit-palette')
	palette.replaceChildren()
	for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
		const button = paletteButton(unitTypes[type].name, [], `${gameBase}/assets/units/${type}-${team}-fit.png`)
		button.onclick = () => activateBrush({ kind: 'unit', type, player: team }, `${unitTypes[type].name} ${team === 1 ? 'bleu' : 'rouge'}`, button)
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
eraser.onclick = () => activateBrush({ kind: 'erase-unit' }, 'Gomme d’unité', eraser)

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
		notify('Brouillon enregistré dans ce navigateur.')
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
	element('coordinates').textContent = `Colonne ${(index % map.cols) + 1} · Ligne ${Math.floor(index / map.cols) + 1}`
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
		notify('Dernière modification annulée.')
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
		remember()
		map = next
		renderMap()
		notify('Nouvelle grille. Annuler permet de retrouver la précédente.')
	} catch (error) {
		reportError(error)
	}
}
for (const existing of existingMaps) {
	const option = document.createElement('option')
	option.value = existing.id
	option.textContent = `${existing.id} · ${existing.name} (${existing.cols} × ${existing.rows})`
	element('existing').append(option)
}
element('load').onclick = () => {
	const selected = existingMaps.find((candidate) => candidate.id === input('existing').value)
	if (!selected) return notify('Choisis une carte à charger.')
	remember()
	map = structuredClone(selected)
	renderMap()
	notify('Copie chargée : le fichier original reste intact.')
}
input('import').onchange = async () => {
	const file = input('import').files?.[0]
	if (!file) return
	try {
		if (file.size > 2_000_000) throw new Error('Le fichier est trop volumineux (maximum 2 Mo).')
		const imported = readMap(await file.text())
		remember()
		map = imported
		renderMap()
		notify('Carte importée.')
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
		notify(hasBothTeams ? 'JSON exporté. Tu peux le transmettre pour intégrer la carte au jeu.' : 'JSON exporté comme brouillon : ajoute des unités des deux camps avant de jouer.')
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
		notify('Ton dernier brouillon a été restauré.')
	}
} catch {
	notify('Le brouillon précédent est indisponible. Tu peux importer un JSON.', true)
}
renderMap()
renderUnitPalette()
