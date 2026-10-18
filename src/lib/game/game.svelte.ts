import { createTutorialController, type TutorialScenario, type TutorialProgress, type TutorialController } from './tutorial.ts'
import { initialState } from './model.ts'
import { createMatchController } from './match.ts'
import { createOnlineController } from './online.ts'
import type { MatchConnection } from './peer.ts'
import type { ControllerOptions, GameController, GameMap } from './types.ts'
import { restoreSavedMatch, type SavedMatch } from './saved-match.ts'
import { restoreAiPlanning } from './ai-economy.ts'

// Create per component instance: never share a mutable game between SSR requests.
export function createGame(map: GameMap, options?: ControllerOptions, connection?: MatchConnection, resume?: SavedMatch): GameController {
	const state = $state(resume ? restoreSavedMatch(resume) : initialState(map))
	if (resume) restoreAiPlanning(state, resume.planning)
	return connection ? createOnlineController(state, map, connection, options) : createMatchController(state, options)
}

export function createTutorialGame(map: GameMap, scenario: TutorialScenario, options?: ControllerOptions): TutorialController {
	const state = $state(initialState(map))
	const progress = $state<TutorialProgress>({ step: 0, completed: false, failed: false, enemy: null, objectives: [false, false, false], recruited: false, held: false })
	return createTutorialController(state, scenario, progress, options)
}
