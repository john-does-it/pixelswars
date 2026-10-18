import { dev } from '$app/environment'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => ({
	draftMaps: dev ? (await import('$lib/game/draft-maps')).loadDraftMaps() : []
})
