import type { StatItem, UnitDefinition } from '#lib/game/types.js'
import { translate } from '#lib/i18n.svelte.js'
import { m as messages } from '#lib/paraglide/messages.js'

export function formatUnitRange(unit: UnitDefinition, minimum = unit.exclusion + 1, maximum = unit.range): string {
	if (!unit.attack) return '—'
	return minimum === maximum ? String(minimum) : `${minimum}–${maximum}`
}

export function captureBuildingStat(unit: UnitDefinition): StatItem {
	return { icon: 'icon-capture-capacity', label: translate(messages.stat_capture), value: translate(unit.captures ? messages.answer_yes : messages.answer_no) }
}
