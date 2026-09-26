import { initialState } from './model.ts'
import { createMatchController } from './match.ts'
import type { ControllerOptions, GameController, GameMap } from './types.ts'

// Create per component instance: never share a mutable game between SSR requests.
export function createGame(map: GameMap, options?: ControllerOptions): GameController {
	const state = $state(initialState(map))
	return createMatchController(state, options)
}
