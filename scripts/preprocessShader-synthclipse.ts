import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';

import { Config } from './config';
import { forEachMatch } from './lib';

export async function preprocessShader(config: Config) {
	const uniformNames: string[] = config.get('shader:uniforms').slice();
	uniformNames.unshift('time');

	const shaderContents = await readFile(
		join('demo', config.get('shader:filename')),
		'utf8'
	);

	const constantsMap: any = {};

	const presetFileMatch = shaderContents.match(
		/\/\/!\s+<preset\s+file="(.+)"\s*\/>/
	);
	if (!presetFileMatch) {
		console.warn('Shader does not have any preset file.');
	} else {
		const presetContents = await readFile(
			join('demo', presetFileMatch[1]),
			'utf8'
		);

		const presetRegExp = /\/\*!([\s\S]*?<preset\s+name="(\w+?)"[\s\S]*?)\*\//g;
		let presetFound = false;
		forEachMatch(presetRegExp, presetContents, (presetMatch) => {
			if (presetMatch[2] === config.get('shader:constantsPreset')) {
				presetFound = true;

				const constantRegExp = /(\w+) = <.*?> (.*)/g;
				forEachMatch(constantRegExp, presetMatch[1], (constantMatch) => {
					const name = constantMatch[1];

					// Ignore uniforms which are explicitely assigned.
					if (uniformNames.indexOf(name) !== -1) {
						return;
					}

					const components = constantMatch[2].split(', ');
					switch (components.length) {
						case 1:
							constantsMap[name] = {
								type: 'float',
								value: components[0],
							};
							break;

						case 2:
							constantsMap[name] = {
								type: 'vec2',
								value: 'vec2(' + components.join(', ') + ')',
							};
							break;

						case 3:
							constantsMap[name] = {
								type: 'vec3',
								value: 'vec3(' + components.join(', ') + ')',
							};
							break;

						case 4:
							constantsMap[name] = {
								type: 'vec4',
								value: 'vec4(' + components.join(', ') + ')',
							};
							break;
					}
				});
			}
		});

		if (!presetFound) {
			console.warn('Preset was not found.');
		}
	}

	const beginMatch = shaderContents.match(/^\/\/\s*?begin([\s\S]+)/m);
	if (!beginMatch) {
		throw new Error('Shader does not contain the magic line "// begin".');
	}

	let shader = beginMatch[1]
		.replace(
			/#ifdef\s+SYNTHCLIPSE_ONLY[\s\S]*?(?:#else([\s\S]*?))?#endif/g,
			'$1'
		)
		.replace(
			/#ifndef\s+SYNTHCLIPSE_ONLY([\s\S]*?)(?:#else[\s\S]*?)?#endif/g,
			'$1'
		)
		.replace(/\bconst\b/g, '');

	const globals = config.get('shader:globals') || {};

	function addGlobal(type: string, value: string) {
		if (!globals[type]) {
			globals[type] = [];
		}
		globals[type].push(value);
	}

	let width: string;
	let height: string;
	if (config.get('capture')) {
		width = config.get('capture:width');
		height = config.get('capture:height');
	} else {
		if (
			config.get('demo:resolution:width') > 0 &&
			config.get('demo:resolution:height') > 0
		) {
			width = config.get('demo:resolution:width');
			height = config.get('demo:resolution:height');
		} else {
			width = 'resolutionWidth';
			height = 'resolutionHeight';
			uniformNames.push(width, height);
		}
	}

	addGlobal('vec2', 'synth_Resolution = vec2(' + width + ', ' + height + ')');

	Object.keys(constantsMap).forEach((constantName) => {
		const constantEntry = constantsMap[constantName];

		const re = new RegExp('\\b' + constantName + '\\b', 'g');
		const matches = shader.match(re);
		if (matches) {
			if (matches.length > 1) {
				addGlobal(
					constantEntry.type,
					constantName + ' = ' + constantEntry.value
				);
			} else {
				shader = shader.replace(re, constantEntry.value);
			}
		}
	});

	const shaderLines = shader.split('\n');

	let newShader = [
		'//! FRAGMENT',
		config.get('demo:glslversion')
			? '#version ' + config.get('demo:glslversion')
			: '',
		'uniform float _[' + uniformNames.length + '];',
	]
		.concat(
			Object.keys(globals).map((type) => {
				if (!globals[type] || globals[type].length === 0) {
					return '';
				}

				return type + ' ' + globals[type].join(', ') + ';';
			})
		)
		.concat(shaderLines)
		.join('\n');

	uniformNames.forEach((name, index) => {
		const re = new RegExp('\\b' + name + '\\b', 'g');
		newShader = newShader.replace(re, '_[' + index + ']');
	});

	await writeFile(join(config.get('paths:build'), 'shader.glsl'), newShader);

	return {
		uniformNames,
	};
}
