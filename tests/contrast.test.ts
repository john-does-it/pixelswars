import test from 'node:test'
import assert from 'node:assert/strict'

function luminance(color: string): number {
	const channels = (color.match(/\w\w/g) ?? []).map((channel) => Number.parseInt(channel, 16) / 255).map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(foreground: string, background: string): number {
	const values = [luminance(foreground), luminance(background)].sort((firstLuminance, secondLuminance) => secondLuminance - firstLuminance)
	return (values[0] + 0.05) / (values[1] + 0.05)
}

test('normal text colors meet WCAG AAA contrast', () => {
	for (const [name, foreground, background] of [
		['primary text', '#ffffff', '#0d1216'],
		['secondary panel text', '#e1e9ed', '#19242c'],
		['eyebrow', '#c7dce8', '#0d1216'],
		['player one', '#8dcbff', '#0d1216'],
		['player two', '#ffb3b1', '#0d1216'],
		['button', '#ffffff', '#2b3d49'],
		['disabled button', '#aebbc4', '#202a31']
	]) {
		assert.ok(contrast(foreground, background) >= 7, `${name} contrast is ${contrast(foreground, background).toFixed(2)}:1`)
	}
})

test('component boundaries exceed non-text contrast requirements', () => {
	for (const [name, foreground, background] of [
		['panel border', '#78909f', '#19242c'],
		['modal border', '#a9bbc6', '#19242c'],
		['available offer border', '#a7e6c8', '#17382c']
	]) {
		assert.ok(contrast(foreground, background) >= 3, `${name} contrast is ${contrast(foreground, background).toFixed(2)}:1`)
	}
})
