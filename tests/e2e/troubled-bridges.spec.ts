import { test, expect } from '@playwright/test'
import { openMapFilters } from './filter-helpers'

test('Troubled Bridges is available through filters and opens with its full armies', async ({ page }) => {
	await page.goto('/')
	await openMapFilters(page)
	const filters = page.getByRole('group', { name: 'Filter maps', exact: true })
	await filters.getByRole('checkbox', { name: 'XXL', exact: true }).check()
	await filters.getByRole('checkbox', { name: 'Symmetrical', exact: true }).check()
	const card = page.locator('.maps a[href$="/play/27/"]')
	await expect(card.getByRole('heading')).toHaveText('Troubled Bridges')
	await expect(card.locator('.map-metadata')).toHaveText('XXL · 17 × 17')
	await card.scrollIntoViewIfNeeded()
	await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(272)
	await card.click()
	await page.getByRole('link', { name: 'Play with someone on this device', exact: true }).click()
	await expect(page).toHaveURL(/\/play\/27\/$/)
	await expect(page).toHaveTitle('Pixel’s War · Troubled Bridges')
	await expect(page.locator('.board [data-cell]')).toHaveCount(289)
	await expect(page.locator('.board [data-unit]')).toHaveCount(34)
	await expect(page.getByRole('button', { name: 'End round', exact: true })).toBeEnabled()
})
