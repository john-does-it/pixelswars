import { test, expect } from '@playwright/test'
import { readMapFixture } from '../map-fixtures.ts'
import { newMap, paintCell } from '../../src/lib/map-editor/model.ts'
import { waterJunctionModifiers } from '../../src/lib/game/water-junctions.ts'

const sprite = 'cell-water-junction-nw-se@2x.png'

test('water junction renders on an existing board with its own shimmer mask', async ({ page }, testInfo) => {
	await page.goto('/play/18/')
	const cell = page.locator('.board [data-cell="54"]')
	// The board appears after the first game's sprite preload, even on cold dev builds.
	await cell.waitFor({ state: 'attached', timeout: 20000 })
	await expect(cell).toHaveClass(/-junction-nw-se/)
	await expect(cell).toHaveCSS('background-image', new RegExp(sprite.replaceAll('.', '\\.')))
	const mask = await cell.evaluate((element) => getComputedStyle(element).getPropertyValue('--water-shimmer-mask'))
	expect(mask).toContain('cell-water-junction-nw-se.svg')
	expect((await page.request.get(`/assets/cells/water/${sprite}`)).ok()).toBe(true)
	expect((await page.request.get('/assets/cells/water-shimmer/cell-water-junction-nw-se.svg')).ok()).toBe(true)
	await cell.screenshot({ path: testInfo.outputPath('water-junction.png') })
})

test('editor restores the junction and removes it when its diagonal land is erased', async ({ page }) => {
	const map = readMapFixture(18)
	// An older draft does not contain the new decorative modifier.
	for (const cell of map.cells) cell.classes = cell.classes.filter((name) => name !== '-junction-nw-se')
	await page.addInitScript((map) => localStorage.setItem('pixelswar-map-editor-draft-v1', JSON.stringify(map)), map)
	await page.goto('/map-editor/')
	const cell = page.locator('#board [data-cell="54"]')
	await expect(cell).toHaveClass(/-junction-nw-se/)
	await expect(cell).toHaveCSS('background-image', new RegExp(sprite.replaceAll('.', '\\.')))
	await page.locator('[data-brush="terrain_water"]').click()
	await page.locator(`#board [data-cell="${54 - map.cols - 1}"]`).press('Enter')
	await expect(cell).not.toHaveClass(/-junction-nw-se/)
	await expect(cell).not.toHaveCSS('background-image', new RegExp(sprite.replaceAll('.', '\\.')))
})

for (const { variant, land } of [
	{ variant: 'east-nw-narrow', land: [6, 8, 13] },
	{ variant: 'south-nw-ne', land: [6, 8, 17] },
	{ variant: 'open-nw', land: [6] }
]) {
	test(`editor renders, erases and restores the ${variant} correction`, async ({ page }, testInfo) => {
		const map = newMap(5, 5)
		for (const cell of map.cells) cell.classes = ['-water']
		for (const index of land) paintCell(map, index, { kind: 'terrain', classes: ['-grass'], owner: 0 })
		for (const cell of map.cells) cell.classes = cell.classes.filter((name) => !waterJunctionModifiers.includes(name))
		await page.addInitScript((map) => localStorage.setItem('pixelswar-map-editor-draft-v1', JSON.stringify(map)), map)
		await page.goto('/map-editor/')
		const cell = page.locator('#board [data-cell="12"]')
		const marker = new RegExp(`-junction-${variant}(?:\\s|$)`)
		await expect(cell).toHaveClass(marker)
		await expect(cell).toHaveCSS('background-image', new RegExp(`cell-water-junction-${variant}@2x`))
		expect((await page.request.get(`/assets/cells/water/cell-water-junction-${variant}@2x.png`)).ok()).toBe(true)
		expect((await page.request.get(`/assets/cells/water-shimmer/cell-water-junction-${variant}.png`)).ok()).toBe(true)
		await page.locator('#board').screenshot({ path: testInfo.outputPath(`${variant}.png`) })
		await page.locator('[data-brush="terrain_water"]').click()
		await page.locator('#board [data-cell="6"]').press('Enter')
		await expect(cell).not.toHaveClass(marker)
		await page.keyboard.press('Control+z')
		await expect(cell).toHaveClass(marker)
		await page.locator('#json-panel summary').click()
		await expect(page.locator('#json-output')).toHaveValue(new RegExp(`-junction-${variant}`))
	})
}
