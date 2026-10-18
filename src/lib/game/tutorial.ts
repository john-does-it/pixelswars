import { canAttack, canCapture } from './model.ts'
import { buildingIncome, createUnit, unitTypes } from './catalog.ts'
import { pathsFrom } from './movement.ts'
import { createController } from './controller.ts'
import type { ControllerOptions, GameController, GameMap, GameState, Unit } from './types.ts'

type Message = keyof typeof import('../paraglide/messages.js').m
export interface TutorialScenario {
	id: string
	title: Message
	summary: Message
	steps: { id: string; section: Message; message: Message; target: number }[]
}
export interface TutorialProgress {
	step: number
	completed: boolean
	failed: boolean
	enemy: Message | null
	objectives: boolean[]
	recruited: boolean
	held: boolean
}
export interface TutorialController extends GameController {
	progress: TutorialProgress
	endTurn(): Promise<void>
}
export const tutorialScenario: TutorialScenario = {
	id: 'training',
	title: 'tutorial_title',
	summary: 'mission_summary',
	steps: [
		{ id: 'foothold', section: 'mission_foothold', message: 'mission_take_city', target: 17 },
		{ id: 'hold', section: 'mission_hold', message: 'mission_consolidate', target: 11 },
		{ id: 'cross', section: 'mission_cross', message: 'mission_cross_river', target: 64 }
	]
}
export function tutorialMap(source: GameMap): GameMap {
	const cells = source.cells.map((cell) => ({ ...cell, classes: [...cell.classes], owner: 0 as 0 | 1 | 2, capturePoints: 20 }))
	// A rear supply city keeps ordinary recruitment available after losses or overspending.
	cells[15] = { classes: ['-building', '-city', '-ongrass'], owner: 1, capturePoints: 20 }
	cells[17] = { classes: ['-building', '-city', '-ongrass'], owner: 0, capturePoints: 20 }
	cells[24] = { classes: ['-building', '-naval-base', '-ongrass'], owner: 1, capturePoints: 20 }
	for (const index of [11, 13]) cells[index].owner = 1
	return {
		...source,
		cells,
		units: [
			{ type: 'infantry', player: 1, cell: 12 },
			{ type: 'infantry', player: 1, cell: 16 },
			{ type: 'infantry', player: 2, cell: 7 },
			{ type: 'infantry', player: 2, cell: 67 }
		]
	}
}
const roster = (state: GameState) => state.units.flatMap((u) => [u, ...(u.cargo ?? [])])

export function createTutorialController(state: GameState, scenario: TutorialScenario, progress: TutorialProgress, options: ControllerOptions = {}): TutorialController {
	state.money[1] = 200
	let disposed = false
	let shipArrived = false
	const startingId = state.nextId
	const delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
	function update() {
		if (disposed || state.fighting || state.moving) return
		progress.recruited ||= roster(state).some((u) => u.player === 1 && u.id >= startingId)
		// This mission is won by securing objectives, not by eliminating the two patrols.
		// Losing the initial squad is recoverable through the same economy as a normal match.
		if (state.winner !== null && !progress.completed) {
			const canRebuild = state.cells.some((c) => c.owner === 1 && c.building === 'factory') && (state.money[1] >= unitTypes.infantry.cost || state.cells.some((c) => c.owner === 1 && buildingIncome(c.building) > 0))
			if (state.winner === 1 || canRebuild) state.winner = null
			else progress.failed = true
		}
		if (state.aiThinking || state.player !== 1 || progress.failed) return
		progress.objectives[0] = state.cells[17].owner === 1
		progress.objectives[1] = progress.objectives[0] && progress.held && progress.recruited
		// A far-bank capture performed early counts. No named unit or transport is required.
		progress.objectives[2] = state.cells[64].owner === 1
		progress.completed = progress.objectives.every(Boolean)
		progress.step = progress.completed ? 2 : progress.objectives.findIndex((done) => !done)
		if (progress.objectives[0] && !shipArrived) {
			const landing = [34, 35, 36, 33, 44, 45, 46, 43].find((index) => !state.units.some((u) => u.cell === index) && !(state.selectedId !== null && state.origin?.cell === index))
			if (landing !== undefined) {
				// A single announced reinforcement, never a replacement for a sunk or loaded ship.
				state.units.push(createUnit('transport-ship', 1, landing, -1))
				shipArrived = true
			}
		}
	}
	const base = createController(state, {
		...options,
		onChange: () => {
			update()
			options.onChange?.()
		}
	})
	const available = () => !disposed && !state.aiThinking && state.player === 1 && !progress.failed && !state.fighting && !state.moving
	const controller: TutorialController = { ...base, progress, allowsAction: () => available(), endTurn: async () => {} }
	// Route all input through the regular controller. No lesson-specific permissions or stat budgets.
	const methods = ['selectPassenger', 'embark', 'deploy', 'closeProduction', 'fight', 'select', 'clickCell', 'move', 'cancel', 'openProduction', 'confirm', 'capture', 'buy', 'keydown'] as const
	for (const method of methods)
		Object.assign(controller, {
			[method]: (...args: unknown[]) => {
				if (!available()) return method === 'fight' ? Promise.resolve() : undefined
				const result = Reflect.apply(base[method], controller, args)
				update()
				return result
			}
		})
	// Garrisons defend their bank. They pursue reachable shots within their sector,
	// but do not chase into the player's rear base or invent targets to satisfy a lesson.
	async function defend(actor: Unit) {
		const north = actor.id === 2
		const sector = (index: number) => index % state.cols >= (north ? 6 : 5) && (north ? index < 30 : index >= 50)
		if (!state.units.includes(actor)) return false
		let acted = false
		const targets = () => state.units.filter((u) => u.player === 1 && u.health > 0)
		if (!targets().some((target) => canAttack(state, actor, target))) {
			const routes = [...pathsFrom(state, actor, actor.movement)].filter(([index]) => sector(index) && targets().some((target) => canAttack(state, { ...actor, cell: index }, target)))
			routes.sort((a, b) => a[1].cost - b[1].cost || a[0] - b[0])
			const route = routes[0]?.[1]
			if (route) {
				base.select(actor.id)
				for (const index of route.path) {
					if (disposed || state.winner !== null) return acted
					base.move(index)
					acted = true
					await delay(140)
				}
			}
		}
		while (!disposed && state.winner === null && state.units.includes(actor) && actor.attacks > 0) {
			const target = targets().find((target) => canAttack(state, actor, target))
			if (!target) break
			progress.enemy = 'mission_enemy_defend'
			base.select(actor.id)
			await base.fight(target)
			acted = true
		}
		if (!disposed) base.confirm()
		return acted
	}
	controller.endTurn = async () => {
		if (!available() || state.winner !== null) return
		state.aiThinking = true
		base.endTurn()
		try {
			progress.enemy = 'mission_enemy_defend'
			await delay(350)
			let acted = false
			for (const enemy of [...state.units].filter((u) => u.player === 2)) {
				if (disposed || state.winner !== null) break
				acted = (await defend(enemy)) || acted
			}
			if (!disposed && !acted) {
				progress.enemy = 'tutorial_enemy_hold'
				await delay(650)
			}
		} finally {
			if (!disposed) {
				if (state.winner === null) {
					base.endTurn()
					progress.held ||= state.incomeCells.includes(17)
				}
				state.aiThinking = false
				progress.enemy = null
				update()
				options.onChange?.()
			}
		}
	}
	controller.dispose = () => {
		disposed = true
		base.dispose()
	}
	update()
	return controller
}

export function tutorialMessage(state: GameState, scenario: TutorialScenario, progress: TutorialProgress): Message {
	const selected = state.units.find((u) => u.id === state.selectedId)
	if (state.productionIndex !== null) return 'mission_tip_produce'
	if (selected?.cargo?.length) return 'mission_tip_unload'
	if (canCapture(state)) return 'mission_tip_capture'
	if (selected && state.origin && selected.cell !== state.origin.cell) return 'mission_tip_undo'
	if (selected && selected.health < unitTypes[selected.type].maxHealth && state.cells[selected.cell].building === 'hospital' && state.cells[selected.cell].owner === 1) return 'mission_tip_heal'
	if (selected && state.units.some((u) => canAttack(state, selected, u))) return selected.attacks > 0 ? 'mission_tip_combat' : 'mission_tip_ammo'
	if (selected && unitTypes[selected.type].domain === 'naval') return 'mission_tip_ship'
	if (progress.step === 1 && !progress.recruited) return 'mission_tip_recruit'
	if (progress.step === 1 && progress.recruited) return 'mission_tip_hold'
	if (selected && progress.step === 2 && unitTypes[selected.type].captures) return 'mission_tip_board'
	if (selected) return selected.movement > 0 ? 'mission_tip_move' : 'mission_tip_spent'
	if (!roster(state).some((u) => u.player === 1 && unitTypes[u.type].captures)) return 'mission_tip_rebuild'
	return scenario.steps[progress.step].message
}
export function tutorialTarget(state: GameState, scenario: TutorialScenario, progress: TutorialProgress): number | undefined {
	if (progress.completed || progress.failed || state.aiThinking) return
	if (!roster(state).some((u) => u.player === 1 && unitTypes[u.type].captures)) return 11
	if (progress.step === 1 && progress.recruited) return 17
	return scenario.steps[progress.step].target
}
