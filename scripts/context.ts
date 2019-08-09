import { pathExistsSync, statSync } from 'fs-extra';
import { Provider } from 'nconf';
import * as yaml from 'nconf-yaml';
import { dirname, join } from 'path';
import { IContext, IShaderMinifier, IShaderProvider } from './definitions';
import { ShaderMinifierShaderMinifier } from './shader-minifiers/shader-minifier';
import { SimpleShaderProvider } from './shader-providers/simple';
import { SynthclipseShaderProvider } from './shader-providers/synthclipse';

export interface IOptions {
	capture: boolean;
}

export function provideContext(options: IOptions): IContext {
	const config = new Provider();

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
			directory: {
				alias: 'dir',
				default: 'demo',
				describe: 'Home of your demo-specific files.',
				type: 'string',
			},
			execute: {
				alias: 'x',
				default: false,
				describe: 'Execute after a successful build.',
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
			server: {
				alias: 's',
				default: true,
				describe: 'Create a server for hot reloading.',
				type: 'boolean',
			},
			zip: {
				alias: 'z',
				default: false,
				describe: 'Zip the exe after a successful build.',
				type: 'boolean',
			},
		});

	const demoDirectory = config.get('directory');

	if (pathExistsSync(demoDirectory)) {
		const stats = statSync(demoDirectory);
		if (!stats.isDirectory()) {
			throw new Error('Demo directory is not a directory.');
		}
	} else {
		throw new Error('Demo directory does not exist.');
	}

	config
		.file('demo-local', {
			file: join(demoDirectory, 'config.local.yml'),
			format: yaml,
		})
		.file('local', {
			file: 'config.local.yml',
			format: yaml,
		})
		.file('demo', {
			file: join(demoDirectory, 'config.yml'),
			format: yaml,
		});

	let demoAudio = null;

	switch (config.get('demo:audio:tool')) {
		case 'oidos':
			demoAudio = {
				filename: 'music.xrns',
			};
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

		config.set('forceResolution', true);
	} else {
		if (
			config.get('demo:resolution:width') > 0 &&
			config.get('demo:resolution:height') > 0
		) {
			config.set('forceResolution', true);
		}
	}

	let shaderProvider: IShaderProvider;
	switch (config.get('demo:shaderProvider:tool') || 'simple') {
		case 'simple':
			shaderProvider = new SimpleShaderProvider(config);
			break;

		case 'synthclipse':
			shaderProvider = new SynthclipseShaderProvider(config);
			break;

		default:
			throw new Error('Config key "demo:shaderProvider:tool" is not valid.');
	}

	let shaderMinifier: IShaderMinifier | undefined;
	if (config.get('minify')) {
		switch (config.get('demo:shaderMinifier:tool') || 'shader-minifier') {
			case 'shader-minifier':
				shaderMinifier = new ShaderMinifierShaderMinifier(config);
				break;

			default:
				throw new Error('Config key "demo:shaderMinifier:tool" is not valid.');
		}
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
			audio: Object.assign(
				{
					tool: 'none', // in 4klang, 8klang, none, oidos, shader
				},
				demoAudio
			),
			closeWhenFinished: false,
			gl: {
				constants: [],
				functions: [],
			},
			hooks: {
				declarations: 'declarations.cpp',
				initialize: 'initialize.cpp',
				render: 'render.cpp',
			},
			loadingBlackScreen: false,
			// name
			resolution: {
				// height
				// scale
				// width
			},
			shaderProvider: Object.assign(
				{
					tool: 'none', // in none, synthclipse
				},
				shaderProvider.getDefaultConfig()
			),
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
		server: {
			port: 3000,
		},
		tools: {
			// 4klang
			'7z': '7z',
			// 8klang
			crinkler: 'crinkler',
			ffmpeg: 'ffmpeg',
			// glew
			mono: 'mono',
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
		'tools:glew:include',
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
			config.get('demo:audio:tool')
		) === -1
	) {
		throw new Error('Config key "demo:audio:tool" is not valid.');
	}

	switch (config.get('demo:audio:tool')) {
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

	return {
		config,
		shaderMinifier,
		shaderProvider,
	};
}
