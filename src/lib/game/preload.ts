import { browser } from '$app/env'
import { asset } from '#lib/game/asset-path.js'
import { unitTypes } from './catalog.ts'
import { productionBuilding } from './model.ts'
import type { GameState, Unit, UnitTypeId } from './types.ts'

let manifest: Promise<string[]> | undefined
type Priority = 'high' | 'low'
// Retain both the decoded image and the in-flight work across matches.
const sprites = new Map<string, { image: HTMLImageElement; ready: Promise<void> }>()

async function readManifest(): Promise<string[]> {
	const response = await fetch(asset('/assets/preload-manifest.json'), { cache: 'no-cache' })
	if (!response.ok) throw new Error(`Could not load sprite manifest: ${response.status}`)
	return response.json()
}

function prepareImage(path: string, priority: Priority): Promise<void> {
	const cached = sprites.get(path)
	if (cached) {
		if (priority === 'high') cached.image.fetchPriority = 'high'
		return cached.ready
	}

	const image = new Image()
	image.fetchPriority = priority
	const url = asset(path)
	const ready = (async () => {
		for (let attempt = 0; ; attempt++) {
			image.src = url
			try {
				await image.decode()
				return
			} catch (error) {
				if (attempt === 1) throw error
			}
		}
	})().catch((error) => {
		sprites.delete(path)
		throw error
	})
	sprites.set(path, { image, ready })
	return ready
}

function battlefieldSpritePrefixes(state: GameState): string[] {
	const prefixes = new Set(['/assets/icons/', '/assets/effects/', '/assets/units/infantry/', '/assets/cells/grass/'])
	const terrain = new Set(state.cells.map((cell) => cell.terrain))
	if (terrain.has('forest') || terrain.has('moutain')) prefixes.add('/assets/cells/terrain/')
	if (terrain.has('blocker')) prefixes.add('/assets/cells/cell-blocker-')
	if (terrain.has('road')) prefixes.add('/assets/cells/cell-road-')
	if (terrain.has('water')) {
		prefixes.add('/assets/cells/water/')
		prefixes.add('/assets/cells/water-shimmer/')
		prefixes.add('/assets/cells/cell-water-bridge-')
	}

	const buildings = new Set<string>()
	for (const cell of state.cells) if (cell.building) buildings.add(cell.building)
	for (const building of buildings) {
		// Includes both owners, partial captures and the matching light overlays.
		prefixes.add(`/assets/cells/buildings/cell-${building}-on-grass`)
		prefixes.add(`/assets/cells/cell-${building}-on-grass`)
		prefixes.add(`/assets/cells/building-lights/${building}-`)
	}

	function addArmy(units: Unit[]) {
		for (const unit of units) {
			prefixes.add(`/assets/units/${unit.type}/`)
			if (unit.cargo) addArmy(unit.cargo)
		}
	}
	addArmy(state.units)
	for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
		const production = productionBuilding(type)
		if (production && buildings.has(production)) prefixes.add(`/assets/units/${type}/`)
	}
	return [...prefixes]
}

async function prepareGroup(paths: string[], priority: Priority): Promise<void> {
	const results = await Promise.allSettled(paths.map((path) => prepareImage(path, priority)))
	const failures = results.filter((result) => result.status === 'rejected')
	if (failures.length)
		console.warn(
			'Game sprite preloading incomplete',
			failures.map((result) => result.reason)
		)
}

export async function preloadGameAssets(state: GameState): Promise<void> {
	if (!browser) return
	manifest ??= readManifest().catch((error) => {
		manifest = undefined
		throw error
	})
	try {
		const paths = await manifest
		const prefixes = battlefieldSpritePrefixes(state)
		const battlefield: string[] = []
		const remaining: string[] = []
		for (const path of paths) {
			if (prefixes.some((prefix) => path.startsWith(prefix))) battlefield.push(path)
			else remaining.push(path)
		}
		const ready = prepareGroup(battlefield, 'high')
		void prepareGroup(remaining, 'low')
		await ready
	} catch (error) {
		// An unavailable manifest must not lock players out of a cached match.
		console.warn('Game sprite preloading incomplete', error)
	}
}
