interface RelaySettings {
	app?: string
	apiKey?: string
	relayOnly?: string
}

function relayServers(input: unknown): RTCIceServer[] {
	if (!Array.isArray(input) || !input.length || input.length > 16) throw new Error('relay')
	let hasRelay = false
	const servers = input.map((server) => {
		if (!server || typeof server !== 'object') throw new Error('relay')
		const urls = typeof server.urls === 'string' ? [server.urls] : server.urls
		if (!Array.isArray(urls) || !urls.length || urls.length > 8 || !urls.every((url: unknown) => typeof url === 'string' && url.length <= 512 && /^(?:stun|stuns|turn|turns):[a-z0-9.-]+(?::\d{1,5})?(?:\?transport=(?:udp|tcp))?$/i.test(url))) throw new Error('relay')
		const isRelay = urls.some((url: string) => /^turns?:/i.test(url))
		if (!isRelay) return { urls }
		if (typeof server.username !== 'string' || !server.username || server.username.length > 1024 || typeof server.credential !== 'string' || !server.credential || server.credential.length > 4096) throw new Error('relay')
		hasRelay = true
		return { urls, username: server.username, credential: server.credential }
	})
	if (!hasRelay) throw new Error('relay')
	return servers
}

export async function iceConfiguration(settings: RelaySettings = {}, signal?: AbortSignal, request: typeof fetch = fetch): Promise<RTCConfiguration> {
	const app = (settings.app ?? '').trim().replace(/\.metered\.live$/, '')
	const apiKey = (settings.apiKey ?? '').trim()
	const relayOnly = settings.relayOnly === 'true'
	if (settings.relayOnly && !['true', 'false'].includes(settings.relayOnly)) throw new Error('relay')
	if (!app && !apiKey && !relayOnly) return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], iceTransportPolicy: 'all' }
	if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(app) || !apiKey || apiKey.length > 1024) throw new Error('relay')
	const address = new URL(`https://${app}.metered.live/api/v1/turn/credentials`)
	address.searchParams.set('apiKey', apiKey)
	const controller = new AbortController()
	const abort = () => controller.abort()
	signal?.addEventListener('abort', abort, { once: true })
	if (signal?.aborted) controller.abort()
	const timeout = setTimeout(abort, 10000)
	try {
		const response = await request(address, { signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error' })
		if (!response.ok) throw new Error('relay')
		return { iceServers: relayServers(await response.json()), iceTransportPolicy: relayOnly ? 'relay' : 'all' }
	} catch {
		// Provider errors and request URLs must not leak credentials into UI or logs.
		throw new Error('relay')
	} finally {
		clearTimeout(timeout)
		signal?.removeEventListener('abort', abort)
	}
}
