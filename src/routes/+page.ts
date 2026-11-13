import { dev } from '$app/env'
import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
	if (dev) {
		const id = url.searchParams.get('draft')
		if (id !== null) {
			const maps = (await import('#lib/game/draft-maps.js')).loadDraftMaps()
			const draftMap = maps.find((map) => map.id === id)
			if (!draftMap) error(404, 'Unknown draft map')
			return { draftMap }
		}
	}
	return { draftMap: null }
}
