import type { DataConnection, Peer } from 'peerjs'
import { terrainTypes, unitTypes } from './catalog.ts'
import { iceConfiguration } from './ice.ts'
import type { GameMap, Player } from './types.ts'

export type PeerStatus = 'connecting' | 'connected' | 'disconnected' | 'closed'
export interface MatchConnection {
	player: Player
	status: PeerStatus
	send(message: unknown): boolean
	onMessage(listener: (message: unknown) => void): () => void
	onStatus(listener: (status: PeerStatus) => void): () => void
	close(): void
}

// Bump this when changing command semantics or combat rules.
export const protocolVersion = 2
export function matchFingerprint(map: GameMap): string {
	let hash = 2166136261
	for (const character of JSON.stringify({ protocolVersion, map, unitTypes, terrainTypes })) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
	return (hash >>> 0).toString(16)
}

export class PeerError extends Error {}
export function decodeSignal(input: string) {
	let token = input.trim()
	try {
		if (token.startsWith('http://') || token.startsWith('https://')) token = new URLSearchParams(new URL(token).hash.slice(1)).get('invite') ?? ''
		const parts = /^PW2\.(\d+)\.(\d+)\.([a-f0-9]{1,8})\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.exec(token)
		if (!parts) throw new PeerError('invalid')
		if (Number(parts[1]) !== protocolVersion) throw new PeerError('incompatible')
		return { version: Number(parts[1]), map: parts[2], fingerprint: parts[3], peer: 'pw-' + parts[4] }
	} catch (error) {
		if (error instanceof PeerError) throw error
		throw new PeerError('invalid')
	}
}

export class PeerConnection implements MatchConnection {
	readonly player: Player
	status: PeerStatus = 'connecting'
	private peer?: Peer
	private channel?: DataConnection
	private messages = new Set<(message: unknown) => void>()
	private statuses = new Set<(status: PeerStatus) => void>()
	private errors = new Set<(error: PeerError) => void>()
	private pending: unknown[] = []
	private heartbeat?: ReturnType<typeof setInterval>
	private connectionTimeout?: ReturnType<typeof setTimeout>
	private lastSeen = Date.now()
	private hasConnected = false
	private map: GameMap
	private abort = new AbortController()

	constructor(map: GameMap, host: boolean) {
		if (typeof RTCPeerConnection === 'undefined') throw new PeerError('unsupported')
		this.map = map
		this.player = host ? 1 : 2
	}
	private setStatus(status: PeerStatus) {
		if (this.status === 'closed' || this.status === status) return
		this.status = status
		for (const listener of this.statuses) listener(status)
	}
	private fail(reason: string) {
		if (this.status === 'closed') return
		for (const listener of this.errors) listener(new PeerError(reason))
	}
	private async initialize() {
		let configuration: RTCConfiguration
		try {
			configuration = await iceConfiguration({ app: import.meta.env.VITE_METERED_APP, apiKey: import.meta.env.VITE_METERED_TURN_API_KEY, relayOnly: import.meta.env.VITE_TURN_RELAY_ONLY }, this.abort.signal)
		} catch {
			throw new PeerError('relay')
		}
		const { Peer } = await import('peerjs')
		if (this.abort.signal.aborted) throw new PeerError('failed')
		const peer = new Peer('pw-' + crypto.randomUUID(), {
			secure: true,
			config: configuration
		})
		this.peer = peer
		peer.on('connection', (connection) => {
			if (this.player !== 1 || this.channel || connection.label !== 'pixelswars') {
				connection.on('open', () => {
					connection.send({ type: 'rejected', reason: 'unavailable' })
					connection.close({ flush: true })
				})
				connection.on('error', () => connection.close())
				return
			}
			const metadata = connection.metadata
			const reason = metadata?.version !== protocolVersion || metadata?.fingerprint !== matchFingerprint(this.map) ? 'incompatible' : metadata?.map !== this.map.id ? 'wrong_map' : null
			if (reason) {
				connection.on('open', () => {
					connection.send({ type: 'rejected', reason })
					connection.close({ flush: true })
				})
				connection.on('error', () => connection.close())
				return
			}
			this.attach(connection)
		})
		peer.on('error', (error) => {
			if (!this.hasConnected) {
				const reason = error.type === 'peer-unavailable' ? 'unavailable' : error.type === 'webrtc' ? 'network' : 'service'
				if (this.channel) this.failConnection(this.channel, reason)
				else this.fail(reason)
			}
		})
		peer.on('disconnected', () => {
			if (!this.hasConnected) {
				if (this.channel) this.failConnection(this.channel, 'service')
				else this.fail('service')
			}
		})
		await new Promise<void>((resolve, reject) => {
			const finish = (error?: PeerError) => {
				clearTimeout(timeout)
				peer.off('open', opened)
				peer.off('error', failed)
				this.abort.signal.removeEventListener('abort', aborted)
				error ? reject(error) : resolve()
			}
			const opened = () => finish()
			const failed = () => finish(new PeerError('service'))
			const aborted = () => finish(new PeerError('failed'))
			const timeout = setTimeout(() => finish(new PeerError('service')), 15000)
			peer.once('open', opened)
			peer.once('error', failed)
			this.abort.signal.addEventListener('abort', aborted, { once: true })
		})
		return peer
	}
	private failConnection(connection: DataConnection, reason: string) {
		if (this.channel !== connection || this.hasConnected) return
		const transport = connection.peerConnection
		// Only diagnose an empty search once gathering has actually finished.
		if (reason === 'network' && transport?.iceGatheringState === 'complete' && transport.localDescription && !/^a=candidate:/m.test(transport.localDescription.sdp)) reason = 'no_candidates'
		clearTimeout(this.connectionTimeout)
		this.channel = undefined
		connection.close()
		this.setStatus('disconnected')
		this.fail(reason)
	}
	private attach(connection: DataConnection) {
		this.channel = connection
		this.setStatus('connecting')
		// Both sides stop waiting if an offered connection never completes.
		this.connectionTimeout = setTimeout(() => this.failConnection(connection, 'network'), 35000)
		connection.peerConnection?.addEventListener('iceconnectionstatechange', () => {
			if (connection.peerConnection?.iceConnectionState === 'failed') this.failConnection(connection, 'network')
		})
		connection.on('open', () => {
			if (this.channel !== connection) return
			connection.send({ type: 'hello', version: protocolVersion, map: this.map.id, fingerprint: matchFingerprint(this.map) })
		})
		connection.on('close', () => {
			if (this.channel !== connection) return
			if (!this.hasConnected) {
				this.failConnection(connection, 'network')
				return
			}
			this.setStatus('disconnected')
		})
		connection.on('error', () => {
			if (this.channel !== connection) return
			if (!this.hasConnected) {
				this.failConnection(connection, 'network')
				return
			}
			this.setStatus('disconnected')
		})
		connection.on('data', (input) => {
			if (this.channel !== connection) return
			if (!input || typeof input !== 'object' || JSON.stringify(input).length > 262144) return
			const message = input as Record<string, unknown>
			if (message.type === 'rejected') {
				this.failConnection(connection, ['incompatible', 'wrong_map', 'unavailable'].includes(String(message.reason)) ? String(message.reason) : 'failed')
				return
			}
			if (!this.hasConnected) {
				if (message.type !== 'hello') return
				if (message.version !== protocolVersion || message.map !== this.map.id || message.fingerprint !== matchFingerprint(this.map)) {
					this.failConnection(connection, 'incompatible')
					return
				}
				this.hasConnected = true
				clearTimeout(this.connectionTimeout)
				this.heartbeat = setInterval(() => {
					if (Date.now() - this.lastSeen > 10000) this.setStatus('disconnected')
					this.send({ type: 'heartbeat' })
				}, 2000)
			}
			this.lastSeen = Date.now()
			this.setStatus('connected')
			if (message.type === 'hello' || message.type === 'heartbeat') return
			if (!this.messages.size) {
				if (this.pending.length < 32) this.pending.push(message)
			} else for (const listener of this.messages) listener(message)
		})
	}
	send(message: unknown): boolean {
		if (!this.hasConnected || !this.channel?.open || this.channel.dataChannel.bufferedAmount > 1048576) return false
		try {
			this.channel.send(message)
			return true
		} catch {
			this.setStatus('disconnected')
			return false
		}
	}
	onMessage(listener: (message: unknown) => void) {
		this.messages.add(listener)
		for (const message of this.pending.splice(0)) listener(message)
		return () => {
			this.messages.delete(listener)
		}
	}
	onStatus(listener: (status: PeerStatus) => void) {
		this.statuses.add(listener)
		listener(this.status)
		return () => {
			this.statuses.delete(listener)
		}
	}
	onError(listener: (error: PeerError) => void) {
		this.errors.add(listener)
		return () => {
			this.errors.delete(listener)
		}
	}
	async createInvitation() {
		const peer = await this.initialize()
		return `PW2.${protocolVersion}.${this.map.id}.${matchFingerprint(this.map)}.${peer.id.slice(3)}`
	}
	async acceptInvitation(input: string) {
		const invitation = decodeSignal(input)
		if (invitation.map !== this.map.id) throw new PeerError('wrong_map')
		if (invitation.fingerprint !== matchFingerprint(this.map)) throw new PeerError('incompatible')
		const peer = await this.initialize()
		this.attach(
			peer.connect(invitation.peer, {
				label: 'pixelswars',
				serialization: 'json',
				reliable: true,
				metadata: { version: protocolVersion, map: this.map.id, fingerprint: matchFingerprint(this.map) }
			})
		)
	}
	close() {
		if (this.status === 'closed') return
		this.setStatus('closed')
		this.abort.abort()
		clearInterval(this.heartbeat)
		clearTimeout(this.connectionTimeout)
		this.channel?.close()
		this.peer?.destroy()
		this.messages.clear()
		this.statuses.clear()
		this.errors.clear()
		this.pending = []
	}
}
