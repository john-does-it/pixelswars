/** @type {import('@inlang/paraglide-js').CompilerOptions} */
const config = {
	project: './project.inlang',
	outdir: './src/lib/paraglide',
	emitTsDeclarations: true,
	strategy: ['baseLocale']
}

export default config
