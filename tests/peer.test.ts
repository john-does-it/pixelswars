import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PeerConnection, matchFingerprint, protocolVersion } from '../src/lib/game/peer.ts'
import type { GameMap } from '../src/lib/game/types.ts'

const map: GameMap = { id: '1', name: 'Handshake test', cols: 1, rows: 1, cells: [{ classes: ['-grass'], owner: 0, capturePoints: 20 }], units: [] }
const hello = { type: 'hello', version: protocolVersion, map: map.id, fingerprint: matchFingerprint(map) }

class Channel extends EventEmitter {
	open = true
	dataChannel = { bufferedAmount: 0 }
	packets: unknown[] = []
	send(packet: unknown) {
		this.packets.push(packet)
	}
	close() {
		this.open = false
		this.emit('close')
	}
}

function session(context: TestContext) {
	context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
	const original = Object.getOwnPropertyDescriptor(globalThis, 'RTCPeerConnection')
	Object.defineProperty(globalThis, 'RTCPeerConnection', { configurable: true, value: class {} })
	const peer = new PeerConnection(map, true)
	context.after(() => {
		peer.close()
		if (original) Object.defineProperty(globalThis, 'RTCPeerConnection', original)
		else Reflect.deleteProperty(globalThis, 'RTCPeerConnection')
	})
	const channel = new Channel()
	// Exercise the transport boundary without public signaling or a browser.
	Reflect.get(peer, 'attach').call(peer, channel)
	channel.emit('open')
	return { peer, channel }
}

test('early match messages wait for a valid hello, then arrive once in order', (context) => {
	const { peer, channel } = session(context)
	const received: unknown[] = []
	peer.onMessage((packet) => received.push(packet))
	channel.emit('data', { type: 'ready' })
	channel.emit('data', { type: 'snapshot', revision: 1 })
	assert.deepEqual(received, [])
	channel.emit('data', hello)
	assert.equal(peer.status, 'connected')
	assert.deepEqual(received, [{ type: 'ready' }, { type: 'snapshot', revision: 1 }])
	channel.emit('data', hello)
	assert.equal(received.length, 2)
	const sent = channel.packets.length
	channel.emit('data', { ...hello, ack: true })
	assert.equal(channel.packets.length, sent, 'acknowledgements do not create an echo loop')
	context.mock.timers.tick(1000)
	assert.equal(channel.packets.length, sent, 'hello retries stop after validation')
})

test('invalid hellos discard early messages and stop retrying', (context) => {
	const { peer, channel } = session(context)
	const errors: string[] = []
	const received: unknown[] = []
	peer.onError((error) => errors.push(error.message))
	peer.onMessage((packet) => received.push(packet))
	channel.emit('data', { type: 'ready' })
	channel.emit('data', { ...hello, fingerprint: 'wrong' })
	assert.deepEqual(errors, ['incompatible'])
	assert.equal(peer.status, 'disconnected')
	const retry = new Channel()
	Reflect.get(peer, 'attach').call(peer, retry)
	retry.emit('open')
	retry.emit('data', hello)
	assert.deepEqual(received, [], 'a new attempt cannot inherit unvalidated messages')
	context.mock.timers.tick(1000)
	assert.equal(channel.packets.length, 1, 'the failed channel no longer retries')
})

test('hello retries retain the deadline and stop on timeout or disposal', (context) => {
	const { peer, channel } = session(context)
	const errors: string[] = []
	peer.onError((error) => errors.push(error.message))
	context.mock.timers.tick(1000)
	assert.equal(channel.packets.length, 2)
	context.mock.timers.tick(34000)
	assert.equal(peer.status, 'disconnected')
	assert.deepEqual(errors, ['network'])
	const sent = channel.packets.length
	context.mock.timers.tick(5000)
	assert.equal(channel.packets.length, sent)
	const retry = new Channel()
	Reflect.get(peer, 'attach').call(peer, retry)
	retry.emit('open')
	peer.close()
	context.mock.timers.tick(40000)
	assert.equal(retry.packets.length, 1)
	assert.deepEqual(errors, ['network'])
})
