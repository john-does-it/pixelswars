import type { Page } from '@playwright/test'

export async function openMapFilters(page: Page) {
	const toggle = page.getByRole('button', { name: /^Filters ·/ })
	if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click()
}
