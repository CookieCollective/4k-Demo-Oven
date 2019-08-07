import { readFile, writeFile } from 'fs-extra';
import { Provider } from 'nconf';
import { join } from 'path';

import { IShaderDefinition, IShaderMinifier } from '../definitions';
import { spawn } from '../lib';

export class ShaderMinifierShaderMinifier implements IShaderMinifier {
	private config: Provider;

	constructor(config: Provider) {
		this.config = config;
		this.config.required(['tools:shader-minifier']);
	}

	async minify(definition: IShaderDefinition) {
		const { variables } = definition;

		const buildDirectory: string = this.config.get('paths:build');
		const input = join(buildDirectory, 'shader.glsl');
		const output = join(buildDirectory, 'shader.min.glsl');

		const shaderLines = ['// Uniform arrays', ''];

		Object.keys(definition.uniformArrays).forEach((type) => {
			shaderLines.push(
				`uniform ${type} ${definition.uniformArrays[type].name}[${definition.uniformArrays[type].variables.length}];`
			);
		});

		const nonUniformVariables = variables.filter(
			(variable) => variable.active && variable.kind !== 'uniform'
		);

		shaderLines.push(
			'',
			'#pragma separator',
			'// Non-uniform global variables',
			''
		);

		nonUniformVariables.forEach((variable) => {
			shaderLines.push(variable.type + ' ' + variable.name + ';');
		});

		if (definition.attributesCode) {
			shaderLines.push(
				'',
				'#pragma separator',
				'// Attributes',
				'',
				definition.attributesCode
			);
		}

		if (definition.varyingsCode) {
			shaderLines.push(
				'',
				'#pragma separator',
				'// Varyings',
				'',
				definition.varyingsCode
			);
		}

		if (definition.outputsCode) {
			shaderLines.push(
				'',
				'#pragma separator',
				'// Outputs',
				'',
				definition.outputsCode
			);
		}

		shaderLines.push('', '#pragma separator', '', definition.commonCode);

		definition.passes.forEach((passName, index) => {
			if (passName.vertexCode) {
				shaderLines.push(
					'',
					'#pragma separator',
					`// Pass ${index} vertex`,
					''
				);
				shaderLines.push(passName.vertexCode);
			}

			if (passName.fragmentCode) {
				shaderLines.push(
					'',
					'#pragma separator',
					`// Pass ${index} fragment`,
					''
				);
				shaderLines.push(passName.fragmentCode);
			}
		});

		await writeFile(input, shaderLines.join('\n'));

		const shaderMinifierPath = this.config.get('tools:shader-minifier');

		const args = [
			'--field-names',
			'rgba',
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

		const contents = (await readFile(output, 'utf8')).replace(/\r/g, '');

		const parts = contents.split('#pragma separator');

		function takePart() {
			const part = parts.shift();
			if (typeof part === 'undefined') {
				throw new Error('Output is not well-formed.');
			}

			let trimmedPart = part.trim();

			// HACK https://github.com/laurentlb/Shader_Minifier/issues/19
			Object.keys(definition.uniformArrays).forEach((type) => {
				const uniformArray = definition.uniformArrays[type];
				if (uniformArray.minifiedName) {
					const usageRegExp = new RegExp(`\\b${uniformArray.name}\\b`, 'g');
					trimmedPart = trimmedPart.replace(
						usageRegExp,
						uniformArray.minifiedName
					);
				}
			});

			return trimmedPart;
		}

		const uniformsString = takePart();
		const uniformsRegExp = /uniform \w+ (\w+)\[\d+\];/g;
		Object.keys(definition.uniformArrays).forEach((type) => {
			const uniformMatch = uniformsRegExp.exec(uniformsString);
			if (!uniformMatch) {
				throw new Error('Output is not well-formed.');
			}

			definition.uniformArrays[type].minifiedName = uniformMatch[1];
		});

		const nonUniformGlobalsString = takePart();
		const nonUniformGlobalsRegExp = /\w+ (\w+);/g;
		nonUniformVariables.forEach((variable) => {
			const nonUniformMatch = nonUniformGlobalsRegExp.exec(
				nonUniformGlobalsString
			);
			if (!nonUniformMatch) {
				throw new Error('Output is not well-formed.');
			}
			variable.minifiedName = nonUniformMatch[1];
		});

		if (definition.attributesCode) {
			definition.attributesCode = takePart();
		}

		if (definition.varyingsCode) {
			definition.varyingsCode = takePart();
		}

		if (definition.outputsCode) {
			definition.outputsCode = takePart();
		}

		definition.commonCode = takePart();

		definition.passes.forEach((passName) => {
			if (passName.vertexCode) {
				passName.vertexCode = takePart();
			}

			if (passName.fragmentCode) {
				passName.fragmentCode = takePart();
			}
		});

		if (parts.length !== 0) {
			throw new Error('Output is not well-formed.');
		}
	}
}
