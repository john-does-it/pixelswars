import { test, expect } from '@playwright/test'

test('volume adjusts existing music silently without restarting playback', async ({ page }) => {
	await page.addInitScript(() => {
		const audioState = window as unknown as { playedAudio: HTMLMediaElement[] }
		audioState.playedAudio = []
		HTMLMediaElement.prototype.play = function () {
			audioState.playedAudio.push(this)
			return Promise.resolve()
		}
	})
	await page.goto('/play/1/')
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	const volume = page.getByRole('slider', { name: 'Sound', exact: true })
	await volume.fill('50')
	const playCount = () => page.evaluate(() => (window as unknown as { playedAudio: HTMLMediaElement[] }).playedAudio.length)
	await expect.poll(playCount).toBe(0)
	await page.getByRole('button', { name: 'Music off', exact: true }).click()
	await expect.poll(playCount).toBe(1)
	await volume.fill('25')
	await expect.poll(() => page.evaluate(() => (window as unknown as { playedAudio: HTMLMediaElement[] }).playedAudio[0].volume)).toBeCloseTo(0.125 * 0.25)
	await expect.poll(playCount).toBe(1)
})
