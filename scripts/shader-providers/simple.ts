import { readFile } from 'fs-extra';
import { Provider } from 'nconf';
import { join } from 'path';

import {
	IAnnotations,
	IShaderDefinition,
	IShaderProvider,
} from '../definitions';
import { forEachMatch } from '../lib';
import { addConstant, addRegular, addUniform } from '../variables';

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

	checkConfig() {
		this.config.required(['demo:shader-provider:filename']);
	}

	async provide(definition: IShaderDefinition) {
		const demoDirectory: string = this.config.get('directory');

		const shaderContents = await readFile(
			join(demoDirectory, this.config.get('demo:shader-provider:filename')),
			'utf8'
		);

		const versionMatch = shaderContents.match(/#version (.+)$/m);
		if (versionMatch) {
			definition.glslVersion = versionMatch[1];
		}

		let prologCode = '';

		type IPartAction = (code: string) => void;
		let partStartIndex = 0;
		let partAction: IPartAction = (code) => {
			prologCode = code;
		};

		function takePart(partEndIndex?: number) {
			if (partAction) {
				const code = shaderContents
					.substring(partStartIndex, partEndIndex)
					.replace(
						/#ifdef\s+BUILD_ONLY([\s\S]*?)(?:#else[\s\S]*?)?#endif/g,
						'$1'
					)
					.replace(
						/#ifndef\s+BUILD_ONLY[\s\S]*?(?:#else([\s\S]*?))?#endif/g,
						'$1'
					)
					.replace(/void main\w+\(\)/g, 'void main()');

				partAction(code);
			}
		}

		function ensurePassesHasIndex(index: number) {
			while (definition.passes.length <= index) {
				definition.passes.push({});
			}
		}

		const partsRegExp = /^#pragma\s+(.+)\s+$/gm;
		forEachMatch(partsRegExp, shaderContents, (match) => {
			function innerTakePart(newPartAction: IPartAction) {
				takePart(match.index);
				partStartIndex = partsRegExp.lastIndex;
				partAction = newPartAction;
			}

			switch (match[1]) {
				case 'attributes':
					innerTakePart((code) => {
						definition.attributesCode = code;
					});
					break;

				case 'common':
					innerTakePart((code) => {
						definition.commonCode = code;
					});
					break;

				case 'outputs':
					innerTakePart((code) => {
						definition.outputsCode = code;
					});
					break;

				case 'varyings':
					innerTakePart((code) => {
						definition.varyingsCode = code;
					});
					break;
			}

			const vertexMatch = match[1].match(/^vertex (\d+)$/);
			if (vertexMatch) {
				const passIndex = parseInt(vertexMatch[1], 10);
				ensurePassesHasIndex(passIndex);
				innerTakePart((code) => {
					definition.passes[passIndex].vertexCode = code;
				});
			}

			const fragmentMatch = match[1].match(/^fragment (\d+)$/);
			if (fragmentMatch) {
				const passIndex = parseInt(fragmentMatch[1], 10);
				ensurePassesHasIndex(passIndex);
				innerTakePart((code) => {
					definition.passes[passIndex].fragmentCode = code;
				});
			}
		});

		takePart();

		const variableRegExp = /(?:(const|precision|uniform)\s+)?(\w+)\s+(\w+)\s*(=\s*([^;]+))?;(?:\s*\/\/!(.+))?$/gm;
		forEachMatch(variableRegExp, prologCode, (variableMatch) => {
			if (variableMatch[1] === 'precision') {
				return;
			}

			if (!variableMatch[5] !== (variableMatch[1] !== 'const')) {
				throw new Error(
					`Variable "${variableMatch[3]}" has a value and is not const.`
				);
			}

			const annotations: IAnnotations = {};

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
	}
}
