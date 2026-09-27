import { test, expect } from '@playwright/test'

test('terms are linked, translated and readable without contacting online services', async ({ page }) => {
	const connections: string[] = []
	page.on('websocket', (socket) => connections.push(socket.url()))
	await page.goto('/')
	await expect(page.locator('.eyebrow')).toContainText('SOLO & MULTIPLAYER')
	await page.getByRole('link', { name: 'Terms, privacy and cookies', exact: true }).click()
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms, privacy and cookies')
	await expect(page.getByText(/The pixelswars-settings cookie/)).toBeVisible()
	for (const [locale, title] of [
		['fr', 'Conditions, confidentialité et cookies'],
		['de', 'Nutzungsbedingungen, Datenschutz und Cookies']
	]) {
		await page.getByRole('combobox').selectOption(locale)
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
		await expect(page.locator('html')).toHaveAttribute('lang', locale)
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	}
	await page.goto('/play/1/?online=1#invite=PW2.1.1.abcdef.12345678-1234-1234-1234-123456789abc')
	await expect(page.getByRole('button', { name: 'Beitreten', exact: true })).toBeVisible()
	await expect(page.getByText(/PeerJS/)).toHaveCount(0)
	expect(connections).toEqual([])
})
