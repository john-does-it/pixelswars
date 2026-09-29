import { test, expect } from '@playwright/test'

test('map chooser shows lightweight terrain previews, dimensions and localized size labels', async ({ page }) => {
	await page.goto('/')
	const cards = page.locator('.maps .map')
	await expect(cards).toHaveCount(14)
	const areas = await cards.locator('.map-thumbnail img').evaluateAll((images) => images.map((image) => Number(image.getAttribute('width')) * Number(image.getAttribute('height'))))
	expect(areas).toEqual([...areas].sort((firstArea, secondArea) => firstArea - secondArea))
	for (const image of await cards.locator('.map-thumbnail img').all()) {
		await image.scrollIntoViewIfNeeded()
		await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
	}
	for (const [locale, small, large] of [
		['en', 'Small', 'Large'],
		['fr', 'Petite', 'Grande'],
		['de', 'Klein', 'Groß']
	]) {
		await page.getByRole('combobox').selectOption(locale)
		await expect(cards.first().locator('.map-metadata')).toHaveText(`${small} · 8 × 8`)
		await expect(cards.last().locator('.map-metadata')).toHaveText(`${large} · 18 × 18`)
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
