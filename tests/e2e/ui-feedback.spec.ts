import { test, expect } from '@playwright/test'
import mapPreviews from '../../src/lib/data/map-previews.json' with { type: 'json' }
import { isMapInCatalog } from '../../src/lib/game/map-catalog'

test('map chooser shows lightweight terrain previews, dimensions and cell-count size labels', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: 'View all maps', exact: true }).click()
	const cards = page.locator('.maps .map')
	await expect(cards).toHaveCount(Object.keys(mapPreviews).filter(isMapInCatalog).length)
	const ids = await cards.evaluateAll((cards) => cards.map((card) => card.getAttribute('data-map-id')))
	const expected = Object.entries(mapPreviews)
		.filter(([id]) => isMapInCatalog(id))
		.sort(([a, first], [b, second]) => first.cols * first.rows - second.cols * second.rows || Number(a) - Number(b))
	expect(ids).toEqual(expected.map(([id]) => id))
	for (const [id, { cols, rows }] of expected) {
		const image = cards.locator('img[src$="/map-' + id + '.png"]')
		await image.scrollIntoViewIfNeeded()
		await expect.poll(() => image.evaluate((element: HTMLImageElement) => [element.naturalWidth, element.naturalHeight])).toEqual([Math.round((480 * cols) / rows), 480])
	}
	for (const locale of ['en', 'fr', 'de', 'ja']) {
		await page.locator('.site-navbar .language-control select').selectOption(locale)
		await expect(cards.locator('.map-thumbnail picture > img')).toHaveCount(expected.length)
		await expect(cards.first().getByRole('heading')).toHaveText(/\S/)
	}
	await cards.last().click()
	await page.locator('.featured .selected').click()
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
