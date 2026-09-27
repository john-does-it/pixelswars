import { initialState } from './model.ts'
import { createMatchController } from './match.ts'
import { createOnlineController } from './online.ts'
import type { MatchConnection } from './peer.ts'
import type { ControllerOptions, GameController, GameMap } from './types.ts'

// Create per component instance: never share a mutable game between SSR requests.
export function createGame(map: GameMap, options?: ControllerOptions, connection?: MatchConnection): GameController {
	const state = $state(initialState(map))
	return connection ? createOnlineController(state, map, connection, options) : createMatchController(state, options)
}
