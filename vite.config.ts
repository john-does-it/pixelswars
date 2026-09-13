import { sveltekit } from '@sveltejs/kit/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import paraglideConfig from './paraglide.config.js'

export default defineConfig({
	plugins: [paraglideVitePlugin(paraglideConfig), sveltekit()]
})
