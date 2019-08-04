import { readFile, writeFile } from 'fs-extra';
import { Provider } from 'nconf';
import { join } from 'path';

import { IShaderDefinition, IShaderMinifier } from '../definitions';
import { spawn } from '../lib';

export class GlslUnitShaderMinifier implements IShaderMinifier {
	private config: Provider;

	constructor(config: Provider) {
		this.config = config;
	}

	async minify(definition: Readonly<IShaderDefinition>) {
		const buildDirectory: string = this.config.get('paths:build');
		const input = join(buildDirectory, 'shader.glsl');
		const output = join(buildDirectory, 'shader.min.glsl');

		await writeFile(input, '//! FRAGMENT\n' + definition.shader);

		await spawn('node', [
			join('node_modules', 'glsl-unit', 'bin', 'template_glsl_compiler.js'),
			'--input=' + input,
			'--variable_renaming=INTERNAL',
			'--output=' + output,
		]);

		const contents = await readFile(output, 'utf8');

		const lines = contents.split('\n');
		const shader = lines[lines.length - 1];

		// TODO
		return {
			globals: definition.globals,
			passMainFunctionNames: definition.passMainFunctionNames,
			shader,
			uniformArrays: definition.uniformArrays,
		};
	}
}
