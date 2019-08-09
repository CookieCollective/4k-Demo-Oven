import { watch as originalWatch } from 'gulp';
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
import { updateDemo as originalUpdateDemo } from './hot-reload';
import { emptyDirectories, spawn } from './lib';
import { Monitor } from './monitor';
import { zip } from './zip';

async function buildDemo(context: IContext) {
	await emptyDirectories(context);

	const demo = await provideDemo(context);

	await writeDemoData(context, demo);
	await writeDemoGl(context);
	await writeDemoMain(context, demo);

	await compile(context);
}

async function buildWithContext(context: IContext) {
	const monitor = new Monitor(context);

	await monitor.run(async () => {
		await buildDemo(context);

		await monitor.notifySuccess();

		if (context.config.get('zip')) {
			await zip(context);
		}
	});
}

function executeWithContext(context: IContext) {
	return spawn(resolve(context.config.get('paths:exe')), []);
}

async function updateDemoWithContext(context: IContext) {
	const demo = await provideDemo(context);

	await originalUpdateDemo(context, demo);
}

function watchWithContext(context: IContext) {
	const updateDemo = () => updateDemoWithContext(context);

	return originalWatch(
		[join(context.config.get('directory'), '**', '*').replace(/\\/g, '/')],
		updateDemo
	);
}

export function build() {
	const context = provideContext({});

	return buildWithContext(context);
}

export async function capture() {
	const context = provideContext({
		capture: true,
	});

	await buildDemo(context);

	await spawnCapture(context);

	await originalEncode(context);
}

export async function clean() {
	const context = provideContext({
		capture: true,
	});

	await emptyDirectories(context);
}

export async function dev() {
	const context = provideContext({
		debug: true,
	});

	await buildWithContext(context);

	const watcher = watchWithContext(context);

	await executeWithContext(context);

	watcher.close();
}

export async function encode() {
	const context = provideContext({
		capture: true,
	});

	await originalEncode(context);
}

export function execute() {
	const context = provideContext({});

	return executeWithContext(context);
}

export async function showConfig() {
	const context = provideContext({});

	console.log(context.config.get());
}

export function watch() {
	const context = provideContext({});

	return watchWithContext(context);
}

export default async function() {
	const context = provideContext({});

	await buildWithContext(context);
	await executeWithContext(context);
}
