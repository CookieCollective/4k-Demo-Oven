import { pathExistsSync, statSync } from 'fs-extra';
import { Provider } from 'nconf';
import * as yaml from 'nconf-yaml';
import { dirname, join } from 'path';

import { VierKlangAudioSynthesizer } from './audio-synthesizers/4klang';
import { AchtKlangAudioSynthesizer } from './audio-synthesizers/8klang';
import { OidosAudioSynthesizer } from './audio-synthesizers/oidos';
import { RealtimeAudioSynthesizer } from './audio-synthesizers/realtime';
import {
	IAudioSynthesizer,
	IContext,
	IContextOptions,
	IShaderMinifier,
	IShaderProvider,
} from './definitions';
import { ShaderMinifierShaderMinifier } from './shader-minifiers/shader-minifier';
import { SimpleShaderProvider } from './shader-providers/simple';
import { SynthclipseShaderProvider } from './shader-providers/synthclipse';

export function provideContext(options: IContextOptions): IContext {
	const config = new Provider();

	config.set('capture', options.capture);

	config
		.use('memory')
		.env()
		.argv({
			debug: {
				alias: 'd',
				default: typeof options.debug !== 'undefined' ? options.debug : false,
				type: 'boolean',
			},
			directory: {
				alias: 'dir',
				default: 'demo',
				type: 'string',
			},
			minify: {
				alias: 'm',
				default: true,
				type: 'boolean',
			},
			notify: {
				alias: 'n',
				default: false,
				type: 'boolean',
			},
			server: {
				alias: 's',
				default: true,
				type: 'boolean',
			},
			zip: {
				alias: 'z',
				default: false,
				describe: '',
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

	if (
		config.get('demo:resolution:width') > 0 &&
		config.get('demo:resolution:height') > 0
	) {
		config.set('forceResolution', true);
	}

	let audioSynthesizer: IAudioSynthesizer | undefined;
	switch (config.get('demo:audio-synthesizer:tool') || 'realtime') {
		case '4klang':
			audioSynthesizer = new VierKlangAudioSynthesizer(config);
			break;

		case '8klang':
			audioSynthesizer = new AchtKlangAudioSynthesizer(config);
			break;

		case 'none':
			break;

		case 'oidos':
			audioSynthesizer = new OidosAudioSynthesizer(config);
			break;

		case 'realtime':
			audioSynthesizer = new RealtimeAudioSynthesizer();
			break;

		default:
			throw new Error('Config key "demo:audio-synthesizer:tool" is not valid.');
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
	}

	let shaderProvider: IShaderProvider;
	switch (config.get('demo:shader-provider:tool') || 'simple') {
		case 'simple':
			shaderProvider = new SimpleShaderProvider(config);
			break;

		case 'synthclipse':
			shaderProvider = new SynthclipseShaderProvider(config);
			break;

		default:
			throw new Error('Config key "demo:shader-provider:tool" is not valid.');
	}

	let shaderMinifier: IShaderMinifier | undefined;
	if (config.get('minify')) {
		switch (config.get('demo:shader-minifier:tool') || 'shader-minifier') {
			case 'shader-minifier':
				shaderMinifier = new ShaderMinifierShaderMinifier(config);
				break;

			default:
				throw new Error('Config key "demo:shader-minifier:tool" is not valid.');
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
			audioSynthesizer: Object.assign(
				{},
				audioSynthesizer && audioSynthesizer.getDefaultConfig()
			),
			closeWhenFinished: false,
			gl: {
				constants: [],
				functions: [],
			},
			hooks: 'hooks.cpp',
			loadingBlackScreen: false,
			// name
			resolution: {
				// height
				// scale
				// width
			},
			shaderMinifier: Object.assign(
				{},
				shaderMinifier && shaderMinifier.getDefaultConfig()
			),
			shaderProvider: Object.assign({}, shaderProvider.getDefaultConfig()),
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
		'tools:glew',
	]);

	if (options.capture) {
		config.required(['paths:frames', 'tools:ffmpeg']);
	}

	if (config.get('debug')) {
		config.required(['link:args']);
	} else {
		config.required(['crinkler:args', 'tools:crinkler']);
	}

	if (config.get('zip')) {
		config.required(['tools:7z']);
	}

	if (audioSynthesizer) {
		audioSynthesizer.checkConfig();
	}

	shaderProvider.checkConfig();

	if (shaderMinifier) {
		shaderMinifier.checkConfig();
	}

	return {
		audioSynthesizer,
		config,
		shaderMinifier,
		shaderProvider,
	};
}
