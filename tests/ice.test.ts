import { test } from 'node:test'
import assert from 'node:assert/strict'
import { iceConfiguration } from '../src/lib/game/ice.ts'

const settings = { app: 'pixelswars-test', apiKey: 'credential-scoped-test-key' }
const servers = [{ urls: 'stun:stun.relay.metered.ca:80' }, { urls: ['turn:standard.relay.metered.ca:80', 'turn:standard.relay.metered.ca:80?transport=tcp', 'turns:standard.relay.metered.ca:443?transport=tcp'], username: 'test-user', credential: 'test-password' }]
const respond =
	(body: unknown, status = 200): typeof fetch =>
	async () =>
		new Response(JSON.stringify(body), { status })

test('unconfigured development keeps STUN and makes no provider request', async () => {
	const configuration = await iceConfiguration({}, undefined, async () => {
		throw new Error('Unexpected request')
	})
	assert.deepEqual(configuration, { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], iceTransportPolicy: 'all' })
})

test('Metered credentials are fetched without cookies and preserve UDP, TCP and TLS alternatives', async () => {
	const request: typeof fetch = async (input, options) => {
		const address = new URL(String(input))
		assert.equal(address.origin, 'https://pixelswars-test.metered.live')
		assert.equal(address.pathname, '/api/v1/turn/credentials')
		assert.deepEqual([...address.searchParams], [['apiKey', settings.apiKey]])
		assert.equal(options?.credentials, 'omit')
		assert.equal(options?.referrerPolicy, 'no-referrer')
		assert.equal(options?.cache, 'no-store')
		assert.equal(options?.redirect, 'error')
		return respond(servers)(input, options)
	}
	const configuration = await iceConfiguration({ ...settings, app: settings.app + '.metered.live' }, undefined, request)
	assert.equal(configuration.iceTransportPolicy, 'all')
	assert.deepEqual(configuration.iceServers?.[1], servers[1])
	assert.equal((await iceConfiguration({ ...settings, relayOnly: 'true' }, undefined, respond(servers))).iceTransportPolicy, 'relay')
})

test('partial or invalid settings fail before contacting a provider', async () => {
	for (const invalid of [{ app: settings.app }, { apiKey: settings.apiKey }, { relayOnly: 'true' }, { ...settings, app: 'other.example/path' }, { ...settings, relayOnly: 'yes' }]) {
		let requested = false
		await assert.rejects(
			iceConfiguration(invalid, undefined, async () => {
				requested = true
				return new Response()
			}),
			/^Error: relay$/
		)
		assert.equal(requested, false)
	}
})

test('invalid relay responses cannot silently become direct-only connections', async () => {
	for (const response of [null, {}, [], [servers[0]], [{ urls: 'https://example.com' }], [{ urls: 'turn:relay.example.com' }], [{ urls: [] }], [{ urls: 'turn:relay.example.com', username: 'user', credential: 42 }]]) {
		await assert.rejects(iceConfiguration(settings, undefined, respond(response)), /^Error: relay$/)
	}
})

test('provider failures stay generic and do not disclose keys or silently disable TURN', async () => {
	for (const status of [401, 403, 429, 500]) await assert.rejects(iceConfiguration(settings, undefined, respond({ secret: settings.apiKey }, status)), /^Error: relay$/)
	await assert.rejects(
		iceConfiguration(settings, undefined, async () => {
			throw new Error(settings.apiKey)
		}),
		/^Error: relay$/
	)
	await assert.rejects(
		iceConfiguration(settings, undefined, async () => new Response('not json')),
		/^Error: relay$/
	)
})

test('leaving during credential retrieval aborts the pending request', async () => {
	const controller = new AbortController()
	let requestSignal: AbortSignal | null | undefined
	const request: typeof fetch = async (_input, options) => {
		requestSignal = options?.signal
		return new Promise((_resolve, reject) => requestSignal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
	}
	const pending = iceConfiguration(settings, controller.signal, request)
	controller.abort()
	await assert.rejects(pending, /^Error: relay$/)
	assert.equal(requestSignal?.aborted, true)
})

test('an unresponsive credential service is aborted after ten seconds', async (context) => {
	context.mock.timers.enable({ apis: ['setTimeout'] })
	const request: typeof fetch = async (_input, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('timeout')), { once: true }))
	const pending = assert.rejects(iceConfiguration(settings, undefined, request), /^Error: relay$/)
	context.mock.timers.tick(10000)
	await pending
})
