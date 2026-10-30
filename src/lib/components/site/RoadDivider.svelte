<script lang="ts">
 import { onMount } from 'svelte'
 import { asset } from '$lib/game/asset-path'
 let road: HTMLDivElement
 let progress = $state(0)
 let direction = $state(1)
 onMount(() => {
  let previous = scrollY
  let frame = 0
  function update() {
   frame = 0
   const bounds = road.getBoundingClientRect()
   if (scrollY !== previous) direction = scrollY > previous ? 1 : -1
   previous = scrollY
   progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight + bounds.height)))
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update) }
  update()
  addEventListener('scroll', schedule, {passive:true});addEventListener('resize',schedule)
  return () => {cancelAnimationFrame(frame);removeEventListener('scroll',schedule);removeEventListener('resize',schedule)}
 })
</script>
<div bind:this={road} class="road-divider" style:background-image={`url('${asset('/assets/cells/cell-road-h.svg')}')`} aria-hidden="true">
 <img src={asset('/assets/units/jeep/red/jeep-red-no-damage.png')} alt="" style:left={`calc(${progress * 100}% + ${progress * 96 - 96}px)`} style:transform={`scaleX(${direction})`} />
</div>
<style>
 .road-divider {height:64px;background-size:64px 64px;position:relative;overflow:hidden;}
 img {position:absolute;width:96px;height:96px;top:-16px;image-rendering:pixelated;object-fit:contain;}
 @media(prefers-reduced-motion:reduce){img{left:8%!important;transform:none!important;}}
</style>
