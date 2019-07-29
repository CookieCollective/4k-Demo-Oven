import { Provider as Config } from 'nconf';
import * as yaml from 'nconf-yaml';
import { dirname, join } from 'path';

export { Provider as Config } from 'nconf';

export interface IOptions {
	capture: boolean;
}

export function getConfig(options: IOptions) {
	const config: Config = new Config();

	config.set('capture', options.capture);

	config
		.use('memory')
		.env()
		.argv({
			debug: {
				alias: 'd',
				default: false,
				describe: 'Compile a debugging version.',
				type: 'boolean',
			},
			minify: {
				alias: 'm',
				default: true,
				describe: 'Minify shader.',
				type: 'boolean',
			},
			notify: {
				alias: 'n',
				default: false,
				describe: 'Display a notification when build ends.',
				type: 'boolean',
			},
			zip: {
				alias: 'z',
				default: false,
				describe: 'Zip the exe after a successful build.',
				type: 'boolean',
			},
		})
		.file('local', {
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

	if (options.capture) {
		config.overrides({
			capture: {
				fps: 60,
				height: 1080,
				width: 1920,
			},
		});
	}

	config.defaults({
		cl: {
			args: config.get('debug')
				? ['/EHsc']
				: ['/O1', '/Oi', '/Oy', '/GR-', '/GS-', '/fp:fast', '/arch:IA32'],
		},
		crinkler: {
			args: [
				'/ENTRY:main',
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
			audioTool: 'none', // or 4klang, 8klang, none, oidos, shader
			closeWhenFinished: false,
			// name
			resolution: {
				// height
				// scale
				// width
			},
		},
		link: {
			args: [
				'/SUBSYSTEM:CONSOLE',
				'/MACHINE:X86',
				'winmm.lib',
				'gdi32.lib',
				'opengl32.lib',
				'kernel32.lib',
				'user32.lib',
			],
		},
		paths: {
			build: 'build',
			get dist() {
				return dirname(config.get('paths:exe'));
			},
			exe: join('dist', config.get('demo:name') + '.exe'),
			get frames() {
				return join(config.get('paths:build'), 'frames');
			},
		},
		shader: {
			constantsPreset: 'Default',
			filename: 'shader.stoy',
			globals: {},
			time: {},
			uniforms: [],
		},
		tools: {
			// 4klang
			'7z': '7z',
			// 8klang
			crinkler: 'crinkler',
			ffmpeg: 'ffmpeg',
			nasm: 'nasm',
			// oidos
			python2: 'python',
		},
	});

	config.required([
		'cl:args',
		'demo:name',
		'paths:build',
		'paths:exe',
		'shader:constantsPreset',
		'shader:filename',
		'shader:globals',
		'shader:uniforms',
	]);

	if (options.capture) {
		config.required(['paths:frames', 'tools:ffmpeg']);
	}

	if (config.get('debug')) {
		config.required(['link:args']);
	} else {
		config.required(['crinkler:args', 'tools:crinkler']);
	}

	if (
		['4klang', '8klang', 'none', 'oidos', 'shader'].indexOf(
			config.get('demo:audioTool')
		) === -1
	) {
		throw new Error('Config key "demo:audioTool" is not valid.');
	}

	switch (config.get('demo:audioTool')) {
		case '4klang':
			config.required(['tools:4klang']);
			break;

		case '8klang':
			config.required(['tools:8klang']);
			break;

		case 'oidos':
			config.required(['tools:oidos', 'tools:python2']);
			break;
	}

	if (config.get('zip')) {
		config.required(['tools:7z']);
	}

	return config;
}
