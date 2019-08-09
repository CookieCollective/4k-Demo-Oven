import { stat } from 'fs-extra';
import * as notifier from 'node-notifier';
import { dirname, resolve } from 'path';

import { IContext } from './definitions';
import { spawn } from './lib';

export class Monitor {
	private context: IContext;
	private size: number = -1;

	constructor(context: IContext) {
		this.context = context;
	}

	async run(callback: () => Promise<void>) {
		try {
			const startTime = Date.now();

			await callback();

			const endTime = Date.now();

			console.log('Build successful.');
			console.log(
				`Build duration: ${((endTime - startTime) * 1e-3).toFixed(1)} seconds.`
			);
			console.log(`Demo size: ${this.size} bytes.`);
		} catch (err) {
			console.error('Build failed.');
			console.error(err);

			if (this.context.config.get('notify')) {
				notifier.notify({
					message: err.toString(),
					title: 'Build failed.',
				});
			}
		}
	}

	async notifySuccess() {
		const exePath = this.context.config.get('paths:exe');

		const stats = await stat(exePath);
		this.size = stats.size;

		if (this.context.config.get('notify')) {
			notifier.notify({
				message: this.size + ' bytes.',
				title: 'Build successful.',
				wait: true,
			});

			notifier.on('click', () => {
				spawn(resolve(exePath), [], {
					cwd: dirname(exePath),
				});
			});
		}
	}
}
