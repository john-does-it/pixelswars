import { difficulties, mapRevisions, type PlayerProfile } from './profile.ts'
import { isMapInCatalog } from './game/map-catalog.ts'
export const achievementIds = ['first-victory', 'easy-victory', 'medium-victory', 'hard-victory', 'expert-victory', 'five-battlefields', 'ten-battlefields', 'all-battlefields', 'map-master'] as const
export type AchievementId = (typeof achievementIds)[number]
/** Derived from existing records, so imports unlock the same medals without a second store. */
export function achievementProgress(profile: PlayerProfile) {
	const maps = Object.keys(mapRevisions).filter(isMapInCatalog)
	const current = profile.medals.filter((m) => maps.includes(m.map) && m.revision === mapRevisions[m.map])
	const wonMaps = new Set(current.map((m) => m.map))
	const mastery = maps.reduce((best, map) => Math.max(best, new Set(current.filter((m) => m.map === map).map((m) => m.difficulty)).size), 0)
	const counts: Record<AchievementId, [number, number]> = {
		'first-victory': [wonMaps.size, 1],
		'easy-victory': [Number(current.some((m) => m.difficulty === 'easy')), 1],
		'medium-victory': [Number(current.some((m) => m.difficulty === 'medium')), 1],
		'hard-victory': [Number(current.some((m) => m.difficulty === 'hard')), 1],
		'expert-victory': [Number(current.some((m) => m.difficulty === 'expert')), 1],
		'five-battlefields': [wonMaps.size, 5],
		'ten-battlefields': [wonMaps.size, 10],
		'all-battlefields': [wonMaps.size, maps.length],
		'map-master': [mastery, difficulties.length]
	}
	return achievementIds.map((id) => {
		const [value, target] = counts[id]
		return { id, value: Math.min(value, target), target, unlocked: target > 0 && value >= target }
	})
}
