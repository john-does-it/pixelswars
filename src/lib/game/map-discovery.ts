type Preview = { id: string; cols: number; rows: number; playable: boolean }

export function mapSize(cells: number) {
	return cells <= 80 ? 'XS' : cells <= 120 ? 'S' : cells <= 160 ? 'M' : cells <= 200 ? 'L' : 'XL'
}

export function carouselOrder<T extends Preview>(maps: T[], ranks: ReadonlyMap<string, number>, width: number, height: number): T[] {
	// Ranks are drawn once per visit. Maps added to the library later join the end.
	const order = [...maps].sort((a, b) => (ranks.get(a.id) ?? 1) - (ranks.get(b.id) ?? 1))
	const candidates = order.filter((map) => map.playable).slice(0, 3)
	if (!candidates.length || width <= 0 || height <= 0) return order

	function fit(map: Preview) {
		const tile = Math.min(width / map.cols, height / map.rows)
		const coverage = (tile * map.cols * tile * map.rows) / (width * height)
		return coverage * Math.min(1, tile / 32)
	}

	// Compare a small random sample so even less common board shapes get featured.
	const first = candidates.reduce((best, map) => (fit(map) > fit(best) ? map : best))
	return [first, ...order.filter((map) => map !== first)]
}
