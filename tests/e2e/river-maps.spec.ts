import { test, expect } from '@playwright/test'

for (const [id, name, cols, rows, units] of [
	[13, 'Not the Shoes!', 10, 8, 10],
	[14, 'Which Way Across?', 12, 12, 14]
] as const) {
	test(`${name}: opens from the sorted map chooser with grass crossings and starts an AI match`, async ({ page }) => {
		await page.goto('/')
		const card = page.locator(`.maps a[href$="/play/${id}/"]`)
		await expect(card).toContainText(name)
		await expect(card.locator('.map-metadata')).toHaveText(`${id === 13 ? 'Small' : 'Medium'} · ${cols} × ${rows}`)
		await card.click()
		await page.getByRole('button', { name: 'Play against AI', exact: true }).click()
		await page.getByRole('link', { name: 'Easy', exact: true }).click()
		await expect(page).toHaveURL(new RegExp(`/play/${id}/\\?ai=easy$`))
		await expect(page).toHaveTitle(`Pixel’s War · ${name}`)
		await expect(page.locator('.board [data-cell]')).toHaveCount(cols * rows)
		await expect(page.locator('.board [data-unit]')).toHaveCount(units)
		await expect(page.locator('.board [data-cell="' + (id === 13 ? 32 : 50) + '"]')).toHaveClass(/-grass/)
		await expect(page.getByText('Round 2', { exact: true })).toBeVisible({ timeout: 30000 })
		await expect(page.getByRole('button', { name: 'End round', exact: true })).toBeEnabled()
	})
}
