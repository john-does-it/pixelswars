import { test, expect } from '@playwright/test'

test('Water Town opens from the map chooser with both armies and its preview', async ({ page }) => {
	await page.goto('/')
	const card = page.locator('.maps a[href$="/play/15/"]')
	await expect(card).toContainText('Water Town')
	await expect(card.locator('.map-metadata')).toHaveText('Small · 14 × 7')
	await expect(card.locator('img')).toBeVisible()
	await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(224)
	await card.click()
	await page.getByRole('link', { name: 'Play with someone on this device', exact: true }).click()
	await expect(page).toHaveURL(/\/play\/15\/$/)
	await expect(page).toHaveTitle('Pixel’s War · Water Town')
	await expect(page.locator('.board [data-cell]')).toHaveCount(98)
	await expect(page.locator('.board [data-unit]')).toHaveCount(8)
	await expect(page.locator('.board .-oil-field')).toHaveCount(2)
	await expect(page.getByRole('button', { name: 'End round', exact: true })).toBeEnabled()
})
