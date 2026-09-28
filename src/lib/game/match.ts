import { createController } from './controller.ts'
import { runAiTurn } from './ai.ts'
import { turnTransitionDuration } from './timing.ts'
import type { ControllerOptions, GameController, GameState } from './types.ts'

export function createMatchController(state: GameState, options: ControllerOptions = {}): GameController {
	const controller = createController(state, options)
	const difficulty = options.aiDifficulty
	if (!difficulty) return controller
	let disposed = false
	let running = false
	const aiTurn = () => state.player === 1
	state.aiThinking = aiTurn()
	const delay = options.delay ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
	function guard<Arguments extends unknown[]>(action: (...args: Arguments) => void): (...args: Arguments) => void {
		return (...args) => {
			if (!disposed && !aiTurn()) action(...args)
		}
	}
	async function playAi() {
		if (disposed || running || !aiTurn() || state.winner !== null) return
		running = true
		state.aiThinking = true
		try {
			await delay(turnTransitionDuration)
			if (disposed) return
			await runAiTurn(controller, difficulty!, () => !disposed, delay)
		} catch (error) {
			// Keep a failed AI turn from trapping the match; report the cause for diagnostics.
			console.error('AI turn failed', error)
			if (!disposed && aiTurn()) controller.endTurn()
		} finally {
			running = false
			if (!disposed) state.aiThinking = false
		}
	}
	return {
		state,
		start() {
			void playAi()
		},
		select: guard(controller.select.bind(controller)),
		clickCell: guard(controller.clickCell.bind(controller)),
		move: guard(controller.move.bind(controller)),
		cancel: guard(controller.cancel.bind(controller)),
		confirm: guard(controller.confirm.bind(controller)),
		capture: guard(controller.capture.bind(controller)),
		buy: guard(controller.buy.bind(controller)),
		openProduction: guard(controller.openProduction.bind(controller)),
		closeProduction: guard(controller.closeProduction.bind(controller)),
		keydown: guard(controller.keydown.bind(controller)),
		async fight(defender) {
			if (!disposed && !aiTurn()) await controller.fight(defender)
		},
		endTurn: guard(() => {
			controller.endTurn()
			if (aiTurn() && state.winner === null) void playAi()
		}),
		dispose() {
			disposed = true
			controller.dispose()
		}
	}
}
