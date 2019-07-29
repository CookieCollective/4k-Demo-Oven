import { join } from 'path';

import { Config } from './config';
import { spawn } from './lib';

export function minify(config: Config) {
	const buildDirectory: string = config.get('paths:build');

	return spawn('node', [
		join('node_modules', 'glsl-unit', 'bin', 'template_glsl_compiler.js'),
		'--input=' + join(buildDirectory, 'shader.glsl'),
		'--variable_renaming=INTERNAL',
		'--output=' + join(buildDirectory, 'shader.min.glsl'),
	]);
}
