import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

// Plugin to resolve $lib/ imports inside the inspire-tables submodule
// so they point to the submodule's own src/lib/ instead of ours
function inspireTablesResolver() {
	const submoduleLib = path.resolve('inspire-tables/src/lib');
	return {
		name: 'inspire-tables-lib-resolver',
		resolveId(source: string, importer: string | undefined) {
			if (
				source.startsWith('$lib/') &&
				importer &&
				importer.includes('inspire-tables')
			) {
				return path.join(submoduleLib, source.slice(5));
			}
			return null;
		},
	};
}

export default defineConfig({
	plugins: [inspireTablesResolver(), sveltekit()],
	resolve: {
		alias: {
			$tables: path.resolve('inspire-tables/src/lib'),
		},
	},
});
