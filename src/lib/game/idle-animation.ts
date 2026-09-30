// Keep each aircraft's hover phase stable when it moves between cells.
export function aircraftIdleTiming(unitId: number): { duration: number; delay: number } {
	const seed = Math.imul(unitId + 1, 2654435761) >>> 0
	return {
		duration: 8000 + (seed % 4001),
		delay: -(seed % 23000)
	}
}

export function infantryIdleWait(): number {
	return 12000 + Math.floor(Math.random() * 12001)
}
