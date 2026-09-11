import { initialState } from './model.js'
import { createController } from './controller.js'

// Create per component instance: never share a mutable game between SSR requests.
export function createGame(map, options) {
	const state = $state(initialState(map))
	return createController(state, options)
}
