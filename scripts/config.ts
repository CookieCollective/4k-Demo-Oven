import { pathExistsSync, statSync } from 'fs-extra';
import { Provider } from 'nconf';
import * as yaml from 'nconf-yaml';
import { dirname, join } from 'path';

import {
	AugmentedGlobals,
	IConfig,
	IShaderDefinition,
	IShaderMinifier,
	IShaderProvider,
	IUniformArrays,
} from './definitions';
import { addConstant } from './globals';
import { ShaderMinifierShaderMinifier } from './shader-minifiers/shader-minifier';
import { SimpleShaderProvider } from './shader-providers/simple';
import { SynthclipseShaderProvider } from './shader-providers/synthclipse';

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

	const globals: AugmentedGlobals = [];

	if (config.get('capture')) {
		config.set('forceResolution', true);
		addConstant(
			globals,
			'float',
			'resolutionWidth',
			config.get('capture:width')
		);
		addConstant(
			globals,
			'float',
			'resolutionHeight',
			config.get('capture:height')
		);
	} else {
		if (
			config.get('demo:resolution:width') > 0 &&
			config.get('demo:resolution:height') > 0
		) {
			config.set('forceResolution', true);
			addConstant(
				globals,
				'float',
				'resolutionWidth',
				config.get('demo:resolution:width')
			);
			addConstant(
				globals,
				'float',
				'resolutionHeight',
				config.get('demo:resolution:height')
			);
		}
	}

	let demoAudio = null;

	switch (config.get('demo:audio:tool')) {
		case 'oidos':
			demoAudio = {
				filename: 'music.xrns',
			};
			break;
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

	let shaderMinifier: IShaderMinifier;
	switch (config.get('demo:shaderMinifier:tool') || 'shader-minifier') {
		case 'shader-minifier':
			shaderMinifier = new ShaderMinifierShaderMinifier(config);
			break;

		default:
			throw new Error('Config key "demo:shaderMinifier:tool" is not valid.');
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
			shaderProvider: Object.assign(
				{
					globals: {},
					tool: 'none', // in none, synthclipse
					uniforms: [],
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
		tools: {
			// 4klang
			'7z': '7z',
			// 8klang
			crinkler: 'crinkler',
			ffmpeg: 'ffmpeg',
			// glext
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

	if (config.get('zip')) {
		config.required(['tools:7z']);
	}

	return {
		async provideShaderDefinition() {
			let shader = await shaderProvider.provide(globals);

			globals.forEach((global) => {
				global.referencedByGlobals = [];
				global.referencesToGlobals = [];
				global.active = true;
			});

			// Find reference graph in constants.
			globals.forEach((global) => {
				const usageRegExp = new RegExp(`\\b${global.name}\\b`, 'g');

				globals.forEach((otherGlobal) => {
					if (otherGlobal.value && usageRegExp.test(otherGlobal.value)) {
						otherGlobal.referencesToGlobals.push(global);
						global.referencedByGlobals.push(otherGlobal);
					}
				});

				const shaderMatches = shader.match(usageRegExp);
				global.referencedInShader = shaderMatches
					? shaderMatches.length > 0
					: false;
			});

			// Replace constants by their value.
			const queue = globals.slice();
			while (queue.length > 0) {
				const global = queue.shift();
				if (global && global.active) {
					if (
						global.value &&
						global.referencesToGlobals.length === 0 &&
						!global.annotations.noreplace
					) {
						const value = global.value;

						console.log(
							`Replacing references to constant "${global.name}" by its value.`
						);

						const usageRegExp = new RegExp(`\\b${global.name}\\b`, 'g');

						if (global.referencedInShader) {
							shader = shader.replace(usageRegExp, value);
							global.referencedInShader = false;
						}

						global.referencedByGlobals.forEach((otherGlobal) => {
							otherGlobal.value = otherGlobal.value!.replace(
								usageRegExp,
								value
							);

							const index = otherGlobal.referencesToGlobals.indexOf(global);
							otherGlobal.referencesToGlobals.splice(index, 1);

							queue.push(otherGlobal);
						});
						global.referencedByGlobals = [];

						global.active = false;
					}
				}
			}

			// Deactivate unreferenced variables.
			globals.forEach((global) => {
				if (
					global.active &&
					!global.referencedInShader &&
					global.referencedByGlobals.length === 0
				) {
					console.log(
						`Global variable "${global.name}" is not referenced and won't be used.`
					);
					global.active = false;
				}
			});

			const globalsByTypes: { [type: string]: string[] } = {};
			const uniformArrays: IUniformArrays = {};

			globals.forEach((global) => {
				if (!global.active) {
					return;
				}

				if (global.annotations.uniform) {
					if (!uniformArrays[global.type]) {
						uniformArrays[global.type] = {
							globals: [],
							name: global.type + 'Uniforms',
						};
					}

					const index = uniformArrays[global.type].globals.length;
					uniformArrays[global.type].globals.push(global);

					const usageRegExp = new RegExp(`\\b${global.name}\\b`, 'g');
					const newWriting =
						uniformArrays[global.type].name + '[' + index + ']';

					if (global.referencedInShader) {
						shader = shader.replace(usageRegExp, newWriting);
					}

					global.referencedByGlobals.forEach((otherGlobal) => {
						otherGlobal.value = otherGlobal.value!.replace(
							usageRegExp,
							newWriting
						);
					});
				} else {
					if (!globalsByTypes[global.type]) {
						globalsByTypes[global.type] = [];
					}

					let str = global.name;
					if (global.value) {
						str += ' = ' + global.value;
					}
					globalsByTypes[global.type].push(str);
				}
			});

			shader = [
				config.get('demo:glslVersion')
					? '#version ' + config.get('demo:glslVersion')
					: '// No explicit version.',
			]
				.concat(
					Object.keys(uniformArrays).map(
						(type) =>
							`uniform ${type} ${uniformArrays[type].name}[${uniformArrays[type].globals.length}];`
					)
				)
				.concat(
					Object.keys(globalsByTypes).map((type) => {
						return type + ' ' + globalsByTypes[type].join(', ') + ';';
					})
				)
				.concat([shader])
				.join('\n');

			let definition: Readonly<IShaderDefinition> = {
				globals,
				passMainFunctionNames: config.get('demo:passes'),
				shader,
				uniformArrays,
			};

			if (config.get('minify')) {
				definition = await shaderMinifier.minify(definition);
			}

			return definition;
		},

		get(key) {
			return config.get(key);
		},
	};
}
