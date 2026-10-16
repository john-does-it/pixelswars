import { test, expect } from '@playwright/test'

test('confirmation is off by default, persists when enabled, and supports No, Escape and Yes', async ({ page }) => {
	await page.goto('/play/1/')
	const round = page.locator('.turn-details strong')
	const end = page.getByRole('button', { name: 'End round', exact: true })
	const warning = page.getByRole('dialog', { name: 'End round', exact: true })
	await end.click()
	await expect(round).toHaveText('Round 2')
	await expect(warning).toHaveCount(0)
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	const setting = page.getByRole('combobox', { name: 'Confirm end of turn when actions remain', exact: true })
	await expect(setting).toHaveValue('off')
	await setting.selectOption('on')
	await page.keyboard.press('Escape')
	await page.reload()
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	await expect(setting).toHaveValue('on')
	await page.keyboard.press('Escape')
	const before = await round.textContent()
	await end.click()
	await expect(warning).toContainText('At least one action is still possible.')
	await warning.getByRole('button', { name: 'No', exact: true }).click()
	await expect(warning).toHaveCount(0)
	await expect(round).toHaveText(before!)
	await end.click()
	await page.keyboard.press('Escape')
	await expect(warning).toHaveCount(0)
	await expect(round).toHaveText(before!)
	await end.click()
	await warning.getByRole('button', { name: 'Yes', exact: true }).click()
	await expect(warning).toHaveCount(0)
	await expect(round).not.toHaveText(before!)
})

test('income remains readable beside both budgets on narrow screens', async ({ page }) => {
	await page.goto('/play/1/')
	await expect(page.locator('.budgets .income')).toHaveCount(2)
	for (const width of [1400, 680, 375, 320]) {
		await page.setViewportSize({ width, height: 850 })
		for (const income of await page.locator('.budgets .income').all()) {
			await expect(income).toHaveText(/^\+[\d,\s]+ \$\/turn$/)
			const bounds = (await income.boundingBox())!
			expect(bounds.x).toBeGreaterThanOrEqual(0)
			expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	}
})
