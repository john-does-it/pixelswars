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
