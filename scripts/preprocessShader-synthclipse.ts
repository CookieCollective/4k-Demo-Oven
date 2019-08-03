import { readFile } from 'fs-extra';
import { join } from 'path';

import { IConfig } from './config';
import { forEachMatch } from './lib';

export async function preprocessShader(config: IConfig) {
	const demoDirectory: string = config.get('directory');

	config.addGlobal(
		'vec2',
		'synth_Resolution',
		'vec2(' +
			config.getWidthUniformName() +
			', ' +
			config.getHeightUniformName() +
			')'
	);

	const shaderContents = await readFile(
		join(demoDirectory, config.get('demo:shader:filename')),
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
			if (presetMatch[2] === config.get('demo:shader:constantsPreset')) {
				presetFound = true;

				const constantRegExp = /(\w+) = <.*?> (.*)/g;
				forEachMatch(constantRegExp, presetMatch[1], (constantMatch) => {
					const name = constantMatch[1];

					// Ignore uniforms which are explicitely assigned.
					if (config.getFloatUniforms().indexOf(name) !== -1) {
						return;
					}

					const components = constantMatch[2].split(', ');
					switch (components.length) {
						case 1:
							config.addConstant('float', name, components[0]);
							break;

						case 2:
							config.addConstant(
								'vec2',
								name,
								'vec2(' + components.join(', ') + ')'
							);
							break;

						case 3:
							config.addConstant(
								'vec3',
								name,
								'vec3(' + components.join(', ') + ')'
							);
							break;

						case 4:
							config.addConstant(
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

	const beginMatch = shaderContents.match(/^\/\/\s*?START([\s\S]+)/m);
	if (!beginMatch) {
		throw new Error('Shader does not contain the magic line "// START".');
	}

	const shader = beginMatch[1]
		.replace(
			/#ifdef\s+SYNTHCLIPSE_ONLY[\s\S]*?(?:#else([\s\S]*?))?#endif/g,
			'$1'
		)
		.replace(
			/#ifndef\s+SYNTHCLIPSE_ONLY([\s\S]*?)(?:#else[\s\S]*?)?#endif/g,
			'$1'
		);

	return shader;
}
