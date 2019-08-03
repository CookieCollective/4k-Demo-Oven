import { series, watch as originalWatch } from 'gulp';
import { resolve } from 'path';

import { encode as originalEncode, spawnCapture } from './capture';
import { compile } from './compile';
import { getConfig, IConfig } from './config';
import { writeDemoData, writeDemoGl } from './generateSourceCode';
import { emptyDirectories, spawn } from './lib';
import { minify } from './minify-glslUnit';
import { Monitor } from './monitor';
import { preprocessShader as preprocessShaderNone } from './preprocessShader-none';
import { preprocessShader as preprocessShaderSynthclipse } from './preprocessShader-synthclipse';
import { zip } from './zip';

async function internalBuild(config: IConfig) {
	await emptyDirectories(config);

	let shader: string;

	switch (config.get('demo:shader:tool')) {
		case 'synthclipse':
			shader = await preprocessShaderSynthclipse(config);
			break;

		default:
			shader = await preprocessShaderNone(config);
			break;
	}

	shader = config.preprocessShader(shader);

	if (config.get('minify')) {
		shader = await minify(config, shader);
	}

	await writeDemoData(config, shader);

	await writeDemoGl(config);

	await compile(config);
}

export async function build() {
	const config = getConfig({
		capture: false,
	});

	const monitor = new Monitor(config);

	await monitor.run(async () => {
		await internalBuild(config);

		await monitor.notifySuccess();

		if (config.get('execute')) {
			await spawn(resolve(config.get('paths:exe')), []);
		}

		if (config.get('zip')) {
			await zip(config);
		}
	});
}

export async function capture() {
	const config = getConfig({
		capture: true,
	});

	await internalBuild(config);

	await spawnCapture(config);

	await originalEncode(config);
}

export async function clean() {
	const config = getConfig({
		capture: true,
	});

	await emptyDirectories(config);
}

export const dev = series(build, watch);

export async function encode() {
	const config = getConfig({
		capture: true,
	});

	await originalEncode(config);
}

export async function showConfig() {
	const config = getConfig({
		capture: true,
	});
	console.log(config.get());
}

export function watch() {
	originalWatch(['demo/**/*', 'engine/**/*'], build);
}

export default build;
