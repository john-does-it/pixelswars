import { unitTypes } from './catalog.ts'
import type { Unit, UnitTypeId, Player } from './types.ts'

// Five equal health bands, relative to each unit type's maximum health.
export function damageStage(unit: Pick<Unit, 'type' | 'health'>): number {
	const ratio = unit.health / unitTypes[unit.type].maxHealth
	if (ratio > 0.8) return 0
	if (ratio > 0.6) return 1
	if (ratio > 0.4) return 2
	if (ratio > 0.2) return 3
	return 4
}

/** One source per unit, team and damage state, shared by every display size. */
export function unitSpritePath(type: UnitTypeId, player: Player, stage = 0): string {
	const color = player === 1 ? 'blue' : 'red'
	const damage = stage ? `damage-${stage}` : 'no-damage'
	const extension = type === 'artillery-ship' ? 'svg' : 'png'
	return `/assets/units/${type}/${color}/${type}-${color}-${damage}.${extension}`
}

export function unitSprite(unit: Pick<Unit, 'type' | 'player' | 'health'>): string {
	return unitSpritePath(unit.type, unit.player, damageStage(unit))
}
