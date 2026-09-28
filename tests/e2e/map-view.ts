import { expect, type Page } from '@playwright/test'

export async function zoomToReadableTiles(page: Page) {
	const tile = page.locator('[data-cell]').first()
	await expect(tile).toBeAttached()
	for (let step = 0; step < 12 && (await tile.boundingBox())!.width < 48; step++) {
		await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
	}
	await page.locator('.board-viewport').evaluate((viewport) => viewport.scrollTo({ left: 0, top: 0 }))
}
