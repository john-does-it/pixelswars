import { test, expect } from '@playwright/test'

test('the five approved maps render their neutral oil objectives', async ({ page }) => {
	for (const [mapId, count] of [
		[1, 1],
		[3, 2],
		[8, 2],
		[11, 3],
		[12, 4]
	]) {
		await page.goto(`/play/${mapId}/`)
		const fields = page.locator('.board button.-oil-field')
		await expect(fields).toHaveCount(count)
		for (const field of await fields.all()) {
			await expect(field).toHaveAttribute('aria-label', /Oil field/)
			await expect(field).not.toHaveClass(/-capturedby|-halfcaptured/)
			await expect(field).toHaveCSS('background-image', /cell-oil-field-on-grass\.png/)
		}
	}
})

test('oil fields appear in the localized catalog and every capture sprite loads', async ({ page }) => {
	await page.goto('/')
	const card = page.locator('article').filter({ has: page.locator('.terrain-icon.-oil-field') })
	await expect(card.getByRole('heading', { name: 'Oil field', exact: true })).toBeVisible()
	await expect(card).toContainText('300$')
	for (const [locale, name] of [
		['fr', 'Champ pétrolier'],
		['de', 'Ölfeld'],
		['en', 'Oil field']
	]) {
		await page.getByRole('combobox').first().selectOption(locale)
		await expect(card.getByRole('heading', { name, exact: true })).toBeVisible()
		await expect(card).toContainText('300$')
	}
	const icon = card.locator('.terrain-icon')
	for (const [classes, suffix] of [
		['', ''],
		['-capturedby1', '-captured-by-1'],
		['-capturedby2', '-captured-by-2'],
		['-halfcaptured', '-halfcaptured'],
		['-halfcaptured -capturedby1', '-halfcaptured-by-1'],
		['-halfcaptured -capturedby2', '-halfcaptured-by-2']
	]) {
		const spriteUrl = await icon.evaluate((element, captureClasses) => {
			element.classList.remove('-halfcaptured', '-capturedby1', '-capturedby2')
			for (const className of captureClasses.split(' ').filter(Boolean)) element.classList.add(className)
			return getComputedStyle(element).backgroundImage.slice(5, -2)
		}, classes)
		expect(spriteUrl).toContain(`/assets/cells/cell-oil-field-on-grass${suffix}.png`)
		const loaded = await page.evaluate(async (url) => {
			const image = new Image()
			image.src = url
			await image.decode()
			return image.naturalWidth > 0 && image.naturalHeight > 0
		}, spriteUrl)
		expect(loaded).toBe(true)
	}
})
