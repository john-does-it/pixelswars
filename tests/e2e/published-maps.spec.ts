import { test, expect } from '@playwright/test'

const maps = [
	[28, 'Neighbors’ Square', 64, 6],
	[30, 'A Little Detour', 77, 6],
	[31, 'Sandbox', 117, 8],
	[35, 'Gentle Slope', 63, 6],
	[36, 'Meanders', 289, 26]
] as const

test('approved maps have previews, public games, editor entries and progression', async ({ page }) => {
	await page.goto('/')
	for (const [id, name, cells, units] of maps) {
		const card = page.locator('a.map[href$="/play/' + id + '/"]')
		await expect(card.getByRole('heading')).toHaveText(name)
		await card.scrollIntoViewIfNeeded()
		await expect.poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
		await page.goto('/play/' + id + '/')
		await expect(page).toHaveTitle('Pixel’s War · ' + name)
		await expect(page.locator('.board [data-cell]')).toHaveCount(cells)
		await expect(page.locator('.board [data-unit]')).toHaveCount(units)
		await page.goto('/')
	}
	await page.goto('/profile/')
	for (const [, name] of maps) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
	await page.goto('/map-editor/')
	for (const [id] of maps) await expect(page.locator('#existing option[value="' + id + '"]')).toHaveCount(1)
	for (const id of [32, 33, 34]) await expect(page.locator('#existing option[value="' + id + '"]')).toHaveCount(0)
})
