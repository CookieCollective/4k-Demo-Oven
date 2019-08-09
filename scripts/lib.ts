import {
	spawn as originalSpawn,
	SpawnOptionsWithoutStdio,
} from 'child_process';
import { emptyDir } from 'fs-extra';

import { IContext } from './definitions';

export function emptyDirectories(context: IContext) {
	return Promise.all(
		[context.config.get('paths:build'), context.config.get('paths:dist')].map(
			(path) => emptyDir(path)
		)
	);
}

export function forEachMatch(
	regexp: RegExp,
	string: string,
	callback: (match: RegExpExecArray) => void
) {
	let match: RegExpExecArray | null = regexp.exec(string);
	while (match !== null) {
		callback(match);
		match = regexp.exec(string);
	}
}

export function spawn(
	command: string,
	args: readonly string[],
	options?: SpawnOptionsWithoutStdio
): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log(`Executing ${command} ${args.join(' ')}`);
		const cp = originalSpawn(command, args, options);

		cp.stdout.on('data', (data) => {
			console.log(data.toString());
		});

		cp.stderr.on('data', (data) => {
			console.error(data.toString());
		});

		cp.on('close', (code, signal) => {
			if (code) {
				return reject(new Error(command + ' exited with code ' + code + '.'));
			} else if (signal) {
				return reject(
					new Error(command + ' was stopped by signal ' + signal + '.')
				);
			} else {
				return resolve();
			}
		});
	});
}
