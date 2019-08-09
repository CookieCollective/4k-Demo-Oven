import { pathExists, remove, stat } from 'fs-extra';
import { join, resolve } from 'path';

import { IContext } from './definitions';
import { spawn } from './lib';

export async function zip(context: IContext) {
	const { config } = context;
	const szip = config.get('tools:7z');
	const distDirectory = config.get('paths:dist');
	const zipPath = resolve(distDirectory, config.get('demo:name') + '.zip');
	try {
		await remove(zipPath);

		await spawn(szip, ['a', zipPath, resolve(config.get('paths:exe'))], {
			cwd: distDirectory,
		});

		const staticDirectory = join(config.get('directory'), 'static');
		if (await pathExists(staticDirectory)) {
			const stats = await stat(staticDirectory);
			if (stats.isDirectory()) {
				await spawn(szip, ['a', zipPath, '*', '-r'], {
					cwd: staticDirectory,
				});
			}
		}
	} catch (err) {
		console.error('Unable to zip the demo.');
		console.error(err);
	}
}
