<script lang="ts">
	import { asset } from '#lib/game/asset-path.js'
	let { src, alt = '', size = 'm', lazy = false }: { src: string; alt?: string; size?: 's' | 'm' | 'l' | 'xl'; lazy?: boolean } = $props()
</script>

<img class="sprite" class:s={size === 's'} class:m={size === 'm'} class:l={size === 'l'} class:xl={size === 'xl'} src={asset(src)} {alt} loading={lazy ? 'lazy' : 'eager'} draggable="false" />

<style>
	.sprite {
		display: inline-block;
		width: var(--sprite-size);
		height: var(--sprite-size);
		object-fit: contain;
		image-rendering: pixelated;
		flex: none;
	}
	.s {
		--sprite-size: 40px;
	}
	.m {
		--sprite-size: 64px;
	}
	.l {
		--sprite-size: 96px;
	}
	.xl {
		--sprite-size: 124px;
	}
</style>
