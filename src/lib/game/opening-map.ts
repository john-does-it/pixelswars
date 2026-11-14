import { carouselOrder, mapSize } from './map-discovery.ts'
import { isMapInCatalog } from './map-catalog.ts'
import previews from '../data/map-previews.json'

// This small standalone module can start the image request as the static HTML
// is parsed, independently of the framework, translations and editor.
const metadata = document.querySelector<HTMLScriptElement>('script[data-preview-base]')
const stage = document.querySelector('.stage')
if (metadata && stage && !document.querySelector('.view-toggle:enabled')) {
	const filter = new URL(location.href).searchParams.get('size')
	const size = filter && ['XS', 'S', 'M', 'L', 'XL'].includes(filter) ? filter : 'ALL'
	const maps = Object.entries(previews)
		.filter(([id, map]) => isMapInCatalog(id) && (size === 'ALL' || mapSize(map.cols * map.rows) === size))
		.map(([id, map]) => ({ id, ...map, playable: true }))
	const ranks = new Map(maps.map((map) => [map.id, Math.random()]))
	const { width, height } = stage.getBoundingClientRect()
	const first = carouselOrder(maps, ranks, width, height)[0]
	const anchor = document.querySelector<HTMLAnchorElement>('.stage .map')
	const picture = anchor?.querySelector<HTMLPictureElement>('[data-opening-preview]')
	if (first && anchor && picture) {
		document.documentElement.dataset.openingMap = first.id
		document.documentElement.dataset.openingSize = size
		const path = metadata.dataset.previewBase + 'map-' + first.id
		anchor.style.setProperty('--map-ratio', String(first.cols / first.rows))
		anchor.dataset.mapId = first.id
		anchor.href = new URL('../' + first.id + '/', anchor.href).href
		picture.querySelector('source')!.srcset = path + '.webp'
		const image = picture.querySelector('img')!
		image.width = Math.round((image.height * first.cols) / first.rows)
		image.src = path + '.png'
		document.getElementById('map-name')!.textContent = JSON.parse(metadata.dataset.names!)[first.id]
	}
}
