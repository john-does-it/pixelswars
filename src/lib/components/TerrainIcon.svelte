<script>
	let { cell = null, terrain = 'grass', size = 40 } = $props()
	const terrainClasses = {
		grass: '-grass',
		moutain: '-moutain -ongrass',
		water: '-water',
		building: '-building -city -ongrass',
		factory: '-building -factory -ongrass',
		airport: '-building -airport -ongrass',
		hospital: '-building -hospital -ongrass',
		city: '-building -city -ongrass',
		road: '-road -h',
		forest: '-forest -ongrass'
	}
	const classes = $derived(cell ? cell.classes.filter((c) => !c.startsWith('-capturedby') && c !== '-halfcaptured').join(' ') : terrainClasses[terrain] || terrainClasses.grass)
</script>

<span class="cell-container terrain-icon {classes}" class:-capturedby1={cell?.owner === 1} class:-capturedby2={cell?.owner === 2} class:-halfcaptured={cell?.capturePoints < 20} style:width="{size}px" style:height="{size}px" aria-hidden="true"></span>

<style>
	.terrain-icon {
		display: inline-block;
		flex: none;
		background-size: cover;
		image-rendering: pixelated;
		border-radius: 3px;
		vertical-align: middle;
	}
</style>
