import { series, watch as originalWatch } from 'gulp';
import { join, resolve } from 'path';

import { encode as originalEncode, spawnCapture } from './capture';
import { compile } from './compile';
import { getConfig } from './config';
import { IConfig } from './definitions';
import { writeDemoData, writeDemoGl } from './generate-source-codes';
import { updateShaders } from './hot-reload';
import { emptyDirectories, spawn } from './lib';
import { Monitor } from './monitor';
import { zip } from './zip';

async function internalBuild(config: IConfig) {
	await emptyDirectories(config);

	const shaderDefinition = await config.provideShaderDefinition();

	await writeDemoData(config, shaderDefinition);
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

export async function hotReload() {
	const config = getConfig({
		capture: true,
	});

	const shaderDefinition = await config.provideShaderDefinition();

	await updateShaders(config, shaderDefinition);
}

export async function showConfig() {
	const config = getConfig({
		capture: true,
	});
	console.log(config.get());
}

export function watch() {
	const config = getConfig({
		capture: false,
	});

	return originalWatch(
		[join(config.get('directory'), '**', '*').replace(/\\/g, '/')],
		hotReload
	);
}

export default build;
