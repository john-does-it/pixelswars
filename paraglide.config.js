/** @type {import('@inlang/paraglide-js').CompilerOptions} */
const config = {
	project: './project.inlang',
	outdir: './src/lib/paraglide',
	// Keep dev, builds and standalone generation from replacing each other's modules.
	outputStructure: 'message-modules',
	emitTsDeclarations: true,
	strategy: ['baseLocale']
}

export default config
