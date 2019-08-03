import { pathExistsSync, statSync } from 'fs-extra';
import { Provider } from 'nconf';
import * as yaml from 'nconf-yaml';
import { dirname, join } from 'path';

export interface IConfig {
	addConstant(type: string, name: string, value: string): void;
	addGlobal(type: string, name: string, value?: string): void;

	addFloatUniform(name: string): void;
	getFloatUniforms(): string[];

	getHeightUniformName(): string;
	getWidthUniformName(): string;

	preprocessShader(shader: string): string;

	get(key?: string): any;
}

export interface IOptions {
	capture: boolean;
}

export function getConfig(options: IOptions): IConfig {
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

	let demoShader = null;

	switch (config.get('demo:shader:tool')) {
		case 'synthclipse':
			demoShader = {
				constantsPreset: 'Default',
				filename: 'shader.stoy',
			};
			break;

		case 'none':
		default:
			demoShader = {
				filename: 'shader.frag',
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
			// name
			resolution: {
				// height
				// scale
				// width
			},
			shader: Object.assign(
				{
					globals: {},
					tool: 'none', // in none, synthclipse
					uniforms: [],
				},
				demoShader
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
		tools: {
			// 4klang
			'7z': '7z',
			// 8klang
			crinkler: 'crinkler',
			ffmpeg: 'ffmpeg',
			// glext
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
		'tools:glext',
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

	if (['none', 'synthclipse'].indexOf(config.get('demo:shader:tool')) === -1) {
		throw new Error('Config key "demo:shader:tool" is not valid.');
	}

	if (config.get('zip')) {
		config.required(['tools:7z']);
	}

	const demoUniforms = config.get('demo:uniforms');

	const constantsMap: { [name: string]: { type: string; value: string } } = {};
	const globals = Object.assign({}, config.get('demo:globals'));
	const uniformNames: string[] = Array.isArray(demoUniforms)
		? demoUniforms.slice()
		: [];
	uniformNames.unshift('time');

	function addConstant(type: string, name: string, value: string) {
		constantsMap[name] = {
			type,
			value,
		};
	}

	function addGlobal(type: string, name: string, value?: string) {
		if (!globals[type]) {
			globals[type] = [];
		}
		if (value) {
			name += ' = ' + value;
		}
		globals[type].push(name);
	}

	let resolutionWidth: string;
	let resolutionHeight: string;
	if (config.get('capture')) {
		resolutionWidth = config.get('capture:width');
		resolutionHeight = config.get('capture:height');
		addConstant('float', 'resolutionWidth', resolutionWidth);
		addConstant('float', 'resolutionHeight', resolutionHeight);
	} else {
		if (
			config.get('demo:resolution:width') > 0 &&
			config.get('demo:resolution:height') > 0
		) {
			resolutionWidth = config.get('demo:resolution:width');
			resolutionHeight = config.get('demo:resolution:height');
			addConstant('float', 'resolutionWidth', resolutionWidth);
			addConstant('float', 'resolutionHeight', resolutionHeight);
		} else {
			resolutionWidth = 'resolutionWidth';
			resolutionHeight = 'resolutionHeight';
			uniformNames.push(resolutionWidth, resolutionHeight);
		}
	}

	return {
		addConstant,
		addGlobal,

		addFloatUniform(name) {
			uniformNames.push(name);
		},

		getFloatUniforms() {
			return uniformNames;
		},

		getHeightUniformName() {
			return resolutionHeight;
		},

		getWidthUniformName() {
			return resolutionWidth;
		},

		preprocessShader(shader: string) {
			shader = shader.replace(/\bconst\b/g, '');

			Object.keys(constantsMap).forEach((constantName) => {
				const constantEntry = constantsMap[constantName];

				const re = new RegExp('\\b' + constantName + '\\b', 'g');
				const matches = shader.match(re);
				if (matches) {
					if (matches.length > 1) {
						addGlobal(
							constantEntry.type,
							constantName + ' = ' + constantEntry.value
						);
					} else {
						shader = shader.replace(re, constantEntry.value);
					}
				}
			});

			shader = [
				config.get('demo:glslVersion')
					? '#version ' + config.get('demo:glslVersion')
					: '// No explicit version.',
				'uniform float _[' + uniformNames.length + '];',
			]
				.concat(
					Object.keys(globals).map((type) => {
						if (!globals[type] || globals[type].length === 0) {
							return '';
						}

						return type + ' ' + globals[type].join(', ') + ';';
					})
				)
				.concat([shader])
				.join('\n');

			uniformNames.forEach((name, index) => {
				const re = new RegExp('\\b' + name + '\\b', 'g');
				shader = shader.replace(re, '_[' + index + ']');
			});

			return shader;
		},

		get(key) {
			return config.get(key);
		},
	};
}
