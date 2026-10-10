import { test, expect } from '@playwright/test'

test('obstacle brush renders the new asset and permits only aircraft', async ({ page }) => {
	await page.goto('/map-editor/')
	const brush = page.getByRole('button', { name: 'Obstacle', exact: true })
	await expect(async () => {
		await brush.click()
		await expect(brush).toHaveAttribute('aria-pressed', 'true', { timeout: 500 })
	}).toPass({ timeout: 10000 })
	const tile = page.locator('#board [data-cell="0"]')
	await tile.press('Enter')
	await expect(tile).toHaveClass(/-blocker/)
	await expect(tile).toHaveAttribute('aria-label', /Obstacle/)
	const sprite = await tile.evaluate((element) => getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1])
	expect(sprite).toContain('cell-blocker-on-grass.svg')
	expect((await page.request.get(sprite!)).ok()).toBe(true)
	await page.getByRole('button', { name: 'Infantry', exact: true }).click()
	await tile.press('Enter')
	await expect(page.locator('#status')).toHaveText('Only air units can be placed on an obstacle.')
	await expect(tile.locator('img')).toHaveCount(0)
	await page.getByRole('button', { name: 'Helicopter', exact: true }).click()
	await tile.press('Enter')
	await expect(tile.locator('img')).toHaveCount(1)
	await page.locator('#json-panel summary').click()
	await expect(page.locator('#json-output')).toHaveValue(/"-blocker"/)
	const exported = JSON.parse(await page.locator('#json-output').inputValue())
	expect(exported.cells[0].classes).toEqual(['-blocker', '-ongrass'])
	expect(exported.units).toContainEqual({ type: 'helicopter', player: 1, cell: 0 })
})

test('public editor opens from home with working sprites, JSON export and submission links', async ({ page }, testInfo) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	await page.goto('/')
	// Wait for an interactive control before checking client-side navigation.
	await expect(async () => {
		await page.getByRole('button', { name: 'Learn more', exact: true }).click()
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 500 })
	}).toPass({ timeout: 10000 })
	await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
	await page.evaluate(() => {
		;(window as Window & { editorNavigationMarker?: boolean }).editorNavigationMarker = true
	})
	const favicon = await page.locator('link[rel="icon"]').evaluate((link: HTMLLinkElement) => link.href)
	await expect(page.locator('footer a[href="https://github.com/john-does-it/pixelswars/issues"]')).toBeVisible()
	await page.getByRole('link', { name: 'Open the map editor', exact: true }).click()
	await expect(page).toHaveURL(/\/map-editor\/$/)
	await expect(page.getByRole('heading', { name: 'Map editor' })).toBeVisible()
	await expect.poll(() => page.locator('link[rel="icon"]').evaluate((link: HTMLLinkElement) => link.href)).toBe(favicon)
	expect((await page.request.get(favicon)).ok()).toBe(true)
	expect(await page.evaluate(() => (window as Window & { editorNavigationMarker?: boolean }).editorNavigationMarker)).toBe(true)
	await page.getByRole('button', { name: 'Zoom in', exact: true }).press('Enter')
	await expect(page.locator('#board [data-cell]').first()).toHaveCSS('width', '56px')
	await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
	await expect(page.locator('#board [data-cell]').first()).toHaveCSS('width', '48px')
	await page.getByRole('button', { name: 'Show the whole map', exact: true }).click()
	await expect.poll(() => page.locator('#canvas-scroll').evaluate((element) => element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight)).toBe(true)
	await expect(page.locator('#board [data-cell]')).toHaveCount(120)
	const spriteUrl = await page
		.locator('#board [data-cell]')
		.first()
		.evaluate((cell) => getComputedStyle(cell).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1])
	expect(spriteUrl).toBeTruthy()
	expect((await page.request.get(spriteUrl!)).ok()).toBe(true)
	for (const [label, axis, cell] of [
		['Bridge ↔', '-h', '2'],
		['Bridge ↕', '-v', '3']
	]) {
		await page.getByRole('button', { name: label, exact: true }).click()
		const tile = page.locator(`#board [data-cell="${cell}"]`)
		await tile.click()
		await expect(tile).toHaveClass(new RegExp(`-bridge ${axis}`))
		const imageUrl = await tile.evaluate((element) => getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1])
		expect(imageUrl).toContain('cell-road-bridge-')
		expect((await page.request.get(imageUrl!)).ok()).toBe(true)
	}
	await page.getByRole('button', { name: 'Infantry', exact: true }).click()
	await page.locator('[data-cell="0"]').click()
	await expect.poll(() => page.locator('[data-cell="0"] img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
	const downloadReady = page.waitForEvent('download')
	await page.getByRole('button', { name: '↓ Export JSON', exact: true }).click()
	await (await downloadReady).saveAs(testInfo.outputPath('exported-map.json'))
	await expect(page.getByRole('link', { name: 'Submit on GitHub' })).toHaveAttribute('href', /github\.com\/john-does-it\/pixelswars\/issues\/new/)
	await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
	await page.getByRole('heading', { name: 'Submit your map' }).scrollIntoViewIfNeeded()
	await page.screenshot({ path: testInfo.outputPath('submission-guide.png') })
	await page.locator('#back-to-game').click()
	await expect(page).toHaveURL(/\/$/)
	await expect(page.locator('#board')).toHaveCount(0)
	await expect(page.getByRole('heading', { name: 'Choose your battlefield' })).toBeVisible()
	expect(errors).toEqual([])
})

test('editor shares all three languages with the game without changing the draft or other settings', async ({ page, context, baseURL }, testInfo) => {
	await context.addCookies([{ name: 'pixelswars-settings', value: encodeURIComponent(JSON.stringify({ locale: 'fr', sound: false, music: true, animations: false, keyboardLayout: 'qwerty' })), url: baseURL! }])
	await page.goto('/')
	await page.getByRole('link', { name: 'Ouvrir l’atelier de cartes', exact: true }).click()
	await expect(page.getByRole('heading', { name: 'Atelier de cartes', exact: true })).toBeVisible()
	await page.getByLabel('Nom', { exact: true }).fill('Ma carte personnelle')
	await page.getByLabel('Nom', { exact: true }).press('Tab')
	await page.getByRole('button', { name: 'Infanterie', exact: true }).click()
	await page.locator('[data-cell="0"]').click()
	const draft = await page.evaluate(() => localStorage.getItem('pixelswar-map-editor-draft-v1'))
	for (const [locale, title, infantry, guidance, error] of [
		['de', 'Karteneditor', 'Infanterie', 'Karte vorschlagen', 'Die Abmessungen müssen zwischen 2 und 32 Feldern liegen.'],
		['en', 'Map editor', 'Infantry', 'Submit your map', 'Dimensions must be between 2 and 32 tiles.'],
		['fr', 'Atelier de cartes', 'Infanterie', 'Proposer ta carte', 'Les dimensions doivent être comprises entre 2 et 32 cases.']
	]) {
		await page.locator('#language').selectOption(locale)
		await expect(page.locator('html')).toHaveAttribute('lang', locale)
		await expect(page).toHaveTitle(`Pixel’s War · ${title}`)
		await expect(page.getByRole('button', { name: infantry, exact: true })).toHaveAttribute('aria-pressed', 'true')
		await expect(page.getByRole('heading', { name: guidance, exact: true })).toHaveCount(1)
		await expect(page.locator('#name')).toHaveValue('Ma carte personnelle')
		expect(await page.evaluate(() => localStorage.getItem('pixelswar-map-editor-draft-v1'))).toBe(draft)
		await page.locator('#columns').fill('1')
		await page.locator('#new').click()
		await expect(page.locator('#status')).toHaveText(error)
		await page.locator('#columns').fill('12')
	}
	await page.locator('#undo').click()
	await expect(page.locator('#board img')).toHaveCount(0)
	await page.locator('#language').selectOption('de')
	await page.reload()
	await expect(page).toHaveTitle('Pixel’s War · Karteneditor')
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	await page.screenshot({ path: testInfo.outputPath('editor-german.png') })
	await page.locator('#back-to-game').click()
	await expect(page.locator('#board')).toHaveCount(0)
	await expect(page.getByRole('combobox')).toHaveValue('de')
	const cookie = (await context.cookies()).find((cookie) => cookie.name === 'pixelswars-settings')!
	expect(JSON.parse(decodeURIComponent(cookie.value))).toEqual({ locale: 'de', sound: false, volume: 0, music: true, animations: false, unitFacing: true, keyboardLayout: 'qwerty' })
})
