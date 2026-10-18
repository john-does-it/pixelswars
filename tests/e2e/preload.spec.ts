import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

test('preloading revalidates a cached manifest after sprites are renamed', async ({ page, baseURL }) => {
	test.setTimeout(60000)
	let outdated = true
	let manifestRequests = 0
	const retiredSprite = '/assets/units/transport-1.svg'
	const failedAssets: string[] = []
	// A real HTTP cache is needed here: Playwright routing disables browser caching.
	const server = createServer(async (request, response) => {
		try {
			const path = request.url ?? '/'
			if (path === '/seed-cache') {
				response.setHeader('Content-Type', 'text/html')
				response.end('<!doctype html><title>Seed asset cache</title>')
				return
			}
			if (path === '/assets/preload-manifest.json') {
				manifestRequests++
				response.setHeader('Content-Type', 'application/json')
				response.setHeader('Cache-Control', 'public, max-age=3600')
				response.end(outdated ? JSON.stringify([retiredSprite]) : await (await fetch(new URL(path, baseURL))).text())
				return
			}
			const upstream = await fetch(new URL(path, baseURL))
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
