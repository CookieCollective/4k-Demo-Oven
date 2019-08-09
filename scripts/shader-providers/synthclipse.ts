import { readFile } from 'fs-extra';
import { Provider } from 'nconf';
import { join } from 'path';

import {
	IConstVariable,
	IShaderDefinition,
	IShaderProvider,
} from '../definitions';
import { forEachMatch } from '../lib';
import { addConstant, addRegular, addUniform } from '../variables';

export class SynthclipseShaderProvider implements IShaderProvider {
	private config: Provider;

	constructor(config: Provider) {
		this.config = config;
	}

	getDefaultConfig() {
		return {
			constantsPreset: 'Default',
			filename: 'shader.stoy',
		};
	}

	checkConfig() {
		this.config.required(['demo:shaderProvider:filename']);
	}

	async provide(definition: IShaderDefinition) {
		const demoDirectory: string = this.config.get('directory');

		const shaderContents = await readFile(
			join(demoDirectory, this.config.get('demo:shaderProvider:filename')),
			'utf8'
		);

		const versionMatch = shaderContents.match(/#version (.+)$/m);
		if (versionMatch) {
			definition.glslVersion = versionMatch[1];
		}

		const presetFileMatch = shaderContents.match(
			/\/\/!\s+<preset\s+file="(.+)"\s*\/>/
		);
		if (!presetFileMatch) {
			console.warn('Shader does not have any preset file.');
		} else {
			const presetContents = await readFile(
				join(demoDirectory, presetFileMatch[1]),
				'utf8'
			);

			const presetRegExp = /\/\*!([\s\S]*?<preset\s+name="(\w+?)"[\s\S]*?)\*\//g;
			let presetFound = false;
			forEachMatch(presetRegExp, presetContents, (presetMatch) => {
				if (
					presetMatch[2] ===
					this.config.get('demo:shaderProvider:constantsPreset')
				) {
					presetFound = true;

					const constantRegExp = /(\w+) = <.*?> (.*)/g;
					forEachMatch(constantRegExp, presetMatch[1], (constantMatch) => {
						const name = constantMatch[1];

						const components = constantMatch[2].split(', ');
						switch (components.length) {
							case 1:
								addConstant(definition.variables, 'float', name, components[0]);
								break;

							case 2:
								addConstant(
									definition.variables,
									'vec2',
									name,
									'vec2(' + components.join(', ') + ')'
								);
								break;

							case 3:
								addConstant(
									definition.variables,
									'vec3',
									name,
									'vec3(' + components.join(', ') + ')'
								);
								break;

							case 4:
								addConstant(
									definition.variables,
									'vec4',
									name,
									'vec4(' + components.join(', ') + ')'
								);
								break;
						}
					});
				}
			});

			if (!presetFound) {
				console.warn('Preset was not found.');
			}
		}

		const startMatch = shaderContents.match(
			/^([\s\S]+)\/\/\s*?START([\s\S]+)$/
		);
		if (!startMatch) {
			throw new Error('Shader does not contain the magic line "// START".');
		}

		const resolutionDot = this.config.get('forceResolution') ? '.' : '';
		definition.passes.push({
			fragmentCode: startMatch[2]
				.replace(
					/#ifdef\s+SYNTHCLIPSE_ONLY[\s\S]*?(?:#else([\s\S]*?))?#endif/g,
					'$1'
				)
				.replace(
					/#ifndef\s+SYNTHCLIPSE_ONLY([\s\S]*?)(?:#else[\s\S]*?)?#endif/g,
					'$1'
				)
				.replace(/synth_Resolution\.x/g, 'resolutionWidth' + resolutionDot)
				.replace(/synth_Resolution\.y/g, 'resolutionHeight' + resolutionDot),
		});

		const variableRegExp = /(?:(const|precision|uniform)\s+)?(\w+)\s+(\w+)\s*(=\s*([^;]+))?;$/gm;
		forEachMatch(variableRegExp, startMatch[1], (variableMatch) => {
			if (variableMatch[1] === 'precision') {
				return;
			}

			if (!variableMatch[5] !== (variableMatch[1] !== 'const')) {
				throw new Error(
					`Variable "${variableMatch[3]}" has a value and is not const.`
				);
			}

			if (variableMatch[1] === 'const') {
				addConstant(
					definition.variables,
					variableMatch[2],
					variableMatch[3],
					variableMatch[5]
				);
			} else if (variableMatch[1] === 'uniform') {
				addUniform(definition.variables, variableMatch[2], variableMatch[3]);
			} else {
				addRegular(definition.variables, variableMatch[2], variableMatch[3]);
			}
		});

		let synthResolutionIndex = -1;
		if (
			definition.variables.some((variable, index) => {
				if (variable.name === 'synth_Resolution') {
					variable.kind = 'const';
					(variable as IConstVariable).value =
						'vec2(resolutionWidth, resolutionHeight)';
					synthResolutionIndex = index;

					if (!this.config.get('forceResolution')) {
						addUniform(definition.variables, 'float', 'resolutionWidth');
						addUniform(definition.variables, 'float', 'resolutionHeight');
					}
					return true;
				}
				return false;
			})
		) {
			const variables = definition.variables.splice(synthResolutionIndex, 1);
			definition.variables.unshift(variables[0]);
		}
	}
}
