import { readMap } from '../map-editor/model.ts'
import { initialState, movementCost } from './model.ts'
import { applySnapshot, matchSnapshot } from './online.ts'
import { isUnitTypeId, unitTypes } from './catalog.ts'
import { getAiPlanning, restoreAiPlanning, type PlanningMemory } from './ai-economy.ts'
import type { AiDifficulty, GameMap, GameState } from './types.ts'

export const savedMatchKey = 'pixelswars-saved-match'
export const maxSavedMatchBytes = 2 * 1024 * 1024
export interface SavedMatch {
	format: 'pixelswars-match'
	version: 1
	id: string
	savedAt: string
	difficulty: AiDifficulty
	// Embed the original layout so later map edits cannot move the battlefield
	// beneath a saved army. Version covers changes to the rules/save schema.
	map: GameMap
	snapshot: ReturnType<typeof matchSnapshot>
	planning: PlanningMemory | null
}

export function createSavedMatch(map: GameMap, state: GameState, difficulty: AiDifficulty, id: string, now = new Date().toISOString()): SavedMatch {
	if (state.network || state.moving || state.fighting || state.winner !== null) throw new Error('unsafe')
	return JSON.parse(JSON.stringify({ format: 'pixelswars-match', version: 1, id, savedAt: now, difficulty, map, snapshot: matchSnapshot(state), planning: getAiPlanning(state) }))
}

export function parseSavedMatch(raw: string): SavedMatch {
	if (new TextEncoder().encode(raw).length > maxSavedMatchBytes) throw new Error('invalid')
	const save = JSON.parse(raw) as SavedMatch
	if (!save || save.format !== 'pixelswars-match') throw new Error('invalid')
	if (save.version !== 1) throw new Error('version')
	if (typeof save.id !== 'string' || !/^[\w-]{1,80}$/.test(save.id) || typeof save.savedAt !== 'string' || !Number.isFinite(Date.parse(save.savedAt)) || !['easy', 'medium', 'hard', 'expert'].includes(save.difficulty)) throw new Error('invalid')
	const map = readMap(JSON.stringify(save.map))
	if (map.name.length > 120) throw new Error('invalid')
	const state = initialState(map)
	if (!applySnapshot(state, save.snapshot) || state.moving || state.fighting || state.winner !== null || state.bridgeTransit != null) throw new Error('invalid')
	if (state.player !== (state.round % 2 ? 1 : 2) || state.round > 100000 || !Number.isSafeInteger(state.nextId) || state.money[1] > 1e9 || state.money[2] > 1e9) throw new Error('invalid')
	for (const unit of state.units.flatMap((unit) => [unit, ...(unit.cargo ?? [])])) {
		const definition = unitTypes[unit.type]
		if (unit.id >= state.nextId || unit.health <= 0 || unit.health > definition.maxHealth || unit.movement > definition.movement || !Number.isInteger(unit.attacks) || unit.attacks > definition.attacks || !Number.isInteger(unit.capture) || unit.capture > (definition.captures ? 1 : 0)) throw new Error('invalid')
	}
	if (![1, 2].every((player) => state.units.some((unit) => unit.player === player))) throw new Error('invalid')
	if (state.units.some((unit) => !Number.isFinite(movementCost(unit, state.cells[unit.cell])))) throw new Error('invalid')
	if (state.origin) {
		const selected = state.units.find((unit) => unit.id === state.selectedId)
		if (!selected || state.origin.movement > unitTypes[selected.type].movement || state.units.some((unit) => unit.id !== selected.id && unit.cell === state.origin!.cell) || !Number.isFinite(movementCost(selected, state.cells[state.origin.cell]))) throw new Error('invalid')
	}
	if (save.planning !== null) {
		const memory = save.planning
		if (!memory || typeof memory !== 'object' || !memory.unitPreferences || typeof memory.unitPreferences !== 'object' || Array.isArray(memory.unitPreferences) || !Object.entries(memory.unitPreferences).every(([type, weight]) => isUnitTypeId(type) && typeof weight === 'number' && weight >= 0.94 && weight <= 1.06) || !Array.isArray(memory.recentPurchases) || memory.recentPurchases.length > 4 || !memory.recentPurchases.every(isUnitTypeId)) throw new Error('invalid')
	}
	return { format: 'pixelswars-match', version: 1, id: save.id, savedAt: save.savedAt, difficulty: save.difficulty, map, snapshot: matchSnapshot(state), planning: save.planning }
}

export function restoreSavedMatch(save: SavedMatch): GameState {
	const state = initialState(save.map)
	applySnapshot(state, JSON.parse(JSON.stringify(save.snapshot)))
	// Animation decorations and dialogs never resume in the middle of a frame.
	state.incomeCells = []
	state.healedCells = {}
	state.capturedCells = []
	state.securedCells = []
	state.explosion = null
	state.combatSourceIndex = null
	state.combatTargetIndex = null
	state.productionIndex = null
	restoreAiPlanning(state, save.planning)
	return state
}

export type MatchStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export function readSavedMatch(storage: MatchStorage): { raw: string | null; save: SavedMatch | null; error: string | null } {
	let raw: string | null = null
	try {
		raw = storage.getItem(savedMatchKey)
		return { raw, save: raw ? parseSavedMatch(raw) : null, error: null }
	} catch (error) {
		return { raw, save: null, error: raw ? (error instanceof Error && error.message === 'version' ? 'version' : 'invalid') : 'storage' }
	}
}

// Each mounted match keeps its own last-written value. A stale tab must never
// silently overwrite a newer session, imported file, or explicit deletion.
export function createMatchWriter(storage: MatchStorage, initialRaw: string | null) {
	let expected = initialRaw
	let previousContent: string | undefined
	return (save: SavedMatch | null) => {
		if (storage.getItem(savedMatchKey) !== expected) throw new Error('conflict')
		// Pointer previews and settings can trigger the observer without changing
		// the match. Avoid rewriting storage (and the save time) for those updates.
		const content = JSON.stringify(save ? { ...save, savedAt: undefined } : null)
		if (content === previousContent) return
		const raw = save ? JSON.stringify(save) : null
		if (raw && new TextEncoder().encode(raw).length > maxSavedMatchBytes) throw new Error('storage')
		if (raw === null) storage.removeItem(savedMatchKey)
		else storage.setItem(savedMatchKey, raw)
		expected = raw
		previousContent = content
	}
}
