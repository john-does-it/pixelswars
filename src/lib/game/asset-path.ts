import { asset as publicAsset } from '$app/paths'
import replacements from './asset-aliases.json'

// Keep gameplay IDs stable while using the names exported from the art library.
export function asset(path: string): string {
	return publicAsset((replacements as Record<string, string>)[path] ?? path)
}
