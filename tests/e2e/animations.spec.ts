import { test, expect } from '@playwright/test'

test('ambient animations leave indicators fixed and persist their toggle across reloads', async ({ page, context }) => {
	await page.goto('/play/1/')
	await expect(page.locator('.turn-announcement')).toHaveCount(0, { timeout: 10000 })
	const unit = page.locator('[data-unit="1"]')
	const sprite = unit.locator('.unit-sprite')
	await expect(sprite).toHaveClass(/idle/)
	await expect(sprite).toHaveCSS('image-rendering', 'pixelated')
	const originalArtwork = await sprite.evaluate((element) => getComputedStyle(element).backgroundImage)
	const result = await unit.evaluate((element) => {
		const artwork = element.querySelector('.unit-sprite')!
		const animation = artwork.getAnimations()[0]
		const timing = animation.effect!.getTiming()
		const duration = Number(timing.duration)
		const indicators = [...element.querySelectorAll('.health, .ammo, .fuel, .capture')]
		// Freeze the existing heartbeat so only the new idle transform is compared.
		for (const indicator of indicators) for (const feedback of indicator.getAnimations({ subtree: true })) feedback.pause()
		const positions = () =>
			indicators.map((indicator) => {
				const bounds = indicator.getBoundingClientRect()
				return [bounds.x, bounds.y, bounds.width, bounds.height]
			})
		animation.pause()
		animation.currentTime = Number(timing.delay) - 1
		const before = positions()
		const forward = getComputedStyle(artwork).transform
		animation.currentTime = Number(timing.delay) + duration / 2
		return { before, after: positions(), forward, reversed: getComputedStyle(artwork).transform, artwork: getComputedStyle(artwork).backgroundImage }
	})
	expect(result.before).toEqual(result.after)
	expect(result.forward).not.toEqual(result.reversed)
	expect(result.artwork).toBe(originalArtwork)
	const delays = await page.locator('.unit-sprite.idle').evaluateAll((sprites) => sprites.map((sprite) => parseFloat(getComputedStyle(sprite).animationDelay)))
	expect(delays.every((delay) => delay >= 12 && delay <= 24)).toBe(true)
	expect(new Set(delays).size).toBeGreaterThan(1)
	// Finishing a glance must schedule another full rest, not immediately flip again.
	const firstAnimationName = await sprite.evaluate((element) => getComputedStyle(element).animationName)
	await sprite.evaluate((element) => element.getAnimations()[0].finish())
	await expect(sprite).not.toHaveCSS('animation-name', firstAnimationName)
	const nextCycle = await sprite.evaluate((element) => {
		const animation = element.getAnimations()[0]
		return { delay: Number(animation.effect!.getTiming().delay), transform: getComputedStyle(element).transform }
	})
	expect(nextCycle.delay).toBeGreaterThanOrEqual(12000)
	expect(nextCycle.delay).toBeLessThanOrEqual(24000)
	expect(nextCycle.transform).toBe('none')
	await expect(page.locator('.water-shimmer').first()).toBeVisible()
	await expect(page.locator('.building-lights').first()).toBeVisible()
	await expect(page.locator('.water-shimmer').first()).not.toHaveCSS('mask-image', 'none')
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	await page.getByRole('combobox', { name: 'Animations', exact: true }).selectOption('off')
	await expect(page.getByRole('combobox', { name: 'Animations', exact: true })).toHaveValue('off')
	await expect(page.locator('.unit-sprite.idle')).toHaveCount(0)
	await expect(sprite).toHaveCSS('background-image', originalArtwork)
	await expect(page.locator('.water-shimmer')).toHaveCount(0)
	await expect(page.locator('.building-lights')).toHaveCount(0)
	const cookie = (await context.cookies()).find((cookie) => cookie.name === 'pixelswars-settings')!
	expect(JSON.parse(decodeURIComponent(cookie.value)).animations).toBe(false)
	await page.reload()
	await expect(page.locator('.turn-announcement')).toHaveCount(0, { timeout: 10000 })
	await expect(page.locator('.unit-sprite.idle')).toHaveCount(0)
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	await page.getByRole('combobox', { name: 'Animations', exact: true }).selectOption('on')
	await expect(sprite).toHaveClass(/idle/)
	await expect(page.locator('.building-lights').first()).toBeVisible()
})

test('helicopters hover, ground vehicles stay still, and reduced motion disables ambient effects', async ({ page }) => {
	await page.goto('/play/10/')
	await expect(page.locator('.turn-announcement')).toHaveCount(0, { timeout: 10000 })
	const helicopter = page.locator('.unit-container.-helicopter .unit-sprite').first()
	await expect(helicopter).toHaveClass(/airborne/)
	await expect(helicopter).toHaveCSS('animation-name', /idle-hover/)
	for (const type of ['tank', 'jeep', 'artillery', 'anti-air']) {
		await expect(page.locator(`.unit-container.-${type} .unit-sprite`).first()).toHaveCSS('animation-name', 'none')
	}
	await page.emulateMedia({ reducedMotion: 'reduce' })
	for (const sprite of await page.locator('.unit-sprite').all()) await expect(sprite).toHaveCSS('animation-name', 'none')
	for (const water of await page.locator('.water-shimmer').all()) await expect(water).toBeHidden()
	for (const lights of await page.locator('.building-lights').all()) await expect(lights).toBeHidden()
})

test('building lights switch without moving or recoloring the building beneath them', async ({ page }) => {
	await page.goto('/play/18/')
	await expect(page.locator('.turn-announcement')).toHaveCount(0, { timeout: 10000 })
	const lights = page.locator('.building-lights')
	await expect(lights.first()).toBeVisible()
	await expect
		.poll(() =>
			lights.evaluateAll((elements) =>
				elements.every((element) => {
					const animation = element.getAnimations()[0]
					return animation?.startTime === 0 && animation.effect?.getTiming().duration === 8000
				})
			)
		)
		.toBe(true)
	const result = await lights.first().evaluate((element) => {
		const cell = element.parentElement!
		const animation = element.getAnimations()[0]
		const timing = animation.effect!.getTiming()
		const duration = Number(timing.duration)
		const snapshot = () => ({ bounds: cell.getBoundingClientRect().toJSON(), background: getComputedStyle(cell).backgroundImage })
		animation.pause()
		animation.currentTime = Number(timing.delay) + duration * 2.1
		const off = getComputedStyle(element).opacity
		const before = snapshot()
		animation.currentTime = Number(timing.delay) + duration * 2.75
		return { off, on: getComputedStyle(element).opacity, before, after: snapshot(), pointerEvents: getComputedStyle(element).pointerEvents }
	})
	expect(result.off).toBe('0')
	expect(result.on).toBe('1')
	expect(result.before).toEqual(result.after)
	expect(result.pointerEvents).toBe('none')
})

test('building lights can be disabled separately and retain their setting when animations are toggled', async ({ page }) => {
	await page.goto('/play/1/')
	await expect(page.locator('.turn-announcement')).toHaveCount(0, { timeout: 10000 })
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	const lights = page.getByRole('combobox', { name: 'Building lights', exact: true })
	const animations = page.getByRole('combobox', { name: 'Animations', exact: true })
	await expect(lights).toHaveValue('on')
	await lights.selectOption('off')
	await expect(page.locator('.building-lights')).toHaveCount(0)
	await expect(page.locator('.water-shimmer').first()).toBeVisible()
	await expect(page.locator('.unit-sprite.idle').first()).toBeVisible()
	await animations.selectOption('off')
	await expect(lights).toBeVisible()
	await expect(lights).toBeDisabled()
	await animations.selectOption('on')
	await expect(lights).toBeEnabled()
	await expect(lights).toHaveValue('off')
	await page.reload()
	await expect(page.locator('.turn-announcement')).toHaveCount(0, { timeout: 10000 })
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	await expect(animations).toHaveValue('on')
	await expect(lights).toHaveValue('off')
	await expect(page.locator('.building-lights')).toHaveCount(0)
	await lights.selectOption('on')
	await expect(page.locator('.building-lights').first()).toBeVisible()
	await expect.poll(() => page.locator('.building-lights').evaluateAll((elements) => elements.every((element) => element.getAnimations()[0]?.startTime === 0))).toBe(true)
})
