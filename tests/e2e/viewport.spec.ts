import { zoomToReadableTiles } from './map-view'
import { test, expect } from '@playwright/test'

test('small screens keep the selected unit above actions without a floating preview', async ({ page, isMobile }) => {
	for (const size of [
		{ width: 375, height: 667 },
		{ width: 320, height: 480 }
	]) {
		await page.setViewportSize(size)
		await page.goto('/play/1/')
		await expect(page.locator('dialog.turn-transition')).toHaveCount(0)
		await page.getByRole('button', { name: 'End round', exact: true }).click()
		await expect(page.locator('dialog.turn-transition')).toHaveCount(0)
		for (let step = 0; step < 5; step++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
		const unit = page.locator('[data-cell="61"]')
		if (isMobile) await unit.tap()
		else await unit.click()
		await expect(page.locator('.tile-preview')).toHaveCount(0)
		await expect
			.poll(() =>
				page.evaluate(() => {
					const unit = document.querySelector('.board [aria-pressed="true"]')!.getBoundingClientRect()
					const frame = document.querySelector('.board-viewport')!.getBoundingClientRect()
					const controls = document.querySelector('.action-controls')!.parentElement!.getBoundingClientRect()
					return unit.bottom <= Math.min(frame.bottom, controls.top) + 1 && unit.top >= frame.top - 1 && controls.top - frame.bottom >= 7
				})
			)
			.toBe(true)
		const mapHeight = (await page.locator('.board-frame').boundingBox())!.height
		await page.locator('.board-viewport').evaluate((element) => element.scrollBy({ top: -40, left: -20 }))
		await expect(page.locator('.tile-preview')).toHaveCount(0)
		expect((await page.locator('.board-frame').boundingBox())!.height).toBeCloseTo(mapHeight, 1)
	}
})

test('mouse wheel zooms around its pointer and zoom controls stay centered below the board', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 })
	await page.goto('/play/12/')
	await expect(page.locator('dialog.turn-transition')).toBeVisible()
	await expect(page.locator('dialog.turn-transition')).toHaveCount(0)
	const viewport = page.locator('.board-viewport')
	const frame = await viewport.boundingBox()
	const pointer = { x: frame!.x + frame!.width / 2, y: frame!.y + frame!.height / 2 }
	const pointOnMap = () =>
		page.locator('.board').evaluate((board, pointer) => {
			const bounds = board.getBoundingClientRect()
			return { x: (pointer.x - bounds.left) / bounds.width, y: (pointer.y - bounds.top) / bounds.height }
		}, pointer)
	const before = await pointOnMap()
	const width = (await page.locator('.board').boundingBox())!.width
	await page.mouse.move(pointer.x, pointer.y)
	await page.mouse.wheel(0, -100)
	await expect.poll(async () => (await page.locator('.board').boundingBox())!.width).toBeGreaterThan(width)
	const after = await pointOnMap()
	expect(after.x).toBeCloseTo(before.x, 2)
	expect(after.y).toBeCloseTo(before.y, 2)
	const zoom = await page.getByRole('button', { name: 'Zoom in', exact: true }).boundingBox()
	const actions = await page.getByRole('button', { name: 'End round', exact: true }).boundingBox()
	expect(zoom!.y + zoom!.height).toBeLessThan(actions!.y)
	expect(zoom!.x + zoom!.width / 2).toBeCloseTo(frame!.x + frame!.width / 2, 0)
	await expect(page.locator('html')).toHaveCSS('scrollbar-width', 'none')
	await viewport.evaluate((element) => element.scrollTo({ left: 0, top: 0 }))
	const zoomedWidth = (await page.locator('.board').boundingBox())!.width
	await page.mouse.move(zoom!.x + zoom!.width / 2, zoom!.y + zoom!.height / 2)
	await page.mouse.wheel(0, 100)
	await page.waitForTimeout(150)
	expect((await page.locator('.board').boundingBox())!.width).toBeCloseTo(zoomedWidth, 1)
})

test('tile thumbnail opens unit and terrain details on demand without changing selection', async ({ page }) => {
	await page.goto('/play/1/')
	await expect(page.locator('dialog.turn-transition')).toHaveCount(0)
	const inspect = page.getByRole('button', { name: 'Show details', exact: true })
	const dialog = page.getByRole('dialog', { name: 'Cell statistics', exact: true })
	await expect(inspect).toHaveCount(0)
	await page.locator('[data-cell="1"]').click()
	await expect(inspect.locator('img[src*="/assets/units/"]')).toBeVisible()
	await expect(dialog).toHaveCount(0)
	const before = await page.locator('.board-frame').boundingBox()
	await inspect.click()
	await expect(dialog).toBeVisible()
	await expect(dialog.getByTestId('preview-health')).toHaveText('100/100')
	await page.keyboard.press('ArrowDown')
	await expect(page.locator('[data-cell="1"] [data-unit="1"]')).toHaveCount(1)
	await page.keyboard.press('Escape')
	await expect(dialog).toHaveCount(0)
	await expect(page.locator('[data-cell="1"]')).toHaveAttribute('aria-pressed', 'true')
	expect((await page.locator('.board-frame').boundingBox())!.height).toBeCloseTo(before!.height, 1)
	await page.locator('[data-cell="9"]').click()
	await expect(inspect.locator('.terrain-icon')).toHaveCSS('background-image', await page.locator('[data-cell="9"]').evaluate((el) => getComputedStyle(el).backgroundImage))
	await inspect.click()
	await expect(dialog.getByRole('heading', { name: 'Hospital', exact: true })).toBeVisible()
	await dialog.getByRole('button', { name: 'Close', exact: true }).click()
	await page.locator('[data-cell="30"]').click()
	await expect(inspect.locator('img[src*="/assets/units/"]')).toHaveCount(0)
	await inspect.click()
	await expect(dialog.getByTestId('preview-health')).toHaveCount(0)
	await page.keyboard.press('Escape')
	await page.locator('[data-cell="63"]').click()
	await inspect.click()
	await expect(dialog.getByTestId('preview-health')).toHaveText('120/120')
	await page.keyboard.press('Escape')
	await expect(page.locator('.tile-preview')).toHaveCount(0)
})

test('players and money sit above the battlefield with stable controls below while zooming', async ({ page }) => {
	for (const size of [
		{ width: 1400, height: 900 },
		{ width: 412, height: 915 },
		{ width: 390, height: 844 },
		{ width: 320, height: 480 }
	]) {
		await page.setViewportSize(size)
		await page.goto('/play/1/')
		await expect(page.locator('.board')).toBeVisible()
		const frame = (await page.locator('.board-frame').boundingBox())!
		const zoomRow = (await page.locator('.board-zoom').boundingBox())!
		const zoom = (await page.locator('.zoom-controls').boundingBox())!
		const header = (await page.locator('.game-shell header').boundingBox())!
		const options = (await page.locator('header .options-button').boundingBox())!
		const actions = (await page.locator('.board-actions').boundingBox())!
		const minimap = (await page.locator('.minimap').boundingBox())!
		expect(header.y).toBe(0)
		expect(frame.y).toBe(header.y + header.height)
		expect(frame.x).toBe(0)
		expect(frame.width).toBe(size.width)
		expect(header.x).toBe(0)
		expect(header.width).toBe(size.width)
		expect(options.x + options.width).toBe(size.width - (size.width > 900 ? 16 : 8))
		expect(options.y + options.height).toBeLessThanOrEqual(header.y + header.height)
		expect(zoom.y - (frame.y + frame.height)).toBeCloseTo(16, 0)
		expect(zoom.x + zoom.width / 2).toBeCloseTo(frame.x + frame.width / 2, 0)
		expect(zoomRow.y + zoomRow.height - (zoom.y + zoom.height)).toBeCloseTo(16, 0)
		await expect(page.locator('.board-actions')).toHaveCSS('padding-bottom', '16px')
		expect(actions.y).toBeGreaterThanOrEqual(zoomRow.y + zoomRow.height)
		expect(minimap.y).toBeGreaterThanOrEqual(actions.y + actions.height)
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
		await expect(page.locator('.board-frame')).toHaveCSS('border-top-width', '0px')
		// Five pixels for the outer corner markers, plus two pixels of clearance.
		await expect(page.locator('.map-space')).toHaveCSS('padding', '7px')
		for (const name of ['Zoom in', 'Zoom out', 'Show the whole map']) {
			await page.getByRole('button', { name, exact: true }).click()
			expect(await page.locator('.game-shell header').boundingBox()).toEqual(header)
			expect(await page.locator('.board-frame').boundingBox()).toEqual(frame)
			expect(await page.locator('.board-actions').boundingBox()).toEqual(actions)
		}
	}
})

test('zoom fits both axes and keeps the camera separate from game state', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/play/12/')
	await expect(page.locator('dialog.turn-transition')).toBeVisible()
	await expect(page.locator('dialog.turn-transition')).toHaveCount(0, { timeout: 10000 })
	const viewport = page.locator('.board-viewport')
	const dimensions = () => viewport.evaluate((element) => ({ width: element.clientWidth, height: element.clientHeight, totalWidth: element.scrollWidth, totalHeight: element.scrollHeight }))
	const before = await page.locator('[data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.dataset.cell))
	await expect(page.locator('.minimap')).toHaveCount(1)
	const initial = await dimensions()
	expect(initial.totalWidth).toBeLessThanOrEqual(initial.width + 1)
	expect(initial.totalHeight).toBeLessThanOrEqual(initial.height + 1)
	await zoomToReadableTiles(page)
	await expect(page.locator('.minimap')).toHaveCount(1)
	await page.getByRole('button', { name: 'Show the whole map', exact: true }).click()
	await expect
		.poll(async () => {
			const size = await dimensions()
			return Math.max(size.totalWidth - size.width, size.totalHeight - size.height)
		})
		.toBeLessThanOrEqual(1)
	await expect(page.locator('.minimap')).toHaveCount(1)
	await page.setViewportSize({ width: 700, height: 450 })
	await expect
		.poll(async () => {
			const size = await dimensions()
			return Math.max(size.totalWidth - size.width, size.totalHeight - size.height)
		})
		.toBeLessThanOrEqual(1)
	await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
	await expect(page.locator('.minimap')).toHaveCount(1)
	expect(await page.locator('[data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.dataset.cell))).toEqual(before)
	await expect(page.locator('.board [aria-pressed="true"]')).toHaveCount(0)
})

test('dragging across a unit pans both axes without selecting or moving it', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/play/12/')
	await expect(page.locator('dialog.turn-transition')).toBeVisible()
	await expect(page.locator('dialog.turn-transition')).toHaveCount(0, { timeout: 10000 })
	await zoomToReadableTiles(page)
	const unit = page.locator('[data-unit]').first()
	const cell = await unit.locator('..').getAttribute('data-cell')
	const bounds = await unit.boundingBox()
	await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
	await page.mouse.down()
	await page.mouse.move(bounds!.x - 70, bounds!.y - 50, { steps: 8 })
	await page.mouse.up()
	await expect.poll(() => page.locator('.board-viewport').evaluate((element) => element.scrollLeft)).toBeGreaterThan(50)
	await expect.poll(() => page.locator('.board-viewport').evaluate((element) => element.scrollTop)).toBeGreaterThan(20)
	await expect(page.locator('.board [aria-pressed="true"]')).toHaveCount(0)
	expect(await unit.locator('..').getAttribute('data-cell')).toBe(cell)
	await page.locator('.overview').press('Home')
	await unit.click()
	await expect(page.locator(`[data-cell="${cell}"]`)).toHaveAttribute('aria-pressed', 'true')
})

test('minimap seeks vertically and horizontal scrolling never moves a selected unit', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/play/12/')
	await expect(page.locator('dialog.turn-transition')).toBeVisible()
	await expect(page.locator('dialog.turn-transition')).toHaveCount(0, { timeout: 10000 })
	await zoomToReadableTiles(page)
	const overview = page.locator('.overview')
	await page.locator('[data-unit]').first().click()
	const selected = await page.locator('.board [aria-pressed="true"]').getAttribute('data-cell')
	await overview.press('End')
	await expect.poll(() => page.locator('.board-viewport').evaluate((element) => element.scrollTop)).toBeGreaterThan(100)
	await expect.poll(async () => Number(await overview.locator('.visible-area').getAttribute('y'))).toBeGreaterThan(1)
	await overview.press('Home')
	await overview.press('ArrowDown')
	await overview.press('ArrowRight')
	expect(await page.locator('.board [aria-pressed="true"]').getAttribute('data-cell')).toBe(selected)
})

test('touch swipes keep following the finger in all four directions without selecting a cell', async ({ page, context }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/play/12/')
	await zoomToReadableTiles(page)
	const viewport = page.locator('.board-viewport')
	await viewport.evaluate((element) => element.scrollTo({ left: 250, top: 250, behavior: 'instant' }))
	const frame = (await viewport.boundingBox())!
	const start = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 }
	const beforeUnits = await page.locator('[data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.dataset.cell))
	const pageScroll = await page.evaluate(() => window.scrollY)
	const session = await context.newCDPSession(page)
	for (const [dx, dy] of [
		[-120, 0],
		[120, 0],
		[0, -120],
		[0, 120]
	]) {
		const before = await viewport.evaluate((element) => ({ x: element.scrollLeft, y: element.scrollTop }))
		await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] })
		for (let step = 1; step <= 8; step++) {
			await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (dx * step) / 8, y: start.y + (dy * step) / 8, id: 1 }] })
		}
		await expect.poll(() => viewport.evaluate((element) => ({ x: element.scrollLeft, y: element.scrollTop }))).toEqual({ x: before.x - dx, y: before.y - dy })
		await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
	}
	await expect(page.locator('.board [aria-pressed="true"]')).toHaveCount(0)
	expect(await page.locator('[data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.dataset.cell))).toEqual(beforeUnits)
	expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll)
	await session.detach()
})

test('touch pinch zooms without issuing a cell action', async ({ page, context }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/play/12/')
	await expect(page.locator('dialog.turn-transition')).toBeVisible()
	await expect(page.locator('dialog.turn-transition')).toHaveCount(0, { timeout: 10000 })
	await zoomToReadableTiles(page)
	const frame = await page.locator('.board-viewport').boundingBox()
	const cell = page.locator('[data-cell="0"]')
	const before = (await cell.boundingBox())!.width
	const session = await context.newCDPSession(page)
	const center = { x: frame!.x + frame!.width / 2, y: frame!.y + frame!.height / 2 }
	const fingers = (distance: number) => [
		{ x: center.x - distance, y: center.y, id: 1 },
		{ x: center.x + distance, y: center.y, id: 2 }
	]
	await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(40) })
	await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(70) })
	await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(90) })
	await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
	await expect.poll(async () => (await cell.boundingBox())!.width).toBeCloseTo(Math.min(112, (before * 90) / 40), 0)
	await expect(page.locator('.board [aria-pressed="true"]')).toHaveCount(0)
	await session.detach()
})
