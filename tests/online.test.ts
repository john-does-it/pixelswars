import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOnlineController, matchSnapshot, applySnapshot, validCommand } from '../src/lib/game/online.ts'
import { initialState } from '../src/lib/game/model.ts'
import { decodeSignal, matchFingerprint, type MatchConnection, type PeerStatus } from '../src/lib/game/peer.ts'
import { createUnit } from '../src/lib/game/catalog.ts'
import type { ControllerOptions, GameMap, Player } from '../src/lib/game/types.ts'

class Connection implements MatchConnection {
	status: PeerStatus = 'connected'
	other!: Connection
	packets: any[] = []
	listeners = new Set<(message: unknown) => void>()
	statuses = new Set<(status: PeerStatus) => void>()
	player: Player
	constructor(player: Player) {
		this.player = player
	}
	send(message: unknown) {
		if (this.status !== 'connected') return false
		const copy = structuredClone(message)
		this.packets.push(copy)
		queueMicrotask(() => {
			if (this.other.status === 'connected') for (const listener of this.other.listeners) listener(copy)
		})
		return true
	}
	onMessage(listener: (message: unknown) => void) {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}
	onStatus(listener: (status: PeerStatus) => void) {
		this.statuses.add(listener)
		listener(this.status)
		return () => {
			this.statuses.delete(listener)
		}
	}
	setStatus(status: PeerStatus) {
		this.status = status
		for (const listener of this.statuses) listener(status)
	}
	close() {
		this.setStatus('closed')
	}
}

const map: GameMap = {
	id: 'test',
	name: 'Test',
	cols: 6,
	rows: 6,
	cells: Array.from({ length: 36 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })),
	units: [
		{ type: 'infantry', player: 1, cell: 0 },
		{ type: 'infantry', player: 2, cell: 35 }
	]
}
const flush = async () => {
	for (let turn = 0; turn < 12; turn++) await Promise.resolve()
}
async function session(options: ControllerOptions = {}) {
	const hostConnection = new Connection(1)
	const guestConnection = new Connection(2)
	hostConnection.other = guestConnection
	guestConnection.other = hostConnection
	const hostState = initialState(map)
	const guestState = initialState(map)
	let time = 0
	const host = createOnlineController(hostState, map, hostConnection, { ...options, now: () => time })
	const guest = createOnlineController(guestState, map, guestConnection, options)
	host.start?.()
	guest.start?.()
	await flush()
	time += 3000
	return {
		host,
		guest,
		hostState,
		guestState,
		hostConnection,
		guestConnection,
		advance: () => {
			time += 3000
		},
		dispose: () => {
			host.dispose()
			guest.dispose()
		}
	}
}

test('host and guest synchronize legal turns, selection, movement and cancellation without sharing preferences or previews', async () => {
	const match = await session()
	try {
		const { host, guest, hostState, guestState } = match
		guestState.sound = false
		guestState.keyboardLayout = 'qwerty'
		guestState.hoveredIndex = 30
		guest.clickCell(35)
		await flush()
		assert.equal(hostState.selectedId, null)
		guestState.hoveredIndex = 30
		host.select(0)
		host.move(6)
		await flush()
		assert.equal(guestState.units[0].cell, 6)
		assert.equal(guestState.hoveredIndex, 30)
		assert.equal(guestState.sound, false)
		assert.equal(guestState.keyboardLayout, 'qwerty')
		host.cancel()
		await flush()
		assert.equal(guestState.units[0].cell, 0)
		host.endTurn()
		await flush()
		match.advance()
		guest.select(1)
		await flush()
		guest.move(29)
		await flush()
		assert.equal(hostState.units[1].cell, 29)
		assert.deepEqual(matchSnapshot(guestState), matchSnapshot(hostState))
		guest.cancel()
		await flush()
		assert.equal(hostState.units[1].cell, 35)
	} finally {
		match.dispose()
	}
})

test('host rejects malformed, out-of-turn, stale and replayed remote commands', async () => {
	const match = await session()
	try {
		const latestRevision = () => match.hostConnection.packets.filter((packet) => packet.type === 'snapshot').at(-1).revision
		match.guestConnection.send({ type: 'command', revision: latestRevision(), sequence: 1, command: { action: 'end' } })
		await flush()
		assert.equal(match.hostState.round, 1)
		match.host.endTurn()
		await flush()
		match.advance()
		match.guestConnection.send({ type: 'command', revision: 0, sequence: 2, command: { action: 'end' } })
		await flush()
		assert.equal(match.hostState.round, 2)
		const command = { type: 'command', revision: latestRevision(), sequence: 3, command: { action: 'end' } }
		match.guestConnection.send(command)
		await flush()
		assert.equal(match.hostState.round, 3)
		match.guestConnection.send(command)
		await flush()
		assert.equal(match.hostState.round, 3)
		for (const command of [
			{ action: 'move', value: -1 },
			{ action: 'click', value: 36 },
			{ action: 'buy', value: '__proto__' },
			{ action: 'select', value: 1 },
			{ action: 'end', value: 0 },
			{ action: 'money', value: 999999 }
		])
			assert.equal(validCommand(command, match.hostState), false)
	} finally {
		match.dispose()
	}
})

test('capture, income, healing and factory purchases synchronize and cannot be forged by the guest', async () => {
	const match = await session()
	try {
		const { host, guest, hostState, guestState } = match
		Object.assign(hostState.cells[6], { building: 'city', terrain: 'building' })
		Object.assign(hostState.cells[34], { building: 'factory', owner: 2 })
		Object.assign(guestState.cells[34], { building: 'factory', owner: 2 })
		Object.assign(hostState.cells[35], { building: 'hospital', owner: 2 })
		hostState.units[1].health = 40
		hostState.money[2] = 200
		host.select(0)
		host.move(6)
		host.capture()
		host.endTurn()
		await flush()
		assert.equal(guestState.cells[6].capturePoints, 10)
		assert.equal(guestState.units[1].health, 90)
		assert.equal(guestState.healedCells[35], 50)
		match.advance()
		guest.openProduction(34)
		await flush()
		guest.buy('infantry')
		await flush()
		assert.equal(hostState.money[2], 0)
		assert.ok(guestState.units.some((unit) => unit.cell === 34 && unit.player === 2))
		guest.endTurn()
		await flush()
		match.advance()
		host.select(0)
		host.capture()
		host.endTurn()
		await flush()
		match.advance()
		guest.endTurn()
		await flush()
		assert.equal(guestState.money[1], 200)
		assert.equal(guestState.cells[6].owner, 1)
	} finally {
		match.dispose()
	}
})

test('combat phases and sound reach the guest even with muted host audio; victory and rematch stay shared', async () => {
	const sounds: string[] = []
	const delays: (() => void)[] = []
	const match = await session({ sound: (name) => sounds.push(name), delay: () => new Promise<void>((resolve) => delays.push(resolve)) })
	try {
		const { host, guest, hostState, guestState } = match
		hostState.sound = false
		hostState.units = [createUnit('artillery', 1, 0, 0), createUnit('artillery', 2, 18, 1)]
		host.select(0)
		host.clickCell(18)
		await flush()
		assert.equal(guestState.fighting, true)
		assert.equal(guestState.combatTargetIndex, 18)
		assert.ok(guestState.units[1].health < 120)
		assert.ok(sounds.length > 0)
		delays.shift()!()
		await flush()
		assert.equal(guestState.combatTargetIndex, 0)
		assert.ok(guestState.units[0].health < 120)
		delays.shift()!()
		await flush()
		assert.equal(guestState.fighting, false)
		hostState.units[1].health = 1
		hostState.units[0].attacks = 1
		host.clickCell(18)
		await flush()
		delays.shift()!()
		await flush()
		delays.shift()!()
		await flush()
		assert.equal(guestState.winner, 1)
		guest.requestRematch?.()
		await flush()
		assert.equal(hostState.network?.opponentRematchRequested, true)
		assert.equal(guestState.winner, 1)
		host.requestRematch?.()
		await flush()
		assert.equal(guestState.winner, null)
		assert.equal(guestState.round, 1)
		assert.deepEqual(matchSnapshot(guestState), matchSnapshot(initialState(map)))
		assert.equal(hostState.sound, false)
	} finally {
		match.dispose()
	}
})

test('disconnect pauses both sides, rejects actions and resynchronizes when the connection returns', async () => {
	const match = await session()
	try {
		match.host.select(0)
		await flush()
		match.hostConnection.setStatus('disconnected')
		match.guestConnection.setStatus('disconnected')
		match.host.move(6)
		assert.equal(match.hostState.units[0].cell, 0)
		assert.equal(match.hostState.network?.phase, 'paused')
		assert.equal(match.guestState.network?.phase, 'paused')
		match.hostConnection.setStatus('connected')
		match.guestConnection.setStatus('connected')
		await flush()
		assert.equal(match.guestState.network?.phase, 'playing')
		assert.deepEqual(matchSnapshot(match.guestState), matchSnapshot(match.hostState))
	} finally {
		match.dispose()
	}
})

test('invalid snapshots and invitations are rejected without mutating the match', () => {
	const state = initialState(map)
	const before = matchSnapshot(state)
	const invalid = matchSnapshot(state)
	invalid.units[0].cell = -1
	assert.equal(applySnapshot(state, invalid), false)
	assert.deepEqual(matchSnapshot(state), before)
	for (const input of ['', 'PW1.invalid', 'https://example.com/#invite=nope']) assert.throws(() => decodeSignal(input))
	const code = `PW2.1.1.${matchFingerprint(map)}.12345678-1234-1234-1234-123456789abc`
	assert.deepEqual(decodeSignal(code), decodeSignal(`https://example.com/pixelswars/play/1/?online=1#invite=${code}`))
	assert.equal(decodeSignal(code).peer, 'pw-12345678-1234-1234-1234-123456789abc')
	assert.throws(() => decodeSignal(code.replace('PW2.1.', 'PW2.2.')), /incompatible/)
	assert.throws(() => decodeSignal(code + '.extra'), /invalid/)
	assert.notEqual(matchFingerprint(map), matchFingerprint({ ...map, cols: 12 }))
})
