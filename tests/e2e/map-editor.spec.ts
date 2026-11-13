import { test, expect } from '@playwright/test'

test('obstacle brush renders the new asset and permits only aircraft', async ({ page }) => {
	await page.goto('/#editor-title')
	await page.locator('#mirror-mode').click()
	const brush = page.locator('.terrain-picker')
	await expect(async () => {
		await brush.selectOption('terrain_blocker')
		await expect(brush).toHaveValue('terrain_blocker', { timeout: 500 })
	}).toPass({ timeout: 10000 })
	const tile = page.locator('#board [data-cell="0"]')
	await tile.press('Enter')
	await expect(tile).toHaveClass(/-blocker/)
	await expect(tile).toHaveAttribute('aria-label', /Obstacle/)
	const sprite = await tile.evaluate((element) => getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1])
	expect(sprite).toContain('cell-blocker-on-grass.svg')
	expect((await page.request.get(sprite!)).ok()).toBe(true)
	await page.locator('#unit-picker-1').selectOption('infantry')
	await tile.press('Enter')
	await expect(page.locator('.editor-error')).toHaveText('Only air units can be placed on an obstacle.')
	await expect(tile.locator('img')).toHaveCount(0)
	await page.locator('#unit-picker-1').selectOption('helicopter')
	await tile.press('Enter')
	await expect(tile.locator('img')).toHaveCount(1)
	const download = page.waitForEvent('download')
	await page.getByRole('button', { name: 'Export', exact: true }).click()
	const stream = await (await download).createReadStream()
	let json = ''
	for await (const chunk of stream!) json += chunk
	const exported = JSON.parse(json)
	expect(exported.cells[0].classes).toEqual(['-blocker', '-ongrass'])
	expect(exported.units).toContainEqual({ type: 'helicopter', player: 1, cell: 0 })
})
