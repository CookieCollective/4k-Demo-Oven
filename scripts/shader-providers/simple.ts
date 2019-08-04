import { readFile } from 'fs-extra';
import { Provider } from 'nconf';
import { join } from 'path';

import { Globals, IAnnotations, IShaderProvider } from '../definitions';
import { forEachMatch } from '../lib';

export class SimpleShaderProvider implements IShaderProvider {
	private config: Provider;

	constructor(config: Provider) {
		this.config = config;
	}

	getDefaultConfig() {
		return {
			filename: 'shader.frag',
		};
	}

	async provide(globals: Globals) {
		const demoDirectory: string = this.config.get('directory');

		const shaderContents = await readFile(
			join(demoDirectory, this.config.get('demo:shaderProvider:filename')),
			'utf8'
		);

		const startMatch = shaderContents.match(/([\s\S]+)\/\/\s*?START([\s\S]+)$/);
		if (!startMatch) {
			throw new Error('Shader does not contain the magic line "// START".');
		}

		const shader = startMatch[2]
			.replace(/#ifdef\s+BUILD_ONLY([\s\S]*?)(?:#else[\s\S]*?)?#endif/g, '$1')
			.replace(/#ifndef\s+BUILD_ONLY[\s\S]*?(?:#else([\s\S]*?))?#endif/g, '$1');

		const variableRegExp = /(?:(const|precision|uniform)\s+)?(\w+)\s+(\w+)\s*(=\s*([^;]+))?;(?:\s*\/\/!(.+))?$/gm;
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

			if (variableMatch[6]) {
				const variableAnnotationRegExp = /(\w+)(?:\:(\w+))?/g;
				forEachMatch(
					variableAnnotationRegExp,
					variableMatch[6],
					(variableAnnotationMatch) => {
						annotations[variableAnnotationMatch[1]] =
							variableAnnotationMatch[2] || true;
					}
				);
			}

			globals.push({
				annotations,
				name: variableMatch[3],
				type: variableMatch[2],
				value: variableMatch[5],
			});
		});

		return shader;
	}
}
