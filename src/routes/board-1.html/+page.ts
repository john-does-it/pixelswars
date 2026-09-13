import { redirect } from '@sveltejs/kit'
import { resolve } from '$app/paths'
import type { PageLoad } from './$types'

export const load: PageLoad = () => {
	redirect(307, `${resolve('/play/[map]', { map: '1' })}/`)
}
