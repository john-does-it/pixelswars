import { test, expect } from '@playwright/test'

test('compact editor has sprite selectors, preserves painted cells on resize, and exports', async ({ page }) => {
	await page.goto('/')
	const editor = page.locator('.map-editor.embedded')
	await editor.scrollIntoViewIfNeeded()
	await expect(editor.locator('.sprite-tabs button')).toHaveCount(3)
	await expect(editor.locator('#name,#json-panel,.canvas-toolbar,.canvas-footer,.submission')).toHaveCount(0)
	const cells = editor.locator('[data-cell]')
	await expect(cells).toHaveCount(425)
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

test('tutorial selectors change the board and movement works with the keyboard', async ({ page }) => {
	await page.goto('/')
	const tutorial = page.locator('#how-to-play')
	const cells = tutorial.locator('.board [data-cell]')
	await expect(cells).toHaveCount(64)
	expect((await cells.nth(57).boundingBox())!.width).toBeCloseTo(40, 1)
	await cells.nth(57).click()
	await cells.nth(57).press('ArrowRight')
	await expect(cells.nth(58).locator('.unit-container')).toHaveCount(1)
	await tutorial.locator('.topic-menu').getByRole('button', { name: 'Attack', exact: false }).click()
	await expect(tutorial.locator('.unit-container')).toHaveCount(2)
	await tutorial.locator('.topic-menu').getByRole('button', { name: 'Capture', exact: false }).click()
	await expect(cells.nth(50)).toHaveClass(/-city/)
	await cells.nth(57).click()
	await cells.nth(50).click()
	await tutorial.getByRole('button', { name: 'Capture', exact: true }).first().click()
	await expect(cells.nth(50)).toHaveClass(/-capturedby2/)
	await tutorial.getByRole('button', { name: 'Show details', exact: true }).click()
	await expect(page.getByRole('dialog', { name: 'Cell statistics' })).toBeVisible()
	await page.getByRole('button', { name: 'Close', exact: true }).click()
	await expect(cells.nth(50).locator('.unit-container')).toHaveCount(1)
})

test('gallery pointer follows the mouse and selectors have no hover background', async ({ page, isMobile }) => {
	test.skip(isMobile, 'Mouse-only feedback')
	await page.goto('/')
	const art = page.locator('.map-art').first()
	await art.scrollIntoViewIfNeeded()
	const box = (await art.boundingBox())!
	await page.mouse.move(box.x + 40, box.y + 60)
	const cursor = art.locator('.crosshair')
	await expect(cursor).toBeVisible()
	const first = (await cursor.boundingBox())!
	expect(first.x + first.width / 2).toBeCloseTo(box.x + 40, 0)
	expect(first.y + first.height / 2).toBeCloseTo(box.y + 60, 0)
	await page.mouse.move(box.x + 90, box.y + 120)
	const second = (await cursor.boundingBox())!
	expect(second.x + second.width / 2).toBeCloseTo(box.x + 90, 0)
	expect(second.y + second.height / 2).toBeCloseTo(box.y + 120, 0)
	const selector = page.getByRole('group', { name: 'Size', exact: true }).getByRole('button', { name: 'XL', exact: true })
	await selector.hover()
	await expect(cursor).toHaveCount(0)
	await expect(selector).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
})

test('mobile gallery swipes both ways without opening a match accidentally', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'Touch navigation')
	await page.goto('/')
	const gallery = page.locator('.maps')
	await gallery.scrollIntoViewIfNeeded()
	const box = (await gallery.boundingBox())!
	const cardStep = await gallery.evaluate((e) => e.querySelector('.map')!.getBoundingClientRect().width + parseFloat(getComputedStyle(e).columnGap))
	const client = await page.context().newCDPSession(page)
	async function swipe(from: number, to: number) {
		const settled = gallery.evaluate((element) => new Promise<void>((resolve) => element.addEventListener('scrollend', () => resolve(), { once: true })))
		const y = box.y + 140
		await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y }] })
		for (let step = 1; step <= 12; step++) {
			await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + ((to - from) * step) / 12, y }] })
			await page.waitForTimeout(16)
		}
		await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
		await settled
	}
	const left = box.x + 35
	const right = box.x + box.width - 35
	await swipe(right, left)
	await expect.poll(() => gallery.evaluate((e) => e.scrollLeft)).toBeGreaterThan(200)
	await expect(page.getByRole('dialog')).toHaveCount(0)
	// Let native momentum settle before reversing the gesture.
	await expect.poll(() => gallery.evaluate((e, step) => Math.abs(e.scrollLeft - step), cardStep)).toBeLessThan(2)
	await swipe(left, right)
	await expect.poll(() => gallery.evaluate((e) => e.scrollLeft)).toBeLessThan(2)
	await expect(page.getByRole('dialog')).toHaveCount(0)
	await page.locator('.map-art').first().tap()
	await expect(page.getByRole('dialog')).toBeVisible()
	await client.detach()
})
