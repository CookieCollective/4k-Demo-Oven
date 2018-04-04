'use strict';

const {
	Provider
} = require('nconf');
const yaml = require('nconf-yaml');

const config = new Provider();

config
	.env()
	.use('memory')
	.file('user', {
		file: 'demo/config.local.yml',
		format: yaml,
	})
	.file('global', {
		file: 'demo/config.yml',
		format: yaml,
	});

let demoAudioFilename = '';

switch (config.get('demo:audioTool')) {
case 'oidos':
	demoAudioFilename = 'music.xrns';
	break;
}

config.defaults({
	capture: {
		audioFilename: 'music.wav',
		fps: 60,
		height: 1080,
		width: 1920,
	},
	cl: {
		args: [
			'/O1',
			'/Oi',
			'/Oy',
			'/GR-',
			'/GS-',
			'/fp:fast',
			'/arch:IA32',
		]
	},
	crinkler: {
		args: [
			'/ENTRY:entry',
			'/PRIORITY:NORMAL',
			'/COMPMODE:FAST',
			'/RANGE:opengl32',
			// '/TRUNCATEFLOATS:16',
			'/UNSAFEIMPORT',
			'winmm.lib',
			'gdi32.lib',
			'opengl32.lib',
			'kernel32.lib',
			'user32.lib',
		],
	},
	demo: {
		audioFilename: demoAudioFilename,
		audioTool: 'none', // or 4klang, 8klang, oidos
		closeWhenFinished: false,
		// name
		resolution: {
			// height
			// scale
			// width
		},
		zip: true,
	},
	paths: {
		// 4klang
		'7z': '7z',
		// 8klang
		crinkler: 'crinkler',
		ffmpeg: 'ffmpeg',
		nasm: 'nasm',
		// oidos
		python2: 'python',
	},
	shader: {
		constantsPreset: 'Default',
		filename: 'shader.stoy',
		globals: {},
		time: {
			beatConstant: 'beat',
			bpmUniform: 'BPM',
		},
		uniforms: [],
	},
})
	.required([
		'cl:args',
		'crinkler:args',
		'demo:name',
		'paths:crinkler',
		'paths:ffmpeg',
		'paths:python2',
		'shader:constantsPreset',
		'shader:filename',
		'shader:globals',
		'shader:uniforms',
	]);

if ([
	'4klang',
	'8klang',
	'none',
	'oidos',
].indexOf(config.get('demo:audioTool')) === -1) {
	throw new Error('Config key "demo:audioTool" is not valid.');
}

switch (config.get('demo:audioTool')) {
case '4klang':
	config.required([
		'paths:4klang',
	]);
	break;

case '8klang':
	config.required([
		'paths:8klang',
	]);
	break;

case 'oidos':
	config.required([
		'paths:oidos',
		'paths:python2',
	]);
	demoAudioFilename = 'music.xrns';
	break;
}

if (config.get('demo:zip')) {
	config.required([
		'paths:7z',
	]);
}

module.exports = config;
