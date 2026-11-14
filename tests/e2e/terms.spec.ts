import { test, expect } from '@playwright/test'

test('terms are linked, translated and readable without opening multiplayer connections', async ({ page }) => {
	const connections: string[] = []
	page.on('websocket', (socket) => connections.push(socket.url()))
	await page.goto('/')
	await page.getByRole('link', { name: 'Terms & Conditions', exact: true }).click()
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms, privacy and cookies')
	await expect(page.getByText(/The pixelswars-settings cookie/)).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Progress and saved maps' })).toBeVisible()
	await expect(page.getByText(/your browser sends its name, terrain and starting armies/)).toBeVisible()
	await expect(page.getByRole('link', { name: 'Data measured by Simple Analytics' })).toHaveAttribute('href', 'https://docs.simpleanalytics.com/what-we-collect')
	for (const [locale, title, saves] of [
		['fr', 'Conditions, confidentialité et cookies', 'Progression et cartes enregistrées'],
		['ja', '利用条件・プライバシー・Cookie', '進行状況と保存したマップ'],
		['de', 'Nutzungsbedingungen, Datenschutz und Cookies', 'Spielfortschritt und gespeicherte Karten']
	]) {
		await page.locator('.site-navbar .language-control select').selectOption(locale)
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
		await expect(page.getByRole('heading', { name: saves })).toBeVisible()
		await expect(page.locator('html')).toHaveAttribute('lang', locale)
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	}
	await page.locator('.site-navbar .language-control select').selectOption('fr')
	const headingStyle = (element: Element) => {
		const css = getComputedStyle(element)
		return [css.color, css.webkitTextStrokeColor, css.webkitTextStrokeWidth, css.fontSize, css.paintOrder]
	}
	const reference = await page.getByRole('heading', { level: 1 }).evaluate(headingStyle)
	await page.goto('/play/1/?online=1')
	const onlineTitle = page.getByRole('heading', { name: 'Jouer à deux en ligne', exact: true })
	await expect(onlineTitle).toBeVisible()
	await expect(page.locator('.online-setup .panel')).toHaveCSS('background-color', 'rgb(255, 240, 180)')
	expect(await onlineTitle.evaluate(headingStyle)).toEqual(reference)
	await expect(page.locator('.online-setup strong')).toHaveText('Partagez vos invitations avec des personnes de confiance.')
	await page.goto('/terms/')
	await page.locator('.site-navbar .language-control select').selectOption('de')
	await page.goto('/play/1/?online=1#invite=PW2.1.1.abcdef.12345678-1234-1234-1234-123456789abc')
	await expect(page.getByRole('button', { name: 'Beitreten', exact: true })).toBeVisible()
	await expect(page.getByText(/Der gegnerische Browser kann Ihre IP-Adresse erfahren/)).toBeVisible()
	await expect(page.getByText(/PeerJS/)).toHaveCount(0)
	expect(connections).toEqual([])
})
