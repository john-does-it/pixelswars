import source from '$lib/data/not-the-shoes.json'
import { tutorialMap } from '$lib/game/tutorial'
import type { GameMap } from '$lib/game/types'

export const load = () => ({ map: tutorialMap(source as GameMap) })
