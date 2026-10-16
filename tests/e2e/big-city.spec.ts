import { test, expect } from '@playwright/test'

test('the five approved maps render their neutral big-city objectives', async ({ page }) => {
	for (const [mapId, count] of [
		[1, 1],
		[3, 2],
		[8, 2],
		[11, 3],
		[12, 4]
	]) {
		await page.goto(`/play/${mapId}/`)
		const fields = page.locator('.board button.-big-city')
		await expect(fields).toHaveCount(count)
		for (const field of await fields.all()) {
			await expect(field).toHaveAttribute('aria-label', /Big city/)
			await expect(field).not.toHaveClass(/-capturedby|-halfcaptured/)
			await expect(field).toHaveCSS('background-image', /cell-big-city-on-grass@2x\.png/)
			await expect(field.locator('.building-lights')).toHaveCSS('background-image', /cell-big-city-on-grass-light-on@2x\.png/)
		}
	}
})

test('big cities appear in the localized catalog and every capture sprite loads', async ({ page }) => {
	await page.goto('/')
	const card = page.locator('article').filter({ has: page.locator('.terrain-icon.-big-city') })
	await expect(card.getByRole('heading', { name: 'Big city', exact: true })).toBeVisible()
	await expect(card).toContainText('300$')
	for (const [locale, name] of [
		['fr', 'Grande ville'],
		['de', 'Großstadt'],
		['en', 'Big city']
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
		expect(spriteUrl).toContain(`/assets/figma/cells/buildings/cell-big-city-on-grass${suffix.replace('halfcaptured', 'half-captured')}@2x.png`)
		for (const url of [spriteUrl, spriteUrl.replace('cell-big-city-on-grass', 'cell-big-city-on-grass-light-on')]) {
			const loaded = await page.evaluate(async (url) => {
				const image = new Image()
				image.src = url
				await image.decode()
				return image.naturalWidth > 0 && image.naturalHeight > 0
			}, url)
			expect(loaded).toBe(true)
		}
	}
})
