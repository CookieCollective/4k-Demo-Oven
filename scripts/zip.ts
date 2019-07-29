import { pathExists, remove } from 'fs-extra';
import { join, resolve } from 'path';

import { Config } from './config';
import { spawn } from './lib';

export async function zip(config: Config) {
	if (config.get('zip')) {
		const szip = config.get('tools:7z');
		const distDirectory = config.get('paths:dist');
		const zipPath = resolve(distDirectory, config.get('demo:name') + '.zip');
		try {
			await remove(zipPath);

			await spawn(szip, ['a', zipPath, resolve(config.get('paths:exe'))], {
				cwd: distDirectory,
			});

			const exists = await pathExists(join('demo', 'static'));
			if (exists) {
				await spawn(szip, ['a', zipPath, '*', '-r'], {
					cwd: join('demo', 'static'),
				});
			}
		} catch (err) {
			console.error('Unable to zip the demo.');
			console.error(err);
		}
	}
}
