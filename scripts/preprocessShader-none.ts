import { readFile } from 'fs-extra';
import { join } from 'path';

import { IConfig } from './config';

export async function preprocessShader(config: IConfig) {
	const demoDirectory: string = config.get('directory');

	const shaderContents = await readFile(
		join(demoDirectory, config.get('demo:shader:filename')),
		'utf8'
	);

	const beginMatch = shaderContents.match(/^\/\/\s*?START([\s\S]+)/m);
	if (!beginMatch) {
		throw new Error('Shader does not contain the magic line "// START".');
	}

	const shader = beginMatch[1]
		.replace(/#ifdef\s+BUILD_ONLY([\s\S]*?)(?:#else[\s\S]*?)?#endif/g, '$1')
		.replace(/#ifndef\s+BUILD_ONLY[\s\S]*?(?:#else([\s\S]*?))?#endif/g, '$1');

	return shader;
}
