import { test, expect } from '@playwright/test'

test('the mirror switch fills only its own row', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/#editor-title')
	await page.locator('.language-control select').selectOption('fr')
	await page.evaluate(() => document.fonts.ready.then(() => true))
	const toolbar = page.locator('.brush-toolbar')
	const mode = toolbar.getByRole('switch')
	const pickers = toolbar.locator('.picker-groups')
	const intrinsicWidth = (await mode.boundingBox())!.width
	for (const width of [440, 768, 1280]) {
		await page.setViewportSize({ width, height: 900 })
		await expect(async () => {
			const button = (await mode.boundingBox())!
			const group = (await pickers.boundingBox())!
			const available = await toolbar.evaluate((el) => el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight))
			if (width === 440) {
				expect(button.y).toBeGreaterThan(group.y + group.height)
				expect(button.width).toBeCloseTo(available, 0)
			} else {
				expect(button.y + button.height / 2).toBeCloseTo(group.y + group.height / 2, 0)
				expect(button.x - group.x - group.width).toBeGreaterThanOrEqual(32)
				expect(button.width).toBeCloseTo(intrinsicWidth, 0)
			}
		}).toPass({ timeout: 4000 })
	}
})

test('mirrored bridge supports stay below the decks when restoring, painting and undoing', async ({ page }, testInfo) => {
	await page.addInitScript(() => {
		const key = 'pixelswar-map-editor-draft-v1'
		if (localStorage.getItem(key)) return
		const cells = Array.from({ length: 49 }, () => ({ classes: ['-water'], owner: 0, capturePoints: 20 }))
		for (const index of [10, 38]) cells[index].classes = ['-road', '-bridge', '-h']
		// Reproduce the old rotation bug: the second support is above its deck.
		for (const index of [17, 31]) cells[index].classes = ['-water', '-under-bridge', '-h']
		localStorage.setItem(key, JSON.stringify({ id: '15', name: 'Bridge test', cols: 7, rows: 7, cells, units: [], editorMirrorMode: 'rotation' }))
	})
	await page.goto('/#editor-title')
	const cell = (index: number) => page.locator(`#board [data-cell="${index}"]`)
	await expect(page.locator('#mirror-mode')).toBeChecked()
	await expect(cell(17)).toHaveClass(/-under-bridge/)
	await expect(cell(45)).toHaveClass(/-under-bridge/)
	await expect(cell(31)).not.toHaveClass(/-under-bridge/)
	await expect(page.locator('#board .-under-bridge')).toHaveCount(2)
	await page.locator('.terrain-picker').selectOption('terrain_water')
	await cell(38).press('Enter')
	await expect(page.locator('#board .-under-bridge')).toHaveCount(0)
	await page.locator('#board [data-cell]').first().press('Control+z')
	await expect(cell(17)).toHaveClass(/-under-bridge/)
	await expect(cell(45)).toHaveClass(/-under-bridge/)
	await page.locator('.terrain-picker').selectOption('map_editor_bridge_horizontal')
	await cell(23).press('Enter')
	await expect(cell(30)).toHaveClass(/-under-bridge/)
	await expect(cell(32)).toHaveClass(/-under-bridge/)
	await page.reload()
	await expect(page.locator('#board .-under-bridge')).toHaveCount(4)
	await page.locator('#board').screenshot({ path: testInfo.outputPath('mirrored-bridges.png') })
})

test('mirror mode restricts dimensions, pairs opposing teams and persists without changing export format', async ({ page }) => {
	await page.addInitScript((mode) => {
		const key = 'pixelswar-map-editor-draft-v1'
		if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ id: '15', name: 'Mirror', cols: 5, rows: 5, cells: Array.from({ length: 25 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [], editorMirrorMode: mode }))
	}, 'rotation')
	await page.goto('/#editor-title')
	await expect.poll(() => page.evaluate(() => localStorage.getItem('pixelswar-map-editor-draft-v1'))).not.toBeNull()
	const mode = page.locator('#mirror-mode')
	const cell = (index: number) => page.locator(`#board [data-cell="${index}"]`)
	await expect(mode).toBeChecked()
	await expect(cell(12)).toHaveClass(/mirror-centre/)
	await page.locator('#building-picker-1').selectOption('building_city')
	await cell(0).click()
	await expect(cell(0)).toHaveClass(/-capturedby1/)
	await expect(cell(24)).toHaveClass(/-capturedby2/)
	await cell(12).press('Enter')
	await expect(cell(12)).toHaveClass(/-city/)
	await expect(cell(12)).not.toHaveClass(/-capturedby/)
	await page.locator('#unit-picker-1').selectOption('infantry')
	await cell(24).press('Enter')
	await expect(cell(24).locator('img')).toHaveAttribute('src', /infantry-blue-no-damage\.webp/)
	await expect(cell(0).locator('img')).toHaveAttribute('src', /infantry-red-no-damage\.webp/)
	await cell(12).press('Enter')
	await expect(page.locator('.editor-error')).toContainText('centre cell must remain unit-free')
	await expect(page.locator('#board img')).toHaveCount(2)
	await page.reload()
	await expect(mode).toBeChecked()
	await expect(page.locator('#board img')).toHaveCount(2)
	const download = page.waitForEvent('download')
	await page.getByRole('button', { name: 'Export', exact: true }).click()
	const stream = await (await download).createReadStream()
	let json = ''
	for await (const chunk of stream!) json += chunk
	const exported = JSON.parse(json)
	expect(exported.editorMirrorMode).toBeUndefined()
	expect(exported.units).toEqual([
		{ type: 'infantry', player: 1, cell: 24 },
		{ type: 'infantry', player: 2, cell: 0 }
	])
})

test('enabling rotation and painting a mirrored stroke can each be undone', async ({ page }) => {
	await page.addInitScript((mode) => {
		const key = 'pixelswar-map-editor-draft-v1'
		if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ id: '15', name: 'Mirror', cols: 5, rows: 5, cells: Array.from({ length: 25 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [], editorMirrorMode: mode }))
	}, 'off')
	await page.goto('/#editor-title')
	await expect.poll(() => page.evaluate(() => localStorage.getItem('pixelswar-map-editor-draft-v1'))).not.toBeNull()
	const cell = (index: number) => page.locator(`#board [data-cell="${index}"]`)
	await page.locator('#building-picker-0').selectOption('building_city')
	await cell(24).click()
	await page.locator('#mirror-mode').click()
	await expect(cell(24)).not.toHaveClass(/-city/)
	await page.locator('#board [data-cell]').first().press('Control+z')
	await expect(page.locator('#mirror-mode')).not.toBeChecked()
	await expect(cell(24)).toHaveClass(/-city/)
	await page.locator('#mirror-mode').click()
	await page.locator('.terrain-picker').selectOption('terrain_road')
	await cell(0).scrollIntoViewIfNeeded()
	const start = (await cell(0).boundingBox())!
	const end = (await cell(4).boundingBox())!
	await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
	await page.mouse.down()
	await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 })
	await page.mouse.up()
	await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
	await expect(page.locator('#board .mirror-target')).toHaveCount(2)
	await page.mouse.move(start.x - 2, start.y + start.height / 2)
	await expect(page.locator('#board .mirror-target')).toHaveCount(0)
	await expect(page.locator('#board .-road')).toHaveCount(10)
	await page.locator('#board [data-cell]').first().press('Control+z')
	await expect(page.locator('#board .-road')).toHaveCount(0)
	await expect(page.locator('#mirror-mode')).toBeChecked()
})
