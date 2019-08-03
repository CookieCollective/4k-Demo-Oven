import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';

import { IConfig } from './config';
import { spawn } from './lib';

export async function minify(config: IConfig, shader: string) {
	const buildDirectory: string = config.get('paths:build');
	const input = join(buildDirectory, 'shader.glsl');
	const output = join(buildDirectory, 'shader.min.glsl');

	await writeFile(input, '//! FRAGMENT\n' + shader);

	await spawn('node', [
		join('node_modules', 'glsl-unit', 'bin', 'template_glsl_compiler.js'),
		'--input=' + input,
		'--variable_renaming=INTERNAL',
		'--output=' + output,
	]);

	const contents = await readFile(output, 'utf8');

	const lines = contents.split('\n');
	shader = lines[lines.length - 1];

	return shader;
}
