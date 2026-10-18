import { redirect } from '@sveltejs/kit'
import { resolve } from '$app/paths'
import type { EntryGenerator, PageLoad } from './$types'

// Keep links to the first tutorial version working, but always start the continuous battle.
export const entries: EntryGenerator = () => ['movement', 'capture', 'combat', 'support', 'transport', 'terrain'].map((lesson) => ({ lesson }))
export const load: PageLoad = () => redirect(307, resolve('/tutorial/', {}))
