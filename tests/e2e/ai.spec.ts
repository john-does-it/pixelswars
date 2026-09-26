import { test, expect } from '@playwright/test'

for (const difficulty of ['Easy', 'Medium', 'Hard']) {
	test(`${difficulty} AI starts from the map chooser, plays a turn and survives reload`, async ({ page }) => {
		await page.goto('/')
		await page.getByRole('link', { name: /Emberfall/ }).click()
		const setup = page.getByRole('dialog', { name: 'Choose your opponent' })
		await expect(setup).toBeVisible()
		await setup.getByRole('button', { name: 'Play against AI', exact: true }).click()
		await setup.getByRole('link', { name: difficulty, exact: true }).click()
		await expect(page).toHaveURL(new RegExp(`/play/1/\\?ai=${difficulty.toLowerCase()}$`))
		await expect(page.locator('.match-mode')).toContainText(difficulty)
		const redBefore = await page.locator('[data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.dataset.cell))
		await page.getByRole('button', { name: 'End round', exact: true }).click()
		await expect(page.getByRole('button', { name: 'AI is playing…', exact: true })).toBeDisabled()
		await page.locator('[data-cell="1"]').click()
		await expect(page.locator('[data-cell="1"]')).toHaveAttribute('aria-pressed', 'false')
		await expect(page.getByText('Round 3', { exact: true })).toBeVisible({ timeout: 30000 })
		await expect(page.getByRole('button', { name: 'End round', exact: true })).toBeEnabled()
		expect(await page.locator('[data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.dataset.cell))).not.toEqual(redBefore)
		await page.reload()
		await expect(page.locator('.match-mode')).toContainText(difficulty)
		await expect(page.getByText('Round 1', { exact: true })).toBeVisible()
	})
}

test('AI setup can be dismissed and local multiplayer remains available', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('link', { name: /Emberfall/ }).click()
	await page.keyboard.press('Escape')
	await expect(page.getByRole('dialog')).toHaveCount(0)
	await page.getByRole('link', { name: /Emberfall/ }).click()
	await page.getByRole('link', { name: 'Play with someone on this device', exact: true }).click()
	await page.getByRole('button', { name: 'End round', exact: true }).click()
	await expect(page.getByText('Round 2', { exact: true })).toBeVisible()
	await expect(page.locator('.match-mode')).toHaveCount(0)
})

test('AI navigation cancels pending actions and invalid levels use local multiplayer', async ({ page }) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	await page.goto('/play/12/?ai=hard')
	await page.getByRole('button', { name: 'End round', exact: true }).click()
	await page.getByRole('link', { name: '← Pixel’s War' }).click()
	await expect(page.getByRole('heading', { name: 'Choose your battlefield' })).toBeVisible()
	await page.goto('/play/1/?ai=invalid')
	await page.getByRole('button', { name: 'End round', exact: true }).click()
	await expect(page.getByText('Round 2', { exact: true })).toBeVisible()
	await expect(page.locator('.match-mode')).toHaveCount(0)
	expect(errors).toEqual([])
})

test('mode selection is translated in French and German', async ({ page }) => {
	await page.goto('/')
	for (const [locale, title, action, difficulty] of [
		['fr', 'Choisissez votre adversaire', 'Jouer contre l’IA', 'Difficile'],
		['de', 'Wähle deinen Gegner', 'Gegen die KI spielen', 'Schwer']
	]) {
		await page.getByRole('combobox').selectOption(locale)
		await page.locator('.map').first().click()
		const dialog = page.getByRole('dialog', { name: title })
		await dialog.getByRole('button', { name: action, exact: true }).click()
		await expect(dialog.getByRole('link', { name: difficulty, exact: true })).toBeVisible()
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
		expect(overflow).toBe(false)
		await page.keyboard.press('Escape')
	}
})
