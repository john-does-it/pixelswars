import { test, expect } from '@playwright/test'
import { createServer, request as httpRequest } from 'node:http'
import type { AddressInfo } from 'node:net'

test('preloading revalidates a cached manifest after sprites are renamed', async ({ page, baseURL }) => {
	test.setTimeout(60000)
	let outdated = true
	let manifestRequests = 0
	const retiredSprite = '/assets/units/transport-1.svg'
	const failedAssets: string[] = []
	const manifestURL = new URL('/assets/preload-manifest.json', baseURL)
	// A real HTTP cache is needed here: Playwright routing disables browser caching.
	const server = createServer(async (request, response) => {
		try {
			const path = request.url ?? '/'
			if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
				response.statusCode = 400
				response.end()
				return
			}
			if (path === '/seed-cache') {
				response.setHeader('Content-Type', 'text/html')
				response.end('<!doctype html><title>Seed asset cache</title>')
				return
			}
			if (path === '/assets/preload-manifest.json') {
				manifestRequests++
				response.setHeader('Content-Type', 'application/json')
				response.setHeader('Cache-Control', 'public, max-age=3600')
				response.end(outdated ? JSON.stringify([retiredSprite]) : await (await fetch(manifestURL, { redirect: 'error' })).text())
				return
			}
			// Only copy the path and query: incoming URLs must never control the upstream origin.
			const requested = new URL(path, 'http://localhost')
			const target = new URL(baseURL!)
			target.pathname = requested.pathname
			target.search = requested.search
			const upstream = await fetch(target, { redirect: 'error' })
			response.statusCode = upstream.status
			response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream')
			response.end(Buffer.from(await upstream.arrayBuffer()))
		} catch {
			response.statusCode = 502
			response.end()
		}
	})
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
	const origin = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
	try {
		// Send raw request targets because browser URL parsing normalizes these forms.
		for (const path of ['http://127.0.0.1:1/private', '//127.0.0.1:1/private', '/\\127.0.0.1:1/private']) {
			const status = await new Promise<number | undefined>((resolve, reject) => {
				const request = httpRequest(origin, { path }, (response) => {
					response.resume()
					response.on('end', () => resolve(response.statusCode))
				})
				request.on('error', reject)
				request.end()
			})
			expect(status, `Reject unsafe proxy target: ${path}`).toBe(400)
		}
		await page.goto(origin + '/seed-cache')
		const cachedManifest = () => page.evaluate(async () => (await fetch('/assets/preload-manifest.json')).json())
		expect(await cachedManifest()).toEqual([retiredSprite])
		outdated = false
		expect(await cachedManifest()).toEqual([retiredSprite])
		expect(manifestRequests).toBe(1)
		page.on('response', (response) => {
			if (response.url().includes('/assets/') && response.status() >= 400) failedAssets.push(response.url())
		})
		await page.goto(origin + '/play/1/')
		await expect(page.locator('[data-cell]')).toHaveCount(64)
		expect(manifestRequests).toBe(2)
		expect(failedAssets).toEqual([])
	} finally {
		server.closeAllConnections()
		await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
	}
})
