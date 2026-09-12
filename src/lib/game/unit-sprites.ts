import { unitTypes } from './catalog.ts'
import type { Unit } from './types.ts'

// Five equal health bands, relative to each unit type's maximum health.
export function damageStage(unit: Pick<Unit, 'type' | 'health'>): number {
	const ratio = unit.health / unitTypes[unit.type].maxHealth
	if (ratio > 0.8) return 0
	if (ratio > 0.6) return 1
	if (ratio > 0.4) return 2
	if (ratio > 0.2) return 3
	return 4
}

export function unitSprite(unit: Pick<Unit, 'type' | 'player' | 'health'>, fit = false): string {
	const stage = damageStage(unit)
	return `/assets/units/${unit.type}-${unit.player}${stage ? `-damage-${stage}` : ''}${fit ? '-fit' : ''}.png`
}
