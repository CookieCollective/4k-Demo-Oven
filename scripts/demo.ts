import { readFile } from 'fs-extra';
import { join } from 'path';

import {
	IContext,
	IDemoDefinition,
	IHooks,
	IShaderDefinition,
	Variable,
} from './definitions';
import { addConstant } from './variables';

export async function provideDemo(context: IContext): Promise<IDemoDefinition> {
	const { config } = context;

	const variables: Variable[] = [];

	if (config.get('capture')) {
		addConstant(
			variables,
			'float',
			'resolutionWidth',
			config.get('capture:width')
		);
		addConstant(
			variables,
			'float',
			'resolutionHeight',
			config.get('capture:height')
		);
	} else {
		if (
			config.get('demo:resolution:width') > 0 &&
			config.get('demo:resolution:height') > 0
		) {
			addConstant(
				variables,
				'float',
				'resolutionWidth',
				config.get('demo:resolution:width')
			);
			addConstant(
				variables,
				'float',
				'resolutionHeight',
				config.get('demo:resolution:height')
			);
		}
	}

	const shader: IShaderDefinition = {
		commonCode: '',
		passes: [],
		uniformArrays: {},
		variables,
	};

	await context.shaderProvider.provide(shader);

	if (shader.passes.length === 0) {
		throw new Error('Shader should define at least one pass.');
	}

	// Replace constants by their value.
	// Deactivate unreferenced variables.
	variables.forEach((variable) => {
		if (variable.active) {
			const usageRegExp = new RegExp(`\\b${variable.name}\\b`, 'g');

			if (variable.kind === 'const') {
				console.log(
					`Replacing references to constant "${variable.name}" by its value "${variable.value}".`
				);

				if (shader.prologCode) {
					shader.prologCode = shader.prologCode.replace(
						usageRegExp,
						variable.value
					);
				}

				shader.commonCode = shader.commonCode.replace(
					usageRegExp,
					variable.value
				);

				shader.passes.forEach((pass) => {
					if (pass.vertexCode) {
						pass.vertexCode = pass.vertexCode.replace(
							usageRegExp,
							variable.value
						);
					}

					if (pass.fragmentCode) {
						pass.fragmentCode = pass.fragmentCode.replace(
							usageRegExp,
							variable.value
						);
					}
				});

				variable.active = false;
			} else {
				const commonMatch = shader.commonCode.match(usageRegExp);
				let referenced = commonMatch ? commonMatch.length > 0 : false;

				if (
					shader.passes.some((pass) => {
						if (pass.fragmentCode) {
							const fragmentMatch = pass.fragmentCode.match(usageRegExp);
							if (fragmentMatch && fragmentMatch.length > 0) {
								return true;
							}
						}
						if (pass.vertexCode) {
							const vertexMatch = pass.vertexCode.match(usageRegExp);
							if (vertexMatch && vertexMatch.length > 0) {
								return true;
							}
						}
						return false;
					})
				) {
					referenced = true;
				}

				if (!referenced) {
					console.log(
						`Global variable "${variable.name}" is not referenced and won't be used.`
					);

					variable.active = false;
				}
			}
		}
	});

	variables.forEach((variable) => {
		if (!variable.active) {
			return;
		}

		if (variable.kind === 'uniform') {
			if (!shader.uniformArrays[variable.type]) {
				shader.uniformArrays[variable.type] = {
					name: variable.type + 'Uniforms',
					variables: [],
				};
			}

			const index = shader.uniformArrays[variable.type].variables.length;
			shader.uniformArrays[variable.type].variables.push(variable);

			const usageRegExp = new RegExp(`\\b${variable.name}\\b`, 'g');
			const newWriting =
				shader.uniformArrays[variable.type].name + '[' + index + ']';

			shader.commonCode = shader.commonCode.replace(usageRegExp, newWriting);

			shader.passes.forEach((pass) => {
				if (pass.fragmentCode) {
					pass.fragmentCode = pass.fragmentCode.replace(
						usageRegExp,
						newWriting
					);
				}
				if (pass.vertexCode) {
					pass.vertexCode = pass.vertexCode.replace(usageRegExp, newWriting);
				}
			});
		}
	});

	if (context.shaderMinifier) {
		await context.shaderMinifier.minify(shader);
	}

	const globalsByTypes: { [type: string]: string[] } = {};
	variables.forEach((variable) => {
		if (!variable.active) {
			return;
		}

		if (variable.kind !== 'uniform') {
			if (!globalsByTypes[variable.type]) {
				globalsByTypes[variable.type] = [];
			}

			let str = variable.minifiedName || variable.name;
			if (variable.kind === 'const') {
				str += ' = ' + variable.value;
			}
			globalsByTypes[variable.type].push(str);
		}
	});

	if (shader.glslVersion) {
		shader.prologCode = `#version ${shader.glslVersion}\n`;
	}

	shader.commonCode =
		Object.keys(shader.uniformArrays)
			.map((type) => {
				const uniformArray = shader.uniformArrays[type];
				return `uniform ${type} ${uniformArray.minifiedName ||
					uniformArray.name}[${uniformArray.variables.length}];`;
			})
			.concat(
				Object.keys(globalsByTypes).map((type) => {
					return type + ' ' + globalsByTypes[type].join(',') + ';';
				})
			)
			.join('') + shader.commonCode;

	async function addHook(name: string) {
		try {
			const hook = await readFile(
				join(config.get('directory'), config.get('demo:hooks:' + name)),
				'utf8'
			);
			return hook;
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
		}
		return undefined;
	}

	const hooks: IHooks = {
		declarations: await addHook('declarations'),
		initialize: await addHook('initialize'),
		render: await addHook('render'),
	};

	return {
		hooks,
		shader,
	};
}
