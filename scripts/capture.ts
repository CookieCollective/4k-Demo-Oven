import { emptyDir } from 'fs-extra';
import { join, resolve } from 'path';

import { Config } from './config';
import { spawn } from './lib';

export async function spawnCapture(config: Config) {
	const framesDirectory = config.get('paths:frames');

	await emptyDir(framesDirectory);

	await spawn(resolve(config.get('paths:exe')), [], {
		cwd: framesDirectory,
	});
}

export async function encode(config: Config) {
	const framesDirectory = config.get('paths:frames');

	const args = [
		'-y',
		'-f',
		'image2',
		'-r',
		config.get('capture:fps'),
		'-s',
		config.get('capture:width') + 'x' + config.get('capture:height'),
		'-pix_fmt',
		'rgb24',
		'-start_number',
		'0',
		'-i',
		join(framesDirectory, '%05d.raw'),
	];

	if (config.get('capture:audioFilename')) {
		args.push('-i', join('demo', config.get('capture:audioFilename')));
	} else {
		console.warn(
			'capture:audioFilename has not been set, video will be silent.'
		);
	}

	args.push(
		'-vf',
		'vflip',
		'-codec:v',
		'libx264',
		'-crf',
		'18',
		'-bf',
		'2',
		'-flags',
		'+cgop',
		'-pix_fmt',
		'yuv420p',
		'-codec:a',
		'aac',
		'-strict',
		'-2',
		'-b:a',
		'384k',
		'-movflags',
		'faststart',
		join(config.get('paths:dist'), config.get('demo:name') + '.mp4')
	);

	await spawn(config.get('tools:ffmpeg'), args);
}
