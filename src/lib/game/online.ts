import { createController } from './controller.ts'
import { turnTransitionDuration } from './timing.ts'
import { initialState, selectedUnit, unitAt, canAttack, locked } from './model.ts'
import { isUnitTypeId } from './catalog.ts'
import type { MatchConnection } from './peer.ts'
import type { ControllerOptions, GameController, GameMap, GameState, Player } from './types.ts'

const sharedKeys = ['units', 'nextId', 'player', 'round', 'money', 'selectedId', 'origin', 'productionIndex', 'fighting', 'combatTargetIndex', 'winner', 'explosion', 'incomeCells', 'healedCells', 'capturedCells', 'securedCells'] as const
type Snapshot = Pick<GameState, (typeof sharedKeys)[number]> & { ownership: { owner: number; capturePoints: number }[] }
export function matchSnapshot(state: GameState): Snapshot {
	return JSON.parse(JSON.stringify({ ...Object.fromEntries(sharedKeys.map((key) => [key, state[key]])), ownership: state.cells.map(({ owner, capturePoints }) => ({ owner, capturePoints })) }))
}

export function applySnapshot(state: GameState, input: unknown): boolean {
	if (!input || typeof input !== 'object') return false
	const snapshot = input as Snapshot
	const cellIndex = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) < state.cells.length
	const nullableCell = (value: unknown) => value === null || cellIndex(value)
	const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
	if (![1, 2].includes(snapshot.player) || !Number.isInteger(snapshot.round) || snapshot.round < 1 || !amount(snapshot.money?.[1]) || !amount(snapshot.money?.[2]) || !Number.isInteger(snapshot.nextId) || snapshot.nextId < 0) return false
	if (!Array.isArray(snapshot.units) || snapshot.units.length > state.cells.length || !snapshot.units.every((unit) => unit && Number.isInteger(unit.id) && unit.id >= 0 && isUnitTypeId(unit.type) && [1, 2].includes(unit.player) && cellIndex(unit.cell) && [unit.health, unit.movement, unit.attacks, unit.capture].every(amount))) return false
	if (new Set(snapshot.units.map((unit) => unit.id)).size !== snapshot.units.length || new Set(snapshot.units.map((unit) => unit.cell)).size !== snapshot.units.length) return false
	if (!Array.isArray(snapshot.ownership) || snapshot.ownership.length !== state.cells.length || !snapshot.ownership.every((cell) => cell && [0, 1, 2].includes(cell.owner) && amount(cell.capturePoints) && cell.capturePoints <= 20)) return false
	if (![snapshot.productionIndex, snapshot.combatTargetIndex, snapshot.explosion].every(nullableCell) || typeof snapshot.fighting !== 'boolean' || ![null, 1, 2].includes(snapshot.winner)) return false
	if (snapshot.selectedId !== null && !snapshot.units.some((unit) => unit.id === snapshot.selectedId && unit.player === snapshot.player)) return false
	if (snapshot.origin !== null && (!snapshot.origin || !cellIndex(snapshot.origin.cell) || !amount(snapshot.origin.movement))) return false
	if (![snapshot.incomeCells, snapshot.capturedCells, snapshot.securedCells].every((cells) => Array.isArray(cells) && cells.length <= state.cells.length && cells.every(cellIndex))) return false
	if (!snapshot.healedCells || typeof snapshot.healedCells !== 'object' || !Object.entries(snapshot.healedCells).every(([index, health]) => cellIndex(Number(index)) && amount(health))) return false
	const previousRound = state.round
	for (const key of sharedKeys) Object.assign(state, { [key]: snapshot[key] })
	snapshot.ownership.forEach(({ owner, capturePoints }, index) => Object.assign(state.cells[index], { owner, capturePoints }))
	if (previousRound !== state.round || state.fighting || state.winner !== null) state.inspectedEnemyId = null
	return true
}

type Command = { action: 'select' | 'click' | 'move' | 'cancel' | 'confirm' | 'capture' | 'buy' | 'end' | 'open' | 'close'; value?: number | string }
export function validCommand(input: unknown, state: GameState): input is Command {
	if (!input || typeof input !== 'object') return false
	const command = input as Command
	if (['cancel', 'confirm', 'capture', 'end', 'close'].includes(command.action)) return command.value === undefined
	if (command.action === 'buy') return typeof command.value === 'string' && isUnitTypeId(command.value)
	if (!['select', 'click', 'move', 'open'].includes(command.action) || typeof command.value !== 'number' || !Number.isInteger(command.value) || command.value < 0) return false
	return command.action === 'select' ? state.units.some((unit) => unit.id === command.value && unit.player === state.player) : command.value < state.cells.length
}

export function createOnlineController(state: GameState, map: GameMap, connection: MatchConnection, options: ControllerOptions & { now?: () => number } = {}): GameController {
	state.network = { player: connection.player, phase: 'waiting', pending: false, rematchRequested: false, opponentRematchRequested: false }
	const network = state.network
	const host = connection.player === 1
	const now = options.now ?? Date.now
	let started = false
	let remoteReady = false
	let disposed = false
	let revision = 0
	let sequence = 0
	let lastSequence = 0
	let blockedUntil = 0
	let rematch: Record<Player, boolean> = { 1: false, 2: false }
	let pendingTimeout: ReturnType<typeof setTimeout> | undefined

	function publish() {
		if (!host || disposed || !started || !remoteReady || connection.status !== 'connected') return
		connection.send({ type: 'snapshot', revision: ++revision, state: matchSnapshot(state), rematch })
	}
	const controller = createController(state, {
		...options,
		onChange: publish,
		onSound: (name) => {
			if (host) connection.send({ type: 'sound', name })
		}
	})
	function ready() {
		if (!started || !remoteReady || connection.status !== 'connected') return
		if (network.phase !== 'playing') blockedUntil = now() + turnTransitionDuration
		network.phase = 'playing'
		publish()
	}
	function applyCommand(command: Command, player: Player) {
		if (disposed || network.phase !== 'playing' || connection.status !== 'connected' || state.player !== player || locked(state) || now() < blockedUntil) return
		switch (command.action) {
			case 'select':
				controller.select(command.value as number)
				break
			case 'click':
				controller.clickCell(command.value as number)
				break
			case 'move':
				controller.move(command.value as number)
				break
			case 'cancel':
				controller.cancel()
				break
			case 'confirm':
				controller.confirm()
				break
			case 'capture':
				controller.capture()
				break
			case 'buy':
				if (isUnitTypeId(command.value as string)) controller.buy(command.value as Parameters<GameController['buy']>[0])
				break
			case 'open':
				controller.openProduction(command.value as number)
				break
			case 'close':
				controller.closeProduction()
				break
			case 'end':
				controller.endTurn()
				blockedUntil = now() + turnTransitionDuration
				break
		}
	}
	function request(command: Command) {
		if (disposed || network.phase !== 'playing' || state.player !== connection.player || network.pending || locked(state) || !validCommand(command, state)) return
		if (host) {
			applyCommand(command, 1)
			publish()
		} else {
			network.pending = true
			if (!connection.send({ type: 'command', revision, sequence: ++sequence, command })) network.phase = 'paused'
			clearTimeout(pendingTimeout)
			pendingTimeout = setTimeout(() => {
				if (network.pending) network.phase = 'paused'
			}, 8000)
		}
	}
	function requestRematch(player: Player) {
		if (state.winner === null || network.phase !== 'playing') return
		rematch[player] = true
		network.rematchRequested = rematch[1]
		network.opponentRematchRequested = rematch[2]
		if (rematch[1] && rematch[2]) {
			applySnapshot(state, matchSnapshot(initialState(map)))
			state.inspectedEnemyId = null
			rematch = { 1: false, 2: false }
			network.rematchRequested = network.opponentRematchRequested = false
			blockedUntil = now() + turnTransitionDuration
		}
		publish()
	}
	const unsubscribeMessage = connection.onMessage((input) => {
		if (disposed || !input || typeof input !== 'object') return
		const message = input as Record<string, any>
		if (message.type === 'ready') {
			remoteReady = true
			if (host) ready()
		} else if (host && message.type === 'command') {
			if (!Number.isSafeInteger(message.sequence) || message.sequence <= lastSequence) return
			lastSequence = message.sequence
			if (message.revision === revision && validCommand(message.command, state)) applyCommand(message.command, 2)
			publish()
		} else if (host && message.type === 'rematch') requestRematch(2)
		else if (!host && message.type === 'snapshot' && Number.isSafeInteger(message.revision) && message.revision > revision && typeof message.rematch?.[1] === 'boolean' && typeof message.rematch?.[2] === 'boolean') {
			if (!applySnapshot(state, message.state)) {
				network.phase = 'paused'
				return
			}
			revision = message.revision
			network.phase = connection.status === 'connected' ? 'playing' : 'paused'
			network.pending = false
			clearTimeout(pendingTimeout)
			network.rematchRequested = message.rematch[2]
			network.opponentRematchRequested = message.rematch[1]
		} else if (!host && message.type === 'sound' && typeof message.name === 'string' && state.sound) options.sound?.(message.name)
	})
	const unsubscribeStatus = connection.onStatus((status) => {
		if (disposed) return
		if (status !== 'connected') network.phase = 'paused'
		else if (started) {
			connection.send({ type: 'ready' })
			if (host) ready()
		}
	})
	const game: GameController = {
		state,
		start() {
			started = true
			connection.send({ type: 'ready' })
			if (host) ready()
		},
		select(id) {
			state.inspectedEnemyId = null
			request({ action: 'select', value: id })
		},
		clickCell(index) {
			state.hoveredIndex = index
			if (locked(state) || network.phase !== 'playing') return
			const unit = unitAt(state, index)
			const attacker = selectedUnit(state)
			if (unit && unit.player !== connection.player && (state.player !== connection.player || !attacker || !attacker.attacks || !canAttack(state, attacker, unit))) {
				state.inspectedEnemyId = state.inspectedEnemyId === unit.id ? null : unit.id
				return
			}
			if (!unit && state.inspectedEnemyId !== null) {
				state.inspectedEnemyId = null
				return
			}
			state.inspectedEnemyId = null
			request({ action: 'click', value: index })
		},
		move(index) {
			state.inspectedEnemyId = null
			request({ action: 'move', value: index })
		},
		cancel() {
			state.inspectedEnemyId = null
			request({ action: 'cancel' })
		},
		confirm() {
			state.inspectedEnemyId = null
			request({ action: 'confirm' })
		},
		capture() {
			request({ action: 'capture' })
		},
		buy(type) {
			request({ action: 'buy', value: type })
		},
		endTurn() {
			state.inspectedEnemyId = null
			request({ action: 'end' })
		},
		openProduction(index) {
			request({ action: 'open', value: index })
		},
		closeProduction() {
			request({ action: 'close' })
		},
		async fight(defender) {
			request({ action: 'click', value: defender.cell })
		},
		keydown(event) {
			controller.keydown.call(game, event)
		},
		requestRematch() {
			if (host) requestRematch(1)
			else if (network.phase === 'playing' && state.winner !== null) connection.send({ type: 'rematch' })
		},
		dispose() {
			disposed = true
			clearTimeout(pendingTimeout)
			unsubscribeMessage()
			unsubscribeStatus()
			controller.dispose()
		}
	}
	return game
}
