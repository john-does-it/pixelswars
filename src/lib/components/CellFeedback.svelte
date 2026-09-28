<script lang="ts">
	import { cellFeedbackDuration } from '$lib/game/timing.js'

	let { text, tone = 'neutral', class: className = '', label, announce = false }: { text: string; tone?: 'neutral' | 'healing' | 'damage'; class?: string; label?: string; announce?: boolean } = $props()
</script>

<span class="cell-feedback {className}" class:healing={tone === 'healing'} class:damage={tone === 'damage'} role={announce ? 'status' : undefined} aria-label={label} style:--feedback-duration={`${cellFeedbackDuration}ms`}>{text}</span>

<style>
	.cell-feedback {
		position: absolute;
		z-index: 6;
		left: 0;
		right: 0;
		top: 0;
		color: white;
		text-align: center;
		text-shadow: 1px 1px black;
		white-space: nowrap;
		font-size: clamp(10px, 1.2vw, 14px);
		pointer-events: none;
		animation: feedback-rise var(--feedback-duration) forwards;
	}
	.healing {
		color: #b7f59b;
	}
	.damage {
		color: #ffb3b1;
	}
	@keyframes feedback-rise {
		to {
			transform: translateY(-30px);
			opacity: 0;
		}
	}
	@keyframes feedback-fade {
		to {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cell-feedback {
			animation-name: feedback-fade;
		}
	}
</style>
