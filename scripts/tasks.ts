import { series, watch as originalWatch } from 'gulp';
import { join, resolve } from 'path';

import { encode as originalEncode, spawnCapture } from './capture';
import { compile } from './compile';
import { provideContext } from './context';
import { IContext } from './definitions';
import { provideDemo } from './demo';
import {
	writeDemoData,
	writeDemoGl,
	writeDemoMain,
} from './generate-source-codes';
import { updateShaders } from './hot-reload';
import { emptyDirectories, spawn } from './lib';
import { Monitor } from './monitor';
import { zip } from './zip';

async function internalBuild(context: IContext) {
	await emptyDirectories(context);

	const demo = await provideDemo(context);

	await writeDemoData(context, demo);
	await writeDemoGl(context);
	await writeDemoMain(context, demo);

	await compile(context);
}

export async function build() {
	const context = provideContext({
		capture: false,
	});

	const monitor = new Monitor(context);

	await monitor.run(async () => {
		await internalBuild(context);

		await monitor.notifySuccess();

		if (context.config.get('execute')) {
			await spawn(resolve(context.config.get('paths:exe')), []);
		}

		if (context.config.get('zip')) {
			await zip(context);
		}
	});
}

export async function capture() {
	const context = provideContext({
		capture: true,
	});

	await internalBuild(context);

	await spawnCapture(context);

	await originalEncode(context);
}

export async function clean() {
	const context = provideContext({
		capture: true,
	});

	await emptyDirectories(context);
}

export const dev = series(build, watch);

export async function encode() {
	const context = provideContext({
		capture: true,
	});

	await originalEncode(context);
}

export async function hotReload() {
	const context = provideContext({
		capture: true,
	});

	const demo = await provideDemo(context);

	await updateShaders(context, demo);
}

export async function showConfig() {
	const context = provideContext({
		capture: true,
	});
	console.log(context.config.get());
}

export function watch() {
	const context = provideContext({
		capture: false,
	});

	return originalWatch(
		[join(context.config.get('directory'), '**', '*').replace(/\\/g, '/')],
		hotReload
	);
}

export default build;
