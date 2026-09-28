export interface MapCamera {
	percentage: number
	canZoomIn: boolean
	canZoomOut: boolean
	zoomIn: () => void
	zoomOut: () => void
	fit: () => void
}
