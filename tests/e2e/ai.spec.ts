import { zoomToReadableTiles } from './map-view'
import { test, expect } from '@playwright/test'
import { turnTransitionDuration } from '../../src/lib/game/timing.ts'

test('Expert develops Meet in the Middle across four opening turns instead of passing', async ({ page }) => {
	test.setTimeout(120000)
	await page.goto('/play/4/?ai=expert')
	const endTurn = page.getByRole('button', { name: 'End round', exact: true })
	for (const round of [2, 4, 6, 8]) {
		await expect(page.getByText(`Round ${round}`, { exact: true })).toBeVisible({ timeout: 30000 })
		await expect(endTurn).toBeEnabled()
		if (round === 2) await expect(page.locator('[data-cell="15"]')).toHaveClass(/-halfcaptured/)
		if (round >= 4) await expect(page.locator('[data-cell="15"]')).toHaveClass(/-capturedby1/)
		if (round === 6) await expect(page.locator('[data-cell="19"]')).toHaveClass(/-halfcaptured/)
		if (round === 8) {
			await expect(page.locator('[data-cell="19"]')).toHaveClass(/-capturedby1/)
			await expect(page.locator('[data-cell="57"]')).toHaveClass(/-capturedby1/)
		} else await endTurn.click()
	}
})

test('AI hides all actions including settings, preserves their space and follows its active unit on mobile', async ({ page }) => {
	// Keep the AI from finishing its short selections while CI prepares the viewport.
	await page.clock.install()
	await page.clock.pauseAt(new Date())
	await page.setViewportSize({ width: 360, height: 800 })
	await page.goto('/play/7/?ai=easy')
	await expect(page.locator('.turn-announcement')).toBeVisible()
	await page.clock.runFor(turnTransitionDuration + 100)
	await expect(page.locator('.turn-announcement')).toHaveCount(0)
	await zoomToReadableTiles(page)
	await expect(page.locator('.action-controls')).toBeHidden()
	await expect(page.locator('.minimap')).toHaveCount(1)
	await expect(page.locator('.options-button')).toBeHidden()
	await expect(page.locator('.ammo')).toHaveCount(0)
	const controls = page.getByRole('navigation', { name: 'Game controls', includeHidden: true })
	await expect(controls).toHaveAttribute('inert', '')
	const controlsHeight = (await controls.boundingBox())!.height
	await page.locator('.board-viewport').evaluate((viewport) => viewport.scrollTo({ left: viewport.scrollWidth }))
	const selectedUnit = page.locator('.board [aria-pressed="true"]')
	await expect
		.poll(
			async () => {
				await page.clock.runFor(50)
				return selectedUnit.count()
			},
			{ timeout: 10000, intervals: [0] }
		)
		.toBe(1)
	// Leave the selected action paused while the browser's smooth scroll settles.
	await expect
		.poll(
			() =>
				page.evaluate(() => {
					const viewport = document.querySelector('.board-viewport')!
					const unit = document.querySelector('.board [aria-pressed="true"]')!
					const bounds = unit.getBoundingClientRect()
					const frame = viewport.getBoundingClientRect()
					const center = bounds.left - frame.left + viewport.scrollLeft + bounds.width / 2
					const expected = Math.max(0, Math.min(viewport.scrollWidth - viewport.clientWidth, center - viewport.clientWidth / 2))
					return Math.abs(viewport.scrollLeft - expected)
				}),
			{ timeout: 10000 }
		)
		.toBeLessThan(2)
	await expect(page.locator('.scroll-hint')).toHaveCount(0)
	await page.clock.resume()
	await expect(page.getByText('Round 2', { exact: true })).toBeVisible({ timeout: 30000 })
	await expect(page.locator('.options-button')).toBeVisible()
	await expect(page.locator('.unit-container.-two .ammo')).toHaveCount(5)
	await expect(page.locator('.unit-container.-one .ammo')).toHaveCount(0)
	expect((await controls.boundingBox())!.height).toBeCloseTo(controlsHeight, 1)
})

for (const difficulty of ['Easy', 'Medium', 'Hard', 'Expert']) {
	test(`${difficulty} AI starts from the map chooser, plays a turn and survives reload`, async ({ page }) => {
		test.setTimeout(60000)
		await page.goto('/')
		await page.getByRole('link', { name: /Neighbor Trouble/ }).click()
		const setup = page.getByRole('dialog', { name: 'Choose your opponent' })
		await expect(setup).toBeVisible()
		await setup.getByRole('button', { name: 'Play against AI', exact: true }).click()
		await setup.getByRole('link', { name: difficulty, exact: true }).click()
		await expect(page).toHaveURL(new RegExp(`/play/1/\\?ai=${difficulty.toLowerCase()}$`))
		await expect(page.locator('.match-mode')).toHaveCount(0)
		await expect(page.locator('header .turn')).toContainText('AI')
		await expect(page.locator('.turn-announcement')).toHaveText('AI’s turn to play')
		await expect(page.locator('.turn-sweep')).not.toHaveClass(/red/)
		const initialUnits = await page.locator('[data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.getAttribute('data-cell')))
		await page.waitForTimeout(1000)
		expect(await page.locator('[data-unit]').evaluateAll((units) => units.map((unit) => unit.parentElement?.getAttribute('data-cell')))).toEqual(initialUnits)
		await expect(page.locator('.turn-announcement')).toHaveCount(0)
		await expect(page.locator('.action-controls')).toBeHidden()
		await expect(page.locator('header .turn')).toContainText('AI')
		const humanCell = page.locator('[data-unit="5"]').locator('..')
		await humanCell.click()
		await expect(humanCell).toHaveAttribute('aria-pressed', 'false')
		await expect(page.getByText('Round 2', { exact: true })).toBeVisible({ timeout: 30000 })
		if (difficulty === 'Expert') await expect(page.locator('[data-cell="10"]')).toHaveClass(/-capturedby1/)
		await expect(page.locator('.turn-announcement')).toHaveText('Your turn to play')
		await expect(page.locator('.turn-announcement')).toHaveCount(0)
		await expect(page.getByRole('button', { name: 'End round', exact: true })).toBeEnabled()
		await humanCell.click()
		await expect(humanCell).toHaveAttribute('aria-pressed', 'true')
		await page.getByRole('button', { name: 'End round', exact: true }).click()
		await expect(page.locator('.turn-announcement')).toHaveText('AI’s turn to play')
		await expect(page.getByText('Round 4', { exact: true })).toBeVisible({ timeout: 30000 })
		await expect(page.locator('.turn-announcement')).toHaveText('Your turn to play')
		await page.reload()
		await expect(page).toHaveURL(new RegExp(`/play/1/\\?ai=${difficulty.toLowerCase()}$`))
		await expect(page.getByText('Round 1', { exact: true })).toBeVisible()
	})
}

test('AI setup can be dismissed and local multiplayer remains available', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('link', { name: /Neighbor Trouble/ }).click()
	await page.keyboard.press('Escape')
	await expect(page.getByRole('dialog')).toHaveCount(0)
	await page.getByRole('link', { name: /Neighbor Trouble/ }).click()
	await page.getByRole('link', { name: 'Play with someone on this device', exact: true }).click()
	await expect(page.locator('.turn-announcement')).toHaveText('Player 1, it’s your turn!')
	await page.getByRole('button', { name: 'End round', exact: true }).click()
	await expect(page.locator('.turn-announcement')).toHaveText('Player 2, it’s your turn!')
	await expect(page.getByText('Round 2', { exact: true })).toBeVisible()
	await expect(page.locator('.match-mode')).toHaveCount(0)
})

test('AI navigation cancels pending actions and invalid levels use local multiplayer', async ({ page }) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	await page.goto('/play/12/?ai=expert')
	await expect(page.locator('.action-controls')).toBeHidden()
	await expect(page.locator('header .turn')).toContainText('AI')
	await expect(page.locator('.options-button')).toBeHidden()
	await page.goto('/')
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
		['fr', 'Choisissez votre adversaire', 'Jouer contre l’IA', 'Expert'],
		['de', 'Wähle deinen Gegner', 'Gegen die KI spielen', 'Experte']
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
