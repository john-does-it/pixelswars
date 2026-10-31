import { test, expect } from '@playwright/test'

test('Troubled Bridges is available through filters and opens with its full armies', async ({ page }) => {
	await page.goto('/')
	const filters = page.getByRole('group', { name: 'Size', exact: true })
	await filters.getByRole('button', { name: 'XL', exact: true }).click()
	const card = page.locator('.maps a[data-map-id="27"]')
	await expect(card.getByRole('heading')).toHaveText('Troubled Bridges')
	await card.scrollIntoViewIfNeeded()
	await expect.poll(() => card.locator('.map-thumbnail img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(272)
	await card.click()
	await page.getByRole('link', { name: 'Play with someone on this device', exact: true }).click()
	await expect(page).toHaveURL(/\/play\/27\/$/)
	await expect(page).toHaveTitle('Pixel’s War · Troubled Bridges')
	await expect(page.locator('.board [data-cell]')).toHaveCount(289)
	await expect(page.locator('.board [data-unit]')).toHaveCount(34)
	await expect(page.getByRole('button', { name: 'End round', exact: true })).toBeEnabled()
})
