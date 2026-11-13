import { resolve } from '$app/paths'
import { isLocalMapId } from '../map-editor/model.ts'

export function playUrl(id: string, params: Record<string, string> = {}): string {
	const local = isLocalMapId(id)
	const path = local ? resolve('/play/local') : resolve('/play/[map]', { map: id })
	const query = new URLSearchParams(local ? { id, ...params } : params).toString()
	return path + '/' + (query ? '?' + query : '')
}
