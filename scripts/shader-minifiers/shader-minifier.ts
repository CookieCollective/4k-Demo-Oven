import { readFile, writeFile } from 'fs-extra';
import { Provider } from 'nconf';
import { join } from 'path';

import {
	IPass,
	IShaderDefinition,
	IShaderMinifier,
	IUniformArrays,
} from '../definitions';
import { spawn } from '../lib';

export class ShaderMinifierShaderMinifier implements IShaderMinifier {
	private config: Provider;

	constructor(config: Provider) {
		this.config = config;
		this.config.required(['tools:shader-minifier']);
	}

	async minify(definition: Readonly<IShaderDefinition>) {
		const { globals } = definition;

		const buildDirectory: string = this.config.get('paths:build');
		const input = join(buildDirectory, 'shader.glsl');
		const output = join(buildDirectory, 'shader.min.glsl');

		const shaderLines = [definition.shader, '', 'void main() {'];

		Object.keys(definition.uniformArrays).forEach((type) => {
			shaderLines.push(definition.uniformArrays[type].name + ';');
		});

		globals.forEach((global) => {
			if (global.active && !global.annotations.uniform) {
				shaderLines.push(global.name + ';');
			}
		});

		if (Array.isArray(definition.passMainFunctionNames)) {
			definition.passMainFunctionNames.forEach((passName) => {
				if (passName.vertex) {
					shaderLines.push(passName.vertex + '();');
				}
				if (passName.fragment) {
					shaderLines.push(passName.fragment + '();');
				}
			});
		}

		shaderLines.push('}');

		await writeFile(input, shaderLines.join('\n'));

		const shaderMinifierPath = this.config.get('tools:shader-minifier');

		const args = [
			'--field-names',
			'xyzw',
			'--format',
			'none',
			'-o',
			output,
			'-v',
			'--',
			input,
		];

		if (process.platform === 'win32') {
			await spawn(shaderMinifierPath, args);
		} else {
			this.config.required(['tools:mono']);
			args.unshift(shaderMinifierPath);
			await spawn(this.config.get('tools:mono'), args);
		}

		const contents = await readFile(output, 'utf8');

		const match = contents.match(/^((?:.|\n)+)void main\(\)\{([\w,\(\)]+);\}$/);
		if (!match) {
			throw new Error('Output is not well-formed.');
		}

		let shader = match[1];

		const metadata = match[2].split(',');

		const uniformArrays: IUniformArrays = {};
		Object.keys(definition.uniformArrays).forEach((type) => {
			const name = metadata.shift();
			if (!name) {
				throw new Error('Output is not well-formed.');
			}

			uniformArrays[type] = {
				globals: definition.uniformArrays[type].globals,
				name,
			};

			// HACK https://github.com/laurentlb/Shader_Minifier/issues/19
			const usageRegExp = new RegExp(
				`\\b${definition.uniformArrays[type].name}\\b`,
				'g'
			);
			shader = shader.replace(usageRegExp, name);
		});

		globals.forEach((global) => {
			if (global.active && !global.annotations.uniform) {
				const minifiedName = metadata.shift();
				if (!minifiedName) {
					throw new Error('Output is not well-formed.');
				}
				global.minifiedName = minifiedName;
			}
		});

		const passMainFunctionNames: IPass[] | undefined = Array.isArray(
			definition.passMainFunctionNames
		)
			? definition.passMainFunctionNames.map((passName) => {
					console.log('ICI');
					let vertex: string | undefined;
					let fragment: string | undefined;
					if (passName.vertex) {
						vertex = metadata.shift();
						if (vertex) {
							vertex = vertex.substr(0, vertex.length - 2);
						} else {
							throw new Error('Output is not well-formed.');
						}
					}
					if (passName.fragment) {
						fragment = metadata.shift();
						if (fragment) {
							fragment = fragment.substr(0, fragment.length - 2);
						} else {
							throw new Error('Output is not well-formed.');
						}
					}
					return {
						fragment,
						vertex,
					};
			  })
			: undefined;

		if (metadata.length !== 0) {
			throw new Error('Output is not well-formed.');
		}

		return {
			globals,
			passMainFunctionNames,
			shader,
			uniformArrays,
		};
	}
}
