import { test, expect } from '@playwright/test'
import { retiredMapIds } from '../../src/lib/game/map-catalog'

test('retired maps are absent from the chooser and progression while legacy matches remain available', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('a.map')).toHaveCount(26)
	for (const id of retiredMapIds) await expect(page.locator(`a.map[href$="/play/${id}/"]`)).toHaveCount(0)
	await page.goto('/profile/')
	await expect(page.locator('.map-progress article')).toHaveCount(26)
	for (const name of ['A Little Stroll', 'Meet in the Middle', 'Watch the Puddles', 'Nice View Up Here', 'The Other Bank', 'Delusions Of Grandeur', 'Two Bridges, No More']) {
		await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0)
	}
	await page.goto('/play/2/')
	await expect(page.locator('.board [data-cell]')).toHaveCount(96)
})
