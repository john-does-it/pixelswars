import { test, expect } from '@playwright/test'
import { isMapInCatalog } from '../../src/lib/game/map-catalog'
import previews from '../../src/lib/data/map-previews.json' with { type: 'json' }

const maps = Object.entries(previews).filter(([id]) => isMapInCatalog(id))
const sizes = ['XS', 'S', 'M', 'L', 'XL']
function sizeOf(area: number) {
	return area <= 80 ? 'XS' : area <= 120 ? 'S' : area <= 160 ? 'M' : area <= 200 ? 'L' : 'XL'
}

test('single size selectors filter the gallery and open a match', async ({ page }) => {
	await page.goto('/')
	const filters = page.getByRole('group', { name: 'Size', exact: true })
	const cards = page.locator('a.map')
	await expect(cards).toHaveCount(maps.length)
	for (const size of sizes) {
		await filters.getByRole('button', { name: size, exact: true }).click()
		await expect(cards).toHaveCount(maps.filter(([, map]) => sizeOf(map.cols * map.rows) === size).length)
		await expect(filters.getByRole('button', { name: size, exact: true })).toHaveAttribute('aria-pressed', 'true')
	}
	await filters.getByRole('button', { name: 'ALL', exact: true }).click()
	await expect(cards).toHaveCount(maps.length)
	await cards.first().click()
	await expect(page.getByRole('dialog')).toBeVisible()
})

test('size selection survives reload and preserves unrelated URL state', async ({ page }) => {
	await page.goto('/?size=XS&campaign=friend#maps')
	const filters = page.getByRole('group', { name: 'Size', exact: true })
	await expect(filters.getByRole('button', { name: 'XS', exact: true })).toHaveAttribute('aria-pressed', 'true')
	await page.reload()
	await expect(filters.getByRole('button', { name: 'XS', exact: true })).toHaveAttribute('aria-pressed', 'true')
	await filters.getByRole('button', { name: 'M', exact: true }).focus()
	await page.keyboard.press('Space')
	await expect(filters.getByRole('button', { name: 'M', exact: true })).toHaveAttribute('aria-pressed', 'true')
	expect(new URL(page.url()).searchParams.get('campaign')).toBe('friend')
	await filters.getByRole('button', { name: 'ALL', exact: true }).click()
	await expect.poll(() => new URL(page.url()).search).toBe('?campaign=friend')
	expect(new URL(page.url()).hash).toBe('#maps')
})

test('mobile uses the same visible selectors without obsolete filter controls', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 740 })
	await page.goto('/')
	const filters = page.getByRole('group', { name: 'Size', exact: true })
	await expect(filters).toBeVisible()
	await expect(filters.getByRole('button')).toHaveText([...sizes, 'ALL'])
	await expect(page.locator('#map-filter-options,.filter-results,.map-progress')).toHaveCount(0)
	await expect(page.getByRole('checkbox', { name: 'Mobile friendly' })).toHaveCount(0)
	await filters.getByRole('button', { name: 'S', exact: true }).click()
	await page.locator('a.map').first().click()
	await expect(page.getByRole('dialog')).toBeVisible()
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
