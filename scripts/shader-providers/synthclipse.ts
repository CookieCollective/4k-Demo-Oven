import { readFile } from 'fs-extra';
import { Provider } from 'nconf';
import { join } from 'path';

import { Globals, IAnnotations, IShaderProvider } from '../definitions';
import { addConstant } from '../globals';
import { forEachMatch } from '../lib';

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

	async provide(globals: Globals) {
		const demoDirectory: string = this.config.get('directory');

		const shaderContents = await readFile(
			join(demoDirectory, this.config.get('demo:shaderProvider:filename')),
			'utf8'
		);

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
								addConstant(globals, 'float', name, components[0]);
								break;

							case 2:
								addConstant(
									globals,
									'vec2',
									name,
									'vec2(' + components.join(', ') + ')'
								);
								break;

							case 3:
								addConstant(
									globals,
									'vec3',
									name,
									'vec3(' + components.join(', ') + ')'
								);
								break;

							case 4:
								addConstant(
									globals,
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

		const startMatch = shaderContents.match(/([\s\S]+)\/\/\s*?START([\s\S]+)$/);
		if (!startMatch) {
			throw new Error('Shader does not contain the magic line "// START".');
		}

		const resolutionDot = this.config.get('forceResolution') ? '.' : '';
		const shader = startMatch[2]
			.replace(
				/#ifdef\s+SYNTHCLIPSE_ONLY[\s\S]*?(?:#else([\s\S]*?))?#endif/g,
				'$1'
			)
			.replace(
				/#ifndef\s+SYNTHCLIPSE_ONLY([\s\S]*?)(?:#else[\s\S]*?)?#endif/g,
				'$1'
			)
			.replace(/synth_Resolution\.x/g, 'resolutionWidth' + resolutionDot)
			.replace(/synth_Resolution\.y/g, 'resolutionHeight' + resolutionDot);

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

			const annotations: IAnnotations = {};
			if (variableMatch[1]) {
				annotations[variableMatch[1]] = true;
			}

			globals.push({
				annotations,
				name: variableMatch[3],
				type: variableMatch[2],
				value: variableMatch[5],
			});
		});

		globals.some((global) => {
			if (global.name === 'synth_Resolution') {
				global.annotations = {
					const: true,
				};
				global.value = 'vec2(resolutionWidth, resolutionHeight)';
				return true;
			}
			return false;
		});

		return shader;
	}
}
