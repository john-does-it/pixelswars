import { test, expect } from '@playwright/test'

test('settings selects use pixel arrows and keep focus feedback for keyboard navigation', async ({ page, isMobile }, testInfo) => {
	await page.goto('/play/3/')
	await expect(page.locator('.turn-announcement')).toHaveCount(0, { timeout: 10000 })
	await expect(page.locator('.board-zoom')).toHaveCSS('padding', '16px')
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	const dialog = page.getByRole('dialog', { name: 'Options and help', exact: true })
	const language = dialog.getByRole('combobox', { name: 'Language', exact: true })
	for (const select of await dialog.getByRole('combobox').all()) {
		await expect(select).toHaveCSS('appearance', 'none')
		await expect(select).toHaveCSS('background-image', /data:image\/svg\+xml/)
		await expect(select).toHaveCSS('padding-right', '28px')
	}
	await language.click()
	await expect(language).toHaveCSS('outline-style', 'none')
	await page.keyboard.press('Escape')
	await expect(dialog).toBeVisible()
	await dialog.getByRole('heading', { name: 'Options and help', exact: true }).click()
	await dialog.screenshot({ path: testInfo.outputPath('settings.png') })
	if (!isMobile) {
		await language.click()
		await page.keyboard.press('Escape')
		await page.keyboard.press('Tab')
		await page.keyboard.press('Shift+Tab')
		await expect(language).toBeFocused()
		await expect(language).toHaveCSS('outline-style', 'solid')
		await page.keyboard.press('ArrowDown')
		await expect(page.locator('dialog select').first()).toHaveValue('de')
	}
})
