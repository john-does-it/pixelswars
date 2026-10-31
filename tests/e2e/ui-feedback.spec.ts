import { test, expect } from '@playwright/test'
import mapPreviews from '../../src/lib/data/map-previews.json' with { type: 'json' }
import { isMapInCatalog } from '../../src/lib/game/map-catalog'

test('map chooser shows lightweight terrain previews, dimensions and cell-count size labels', async ({ page }) => {
	await page.goto('/')
	const cards = page.locator('.maps .map')
	await expect(cards).toHaveCount(Object.keys(mapPreviews).filter(isMapInCatalog).length)
	const areas = await cards.locator('.map-thumbnail img').evaluateAll((images) => images.map((image) => Number(image.getAttribute('width')) * Number(image.getAttribute('height'))))
	expect(areas).toEqual([...areas].sort((firstArea, secondArea) => firstArea - secondArea))
	for (const image of await cards.locator('.map-thumbnail img').all()) {
		await image.scrollIntoViewIfNeeded()
		await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
	}
	for (const locale of ['en', 'fr', 'de', 'ja']) {
		await page.locator('.site-navbar .language-control select').selectOption(locale)
		// Check dimensions by map identity; catalogue additions can change the first/last card.
		await expect(page.locator('.map[data-map-id="35"] .map-thumbnail img')).toHaveAttribute('width', String(mapPreviews['35'].cols * 16))
		await expect(page.locator('.map[data-map-id="1"] .map-thumbnail img')).toHaveAttribute('width', String(mapPreviews['1'].cols * 16))
		await expect(page.locator('.map[data-map-id="27"] .map-thumbnail img')).toHaveAttribute('width', String(mapPreviews['27'].cols * 16))
		await expect(page.locator('.map[data-map-id="26"] .map-thumbnail img')).toHaveAttribute('width', String(mapPreviews['26'].cols * 16))
	}
	await cards.last().click()
	await expect(page.getByRole('dialog')).toBeVisible()
})

test('end round stays primary and movement uses explicit French action labels', async ({ page, context, baseURL }) => {
	await context.addCookies([{ name: 'pixelswars-settings', value: encodeURIComponent(JSON.stringify({ locale: 'fr' })), url: baseURL! }])
	await page.goto('/play/1/')
	await page.locator('[data-cell="1"]').click()
	const confirm = page.getByRole('button', { name: 'Confirmer le déplacement', exact: true })
	const cancel = page.getByRole('button', { name: 'Annuler le déplacement', exact: true })
	const end = page.getByRole('button', { name: 'Fin du tour', exact: true })
	await expect(confirm).not.toHaveClass(/primary/)
	await page.locator('[data-cell="9"]').click()
	await expect(confirm).not.toHaveClass(/primary/)
	await expect(end).toHaveClass(/primary/)
	await cancel.click()
	await expect(page.locator('[data-cell="1"] [data-unit]')).toHaveCount(1)
	await expect(end).toHaveClass(/primary/)
	await expect(confirm).toHaveCount(0)
})
