import { test, expect } from '@playwright/test'

test('range hatching matches a single gradient across fractional cell boundaries', async ({ page }) => {
	await page.setViewportSize({ width: 1000, height: 1100 })
	await page.goto('/play/1/')
	await page.locator('[data-cell="3"]').click()
	const overlay = page.locator('.range-hatching')
	await expect(overlay).toHaveCount(1)
	await expect(overlay).toHaveCSS('pointer-events', 'none')
	// Remove artwork and feedback only for this pixel comparison, leaving the actual
	// range geometry and painting intact. The reference expands the same clip to
	// the whole board, retaining the browser's compositing and subpixel origin.
	await page.addStyleTag({ content: '.board .cell-container { background: #808080 !important; outline: none !important; } .board .cell-container > *, .range-border { visibility: hidden !important; } .board-viewport { overflow: visible !important; }' })
	const board = page.locator('.board')
	const cells = await page.locator('.attackable').evaluateAll((elements) => elements.map((element) => Number(element.getAttribute('data-cell'))))
	for (const size of [310.5, 647.5]) {
		await page.locator('.map-surface').evaluate((element, pixels) => {
			element.style.width = `${pixels}px`
			element.style.height = `${pixels}px`
		}, size)
		await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
		const actual = (await board.screenshot({ scale: 'css' })).toString('base64')
		const clipPath = page.locator('.range-outline clipPath path')
		const clip = await clipPath.evaluate((element) => {
			const value = element.getAttribute('d')!
			element.setAttribute('d', 'M0,0H1V1H0Z')
			return value
		})
		await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
		const reference = (await board.screenshot({ scale: 'css' })).toString('base64')
		await clipPath.evaluate((element, value) => {
			element.setAttribute('d', value)
		}, clip)
		const comparison = await page.evaluate(
			async ({ actual, reference, cells }) => {
				async function pixels(encoded: string) {
					const image = new Image()
					image.src = `data:image/png;base64,${encoded}`
					await image.decode()
					const canvas = document.createElement('canvas')
					canvas.width = image.width
					canvas.height = image.height
					const context = canvas.getContext('2d')!
					context.drawImage(image, 0, 0)
					return context.getImageData(0, 0, canvas.width, canvas.height)
				}
				const rendered = await pixels(actual)
				const expected = await pixels(reference)
				const covered = (x: number, y: number) => cells.includes(Math.floor((y / rendered.height) * 8) * 8 + Math.floor((x / rendered.width) * 8))
				let checked = 0,
					mismatches = 0
				for (let y = 3; y < rendered.height - 3; y++)
					for (let x = 3; x < rendered.width - 3; x++) {
						// Exclude only the outer clip edges, keeping all internal tile seams.
						if (
							![
								[-3, 0],
								[3, 0],
								[0, -3],
								[0, 3],
								[0, 0]
							].every(([dx, dy]) => covered(x + dx, y + dy))
						)
							continue
						checked++
						const offset = (y * rendered.width + x) * 4
						if ([0, 1, 2].some((channel) => Math.abs(rendered.data[offset + channel] - expected.data[offset + channel]) > 3)) mismatches++
					}
				return { checked, mismatches }
			},
			{ actual, reference, cells }
		)
		expect(comparison.checked).toBeGreaterThan(1000)
		expect(comparison.mismatches).toBe(0)
	}
})
