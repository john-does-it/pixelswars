import { test, expect } from '@playwright/test'

// Run against a production build: slow downloads include the lazy Expert module.
// CPU throttling exercises calculation latency independently of network latency.
for (const mapId of [11, 12]) {
	for (const difficulty of ['hard', 'expert']) {
		test(`${difficulty} stays responsive on large map ${mapId} with slow network and CPU`, async ({ page, context }, testInfo) => {
			test.skip(testInfo.project.name !== 'desktop', 'CDP throttling is measured once per scenario')
			test.setTimeout(180000)
			const session = await context.newCDPSession(page)
			await session.send('Network.enable')
			await session.send('Network.setCacheDisabled', { cacheDisabled: true })
			await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 192 * 1024, uploadThroughput: 96 * 1024 })
			await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
			const errors: string[] = []
			page.on('pageerror', (error) => errors.push(error.message))
			const started = Date.now()
			const metrics: Record<string, number | string> = { mapId, difficulty, cpuSlowdown: 4, latencyMs: 150, downloadKiBps: 192 }
			try {
				await page.goto(`/play/${mapId}/?ai=${difficulty}`, { timeout: 90000, waitUntil: 'domcontentloaded' })
				await expect(page.locator('.board [data-cell]').first()).toBeVisible({ timeout: 60000 })
				metrics.loadMs = Date.now() - started
				await page.evaluate(() => {
					const timing = { previous: performance.now(), maximumGap: 0, samples: 0 }
					Object.assign(window, { aiPerformance: timing })
					setInterval(() => {
						const now = performance.now()
						timing.maximumGap = Math.max(timing.maximumGap, now - timing.previous)
						timing.previous = now
						timing.samples++
					}, 50)
				})
				const initialCells = await page.locator('.board [data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.getAttribute('data-cell')).join(','))
				const ready = Date.now()
				await expect.poll(() => page.locator('.board [data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.getAttribute('data-cell')).join(',')), { timeout: 15000 }).not.toBe(initialCells)
				metrics.firstActionMs = Date.now() - ready
				await expect(page.getByText('Round 2', { exact: true })).toBeVisible({ timeout: 60000 })
				metrics.turnMs = Date.now() - ready
				await expect(page.getByRole('button', { name: 'End round', exact: true })).toBeEnabled()
				const heartbeat = await page.evaluate(() => (window as unknown as { aiPerformance: { maximumGap: number; samples: number } }).aiPerformance)
				metrics.maxMainThreadGapMs = heartbeat.maximumGap
				expect(heartbeat.samples).toBeGreaterThan(10)
				expect(heartbeat.maximumGap, 'AI must yield so controls and scrolling remain responsive').toBeLessThan(1500)
				expect(errors).toEqual([])
			} finally {
				await testInfo.attach('ai-performance.json', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' })
				await session.detach()
			}
		})
	}
}
