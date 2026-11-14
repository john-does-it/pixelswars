import { test, expect } from '@playwright/test'

test('the map heading clears the navbar before and after hydration', async ({ browser, page, baseURL, isMobile }) => {
	const viewport = { width: isMobile ? 390 : 2560, height: 900 }
	const initial = await browser.newPage({ viewport, javaScriptEnabled: false })
	try {
		await initial.goto(new URL('/', baseURL).href)
		await page.setViewportSize(viewport)
		await page.goto('/')
		await expect(page.locator('.navbar-inner.unmeasured')).toHaveCount(0)
		const positions = []
		for (const view of [initial, page]) {
			const nav = (await view.locator('.site-navbar').boundingBox())!
			const title = (await view.locator('#maps').boundingBox())!
			expect(title.y).toBeGreaterThan(nav.y + nav.height)
			positions.push(title.y)
			if (isMobile) await expect(view.locator('.menu-toggle')).toBeVisible()
			else await expect(view.locator('.nav-links')).toBeVisible()
		}
		expect(Math.abs(positions[0] - positions[1])).toBeLessThan(1)
	} finally {
		await initial.close()
	}
})

test('homepage navbar fits translated links, offsets anchors and switches to an accessible mobile menu', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 1080 })
	await page.goto('/')
	const nav = page.locator('.site-navbar')
	const toggle = nav.locator('.menu-toggle')
	const language = nav.locator('.language-control select')
	await expect(toggle).toBeHidden()
	await expect(nav.locator('.brand img')).toHaveCount(1)
	await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
	await expect(language).toBeVisible()
	for (const link of await nav.locator('.nav-links a[href^="#"]').all()) {
		const id = (await link.getAttribute('href'))!
		await link.click()
		await expect.poll(async () => (await page.locator(id).boundingBox())!.y).toBeGreaterThanOrEqual((await nav.boundingBox())!.height - 1)
		expect((await nav.boundingBox())!.y).toBe(0)
	}
	await nav.locator('.brand').click()
	await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
	await language.selectOption('de')
	const code = nav.locator('.language-control .language-code')
	await page.setViewportSize({ width: 1024, height: 900 })
	await expect(code).toBeHidden()
	const fullWidth = (await language.boundingBox())!.width
	await page.setViewportSize({ width: 1023, height: 900 })
	await expect(code).toBeVisible()
	await expect(code).toHaveText('DE')
	expect((await language.boundingBox())!.width).toBeLessThan(fullWidth)
	await expect(language.getByRole('option', { name: 'Français', exact: true })).toHaveCount(1)
	await page.setViewportSize({ width: 800, height: 900 })
	await expect(toggle).toBeVisible()
	await expect(nav.locator('.nav-links')).toBeHidden()
	await toggle.click()
	await expect(page.locator('.fullscreen-links')).toBeVisible()
	await expect(page.locator('.fullscreen-links a')).toHaveCount(5)
	await page.keyboard.press('Escape')
	await expect(toggle).toBeFocused()
	await expect(page.locator('.fullscreen-links')).toHaveCount(0)
	await page.setViewportSize({ width: 320, height: 800 })
	await language.selectOption('fr')
	await expect(language).toHaveValue('fr')
	await expect(code).toHaveText('FR')
	await toggle.click()
	await page.locator('.fullscreen-links a[href="#stats"]').click()
	await expect(toggle).toHaveAttribute('aria-expanded', 'false')
	await expect.poll(async () => (await page.locator('#stats').boundingBox())!.y).toBeGreaterThanOrEqual((await nav.boundingBox())!.height - 1)
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	await page.setViewportSize({ width: 1920, height: 1080 })
	await expect(toggle).toBeHidden()
	await expect(nav.locator('.nav-links')).toBeVisible()
	await page.goto('/play/1/')
	await expect(page.locator('.board')).toBeVisible()
	await expect(nav).toHaveCount(0)
	await expect(page.locator('.match-summary')).toHaveCSS('width', '1920px')
	expect((await page.locator('.match-summary').boundingBox())!.y).toBe(0)
})

test('shared navigation and footer remain available across site pages but stay outside the board', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 320, height: 800 })
	const nav = page.locator('.site-navbar')
	const footer = page.locator('.site-footer')
	for (const path of ['/profile/', '/support/', '/terms/', '/#editor-title']) {
		await page.goto(path)
		await expect(nav).toBeVisible()
		await expect(footer).toHaveCount(1)
		await expect(page.locator('main').getByRole('heading').first()).toBeVisible()
		await expect(nav.locator('.language-control select')).toBeVisible()
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
		await expect(footer.getByRole('link', { name: 'Terms & Conditions', exact: true })).toHaveAttribute('href', /\/terms\/?$/)
	}
	await nav.locator('.menu-toggle').click()
	await page.locator('.fullscreen-links a[href$="#support"]').click()
	await expect(page).toHaveURL(/\/#support$/)
	await expect(nav.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false')
	await footer.getByRole('button', { name: 'Credits', exact: true }).click()
	await expect(page.getByRole('dialog')).toBeVisible()
	await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
	await expect(footer.getByRole('button', { name: 'Credits', exact: true })).toBeFocused()
	await footer.getByRole('link', { name: 'Terms & Conditions', exact: true }).click()
	await expect(page).toHaveURL(/\/terms\/?$/)
	await page.screenshot({ path: testInfo.outputPath('shared-navigation-mobile.png') })
	await page.goto('/play/1/')
	await expect(page.locator('.board')).toBeVisible()
	await expect(nav).toHaveCount(0)
	await expect(footer).toHaveCount(0)
})

test('missing pages show a centered error and a working home link on static hosting', async ({ page }) => {
	const path = '/missing/nested/page'
	await page.route('**' + path, (route) => route.fulfill({ status: 404, contentType: 'text/html', path: 'build/404.html' }))
	const response = await page.goto(path)
	expect(response?.status()).toBe(404)
	const main = page.getByRole('main')
	await expect(main.getByRole('heading', { level: 1, name: '404' })).toBeVisible()
	await expect(main.getByText('Page not found')).toHaveCSS('text-align', 'center')
	await page.locator('.site-navbar .language-control select').selectOption('fr')
	await main.getByRole('link', { name: 'Retour à l’accueil' }).click()
	await expect(page).toHaveURL(/\/$/)
	await expect(page.locator('#battlefields')).toBeVisible()
})
