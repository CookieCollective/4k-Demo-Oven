import { series, watch as originalWatch } from 'gulp';

import { encode as originalEncode, spawnCapture } from './capture';
import { compile } from './compile';
import { getConfig } from './config';
import { writeDemoData } from './demoData';
import { emptyDirectories } from './lib';
import { minify } from './minify-glslUnit';
import { Monitor } from './monitor';
import { preprocessShader } from './preprocessShader-synthclipse';
import { zip } from './zip';

export async function build() {
	const config = getConfig({
		capture: false,
	});

	const monitor = new Monitor(config);

	await monitor.run(async () => {
		await emptyDirectories(config);

		const { uniformNames } = await preprocessShader(config);

		await minify(config);

		await writeDemoData(config, {
			uniformNames,
		});

		await compile(config);

		await monitor.notifySuccess();

		await zip(config);
	});
}

export async function capture() {
	const config = getConfig({
		capture: true,
	});

	await emptyDirectories(config);

	const { uniformNames } = await preprocessShader(config);

	await minify(config);

	await writeDemoData(config, {
		uniformNames,
	});

	await compile(config);

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
