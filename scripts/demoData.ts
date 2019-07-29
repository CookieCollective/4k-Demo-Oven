import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';

import { Config } from './config';

export interface IOptions {
	uniformNames: string[];
}

export async function writeDemoData(config: Config, options: IOptions) {
	const minify: boolean = config.get('minify');
	const buildDirectory: string = config.get('paths:build');

	const contents = await readFile(
		join(buildDirectory, minify ? 'shader.min.glsl' : 'shader.glsl')
	);
	let shader;

	if (minify) {
		const lines = contents.toString().split('\n');
		shader = lines[lines.length - 1];
	} else {
		shader = contents
			.toString()
			.replace(/\n/g, '\\n')
			.replace(/"/g, '\\"');
	}

	const headerContents = [
		'static const char *shaderSource = "' + shader.replace(/\r/g, '') + '";',
		'#define UNIFORM_FLOAT_COUNT ' + options.uniformNames.length,
		'static float uniforms[UNIFORM_FLOAT_COUNT];',
	];

	if (config.get('debug')) {
		headerContents.push('#define DEBUG');
	}

	const bufferCount = config.get('demo:bufferCount');
	if (bufferCount && bufferCount > 0) {
		headerContents.push('#define BUFFERS ' + bufferCount);
	}

	if (config.get('demo:audioTool') === 'shader') {
		headerContents.unshift(
			'#include "audio-shader.cpp"',
			'#define AUDIO_TEXTURE'
		);
	}

	options.uniformNames.forEach((name, index) => {
		name = name
			.replace(/^\w|\b\w/g, (letter) => letter.toUpperCase())
			.replace(/_+/g, '');
		headerContents.push('#define uniform' + name + ' uniforms[' + index + ']');
	});

	if (config.get('capture')) {
		headerContents.push(
			'#define CAPTURE',
			'#define CAPTURE_FPS ' + config.get('capture:fps'),
			'#define FORCE_RESOLUTION',
			'static const constexpr int width = ' + config.get('capture:width') + ';',
			'static const constexpr int height = ' +
				config.get('capture:height') +
				';'
		);
	} else {
		headerContents.push('static void captureFrame() {}');

		if (
			config.get('demo:resolution:width') > 0 &&
			config.get('demo:resolution:height') > 0
		) {
			headerContents.push(
				'#define FORCE_RESOLUTION',
				'static const constexpr int width = ' +
					config.get('demo:resolution:width') +
					';',
				'static const constexpr int height = ' +
					config.get('demo:resolution:height') +
					';'
			);
		} else {
			headerContents.push('static int width, height;');
		}

		const scale = config.get('demo:resolution:scale');
		if (scale > 0 && scale !== 1) {
			headerContents.push('#define SCALE_RESOLUTION ' + scale);
		}
	}

	if (config.get('capture') || config.get('demo:closeWhenFinished')) {
		headerContents.push('#define CLOSE_WHEN_FINISHED');
	}

	await writeFile(
		join(buildDirectory, 'demo-data.hpp'),
		headerContents.join('\n')
	);
}
