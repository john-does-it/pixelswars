import { test, expect } from '@playwright/test'

test('selection corners appear only over map images on hover-capable devices', async ({ page, isMobile }) => {
	await page.goto('/')
	const checkThumbnail = async (selector: string) => {
		const thumbnail = page.locator(selector)
		const corners = thumbnail.locator('.selection-corners')
		await expect(corners).toBeHidden()
		await thumbnail.hover()
		if (isMobile) await expect(corners).toBeHidden()
		else await expect(corners).toBeVisible()
		await page.mouse.move(0, 0)
		await expect(corners).toBeHidden()
	}
	await checkThumbnail('.featured .map-thumbnail')
	await page.getByRole('button', { name: 'View all maps' }).click()
	await checkThumbnail('.grid .map:nth-child(2) .map-thumbnail')
})

test('the featured map fits the frame and its arrows stay anchored while browsing', async ({ page, isMobile }) => {
	await page.goto('/')
	for (const width of isMobile ? [320, 390, 768] : [1049, 1567, 1568, 2560]) {
		await page.setViewportSize({ width, height: 900 })
		const featured = page.locator('.featured')
		await expect(featured.locator('.map')).toHaveCount(1)
		const frame = (await featured.locator('.preview-frame').boundingBox())!
		if (width < 1568) {
			expect(frame.x).toBe(0)
			expect(frame.width).toBe(await page.evaluate(() => document.documentElement.clientWidth))
		} else expect(frame.x).toBeGreaterThan(0)
		await featured.getByRole('button', { name: 'Next maps' }).scrollIntoViewIfNeeded()
		const img = featured.locator('.map-thumbnail > img')
		await expect(img).toBeVisible()
		const box = (await img.boundingBox())!
		expect(box.width).toBeGreaterThan(Math.min(width - 50, 300))
		expect(box.height).toBeLessThanOrEqual(480)
		expect(box.x).toBeGreaterThanOrEqual(0)
		expect(box.x + box.width).toBeLessThanOrEqual(width)
		const next = featured.getByRole('button', { name: 'Next maps' })
		const previous = featured.getByRole('button', { name: 'Previous maps' })
		const right = (await next.boundingBox())!
		const left = (await previous.boundingBox())!
		if (width <= 640) expect(right.y).toBeGreaterThanOrEqual(box.y + box.height)
		else expect(right.x).toBeGreaterThanOrEqual(box.x + box.width)
		for (let step = 0; step < 3; step++) {
			await next.click()
			await expect(img).toBeVisible()
			expect(await next.boundingBox()).toEqual(right)
			expect(await previous.boundingBox()).toEqual(left)
		}
	}
})

test('map selection is available while the preview image is loading', async ({ page }) => {
	let release!: () => void
	const paused = new Promise<void>((resolve) => (release = resolve))
	await page.route('**/map-previews/map-35.png', async (route) => {
		await paused
		await route.continue()
	})
	await page.goto('/', { waitUntil: 'domcontentloaded' })
	const carousel = page.locator('.featured')
	try {
		await expect(carousel.getByRole('status')).toHaveCount(0)
		await carousel.locator('.selected').click()
		await expect(page.getByRole('dialog')).toBeVisible()
	} finally {
		release()
	}
})

test('navigation wraps and choosing a thumbnail returns to its preview before setup', async ({ page }) => {
	await page.goto('/')
	const current = page.locator('.featured .selected')
	const first = await current.getAttribute('data-map-id')
	await page.getByRole('button', { name: 'Previous maps' }).click()
	const last = await current.getAttribute('data-map-id')
	expect(last).not.toBe(first)
	await page.getByRole('button', { name: 'Next maps' }).click()
	await expect(current).toHaveAttribute('data-map-id', first!)
	await page.getByRole('button', { name: 'View all maps' }).click()
	await expect(page.locator('.grid .selected')).toHaveAttribute('data-map-id', first!)
	await page.locator('.grid .map').last().click()
	await expect(current).toHaveAttribute('data-map-id', last!)
	await expect(current).toBeFocused()
	await expect(page.getByRole('dialog')).toHaveCount(0)
	await current.press('Enter')
	await expect(page.getByRole('dialog').locator(`a[href$="/play/${last}/"]`)).toHaveCount(1)
})

test('swiping the carousel selects one map without opening the mode chooser', async ({ page, isMobile }) => {
	test.skip(!isMobile)
	await page.goto('/')
	const selected = page.locator('.featured .selected')
	const first = await selected.getAttribute('data-map-id')
	await page.getByRole('button', { name: 'Next maps' }).click()
	const next = await selected.getAttribute('data-map-id')
	await page.getByRole('button', { name: 'Previous maps' }).click()
	await selected.scrollIntoViewIfNeeded()
	const box = (await selected.boundingBox())!
	const x = box.x + box.width / 2
	const y = box.y + box.height / 2
	const session = await page.context().newCDPSession(page)
	for (const delta of [-90, 90]) {
		await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
		await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + delta, y }] })
		await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
		await expect(selected).toHaveAttribute('data-map-id', (delta < 0 ? next : first)!)
		await expect(page.getByRole('dialog')).toHaveCount(0)
	}
})

test('compact editor has sprite selectors, preserves painted cells on resize, and exports', async ({ page }) => {
	await page.goto('/')
	const editor = page.locator('.map-editor.embedded')
	await editor.scrollIntoViewIfNeeded()
	await expect(editor.locator('.sprite-tabs button')).toHaveCount(0)
	await expect(editor.locator('#name,#json-panel,.canvas-toolbar,.canvas-footer,.submission')).toHaveCount(0)
	await expect(page.locator('#how-to-play')).toHaveCount(0)
	await expect(page.locator('a[href*="tutorial"],a[href*="how-to-play"]')).toHaveCount(0)
	const cells = editor.locator('[data-cell]')
	await expect(cells).toHaveCount(425)
	await editor.locator('.palette-group').nth(1).locator('button').first().click()
	await cells.nth(26).click()
	await expect(cells.nth(26)).toHaveClass(/-capturedby2/)
	await editor.getByRole('combobox').selectOption('0')
	await cells.nth(26).click()
	await expect(cells.nth(26)).not.toHaveClass(/-capturedby/)
	await expect(cells.nth(26)).toHaveClass(/-building/)
	await editor.locator('.compact-palette button[aria-label="Forest"]').click()
	await cells.nth(26).click()
	await expect(cells.nth(26)).toHaveClass(/-forest/)
	await editor.getByRole('button', { name: 'Columns +', exact: true }).click()
	await expect(cells).toHaveCount(459)
	await expect(cells.nth(28)).toHaveClass(/-forest/)
	await expect(cells.nth(430)).toHaveClass(/-forest/)
	const download = page.waitForEvent('download')
	await editor.getByRole('button', { name: 'Export', exact: true }).click()
	expect((await download).suggestedFilename()).toBe('board-15.json')
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('map grid shows each map once and opens the mode chooser', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: 'View all maps', exact: true }).click()
	const cards = page.locator('.maps .map')
	await expect(cards.first()).toBeVisible()
	const ids = await cards.evaluateAll((elements) => elements.map((e) => e.getAttribute('data-map-id')))
	expect(new Set(ids).size).toBe(ids.length)
	await expect(page.locator('.gallery-arrow')).toHaveCount(0)
	expect(await page.locator('.maps').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true)
	await cards.last().click()
	await page.locator('.featured .selected').click()
	await expect(page.getByRole('dialog')).toBeVisible()
})

test('Enter opens the highlighted map mode chooser without intercepting text input', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: 'View all maps', exact: true }).click()
	const gallery = page.locator('.maps')
	await expect(gallery.locator('.map').nth(1)).toHaveAttribute('href', /^\/play\//)
	const choice = gallery.locator('.map').nth(1)
	const selectedId = await choice.getAttribute('data-map-id')
	await choice.press('Enter')
	await expect(gallery.locator('.selected')).toBeFocused()
	await page.keyboard.press('Enter')
	const dialog = page.getByRole('dialog')
	await expect(dialog).toBeVisible()
	await expect(dialog.locator(`a[href$="/play/${selectedId}/"]`)).toHaveCount(1)
	await page.keyboard.press('Escape')
	await page.locator('#pseudonym').fill('Player')
	await page.keyboard.press('Enter')
	await expect(page.getByRole('dialog')).toHaveCount(0)
})
