'use strict';

const {
	emptyDir,
	ensureDir,
} = require('fs-extra');
const {
	join,
	resolve,
} = require('path');

const {
	spawn,
} = require('./lib');

const config = require('./config');

const buildDirectory = join('build', 'capture');
const framesDirectory = join('build', 'frames');
const exePath = resolve(buildDirectory, 'capture.exe');

let chain = require('./make-chain')(config, {
	buildDirectory,
	capture: true,
	exePath,
});

chain
	.then(() => emptyDir(framesDirectory))

	.then(() => spawn(exePath, {
		cwd: framesDirectory,
	}))

	.then(() => ensureDir('dist'))

	.then(() => {
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
			args.push(
				'-i',
				join('demo', config.get('capture:audioFilename'))
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
			join('dist', config.get('demo:name') + '.mp4')
		);

		return spawn(config.get('paths:ffmpeg'), args);
	})
	.catch(console.error);
