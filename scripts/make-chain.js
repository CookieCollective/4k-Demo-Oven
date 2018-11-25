'use strict';

const {
	ensureDir,
	readFile,
	writeFile,
} = require('fs-extra');
const {
	dirname,
	join,
	sep,
} = require('path');

const {
	spawn,
} = require('./lib');

function makeChain(config, options) {
	const uniforms = config.get('shader:uniforms');
	uniforms.unshift('time');

	let chain = ensureDir(options.buildDirectory)
		.then(() => ensureDir(dirname(options.exePath)))

		.then(() => readFile(join('demo', config.get('shader:filename')))
			.then(shaderContents => {
				shaderContents = shaderContents.toString();

				const constantsMap = {};

				const presetMatch = shaderContents.match(/\/\/!\s+<preset\s+file="(.+)"\s*\/>/);
				if (!presetMatch) {
					console.warn('Shader does not have any preset file.');
					return {
						shaderContents,
						constantsMap
					};
				}

				return readFile(join('demo', presetMatch[1]))
					.then(presetContents => {
						presetContents = presetContents.toString();

						const presetRegExp = /\/\*!([\s\S]*?<preset\s+name="(\w+?)"[\s\S]*?)\*\//g;
						let presetMatch;
						let presetFound = false;
						while ((presetMatch = presetRegExp.exec(presetContents)) !== null) {
							if (presetMatch[2] === config.get('shader:constantsPreset')) {
								presetFound = true;

								const constantRegExp = /(\w+) = <.*?> (.*)/g;
								let constantMatch;
								while ((constantMatch = constantRegExp.exec(presetMatch[1])) !== null) {
									const name = constantMatch[1];
									if (uniforms.indexOf(name) !== -1)
										continue;

									const components = constantMatch[2].split(', ');
									switch (components.length) {
									case 1:
										constantsMap[name] = {
											type: 'float',
											value: components[0],
										};
										break;

									case 2:
										constantsMap[name] = {
											type: 'vec2',
											value: 'vec2(' + components.join(', ') + ')',
										};
										break;

									case 3:
										constantsMap[name] = {
											type: 'vec3',
											value: 'vec3(' + components.join(', ') + ')',
										};
										break;

									case 4:
										constantsMap[name] = {
											type: 'vec4',
											value: 'vec4(' + components.join(', ') + ')',
										};
										break;
									}
								}
							}
						}

						if (!presetFound)
							console.warn('Preset was not found.');

						if (config.get('shader:time:beatConstant') && config.get('shader:time:bpmUniform')) {
							const bpmUniform = constantsMap[config.get('shader:time:bpmUniform')];
							if (bpmUniform) {
								constantsMap[config.get('shader:time:beatConstant')] = {
									type: 'float',
									value: 'time * ' + bpmUniform.value + ' / 60.',
								};
							} else {
								console.warn('BPM constant is not set in preset.');
							}
						}

						return {
							shaderContents,
							constantsMap
						};
					});
			})
			.then(({
				shaderContents,
				constantsMap
			}) => {
				const beginMatch = shaderContents.match(/^\/\/\s*?begin([\s\S]+)/m);
				if (!beginMatch)
					throw new Error('Shader does not contain the magic line "// begin".');

				let shader = beginMatch[1]
					.replace(/#ifdef\s+SYNTHCLIPSE_ONLY[\s\S]*?(?:#else([\s\S]*?))?#endif/g, '$1')
					.replace(/#ifndef\s+SYNTHCLIPSE_ONLY([\s\S]*?)(?:#else[\s\S]*?)?#endif/g, '$1')
					.replace(/\bconst\b/g, '');

				let globals = config.get('shader:globals') || {};

				function addGlobal(type, value) {
					if (!globals[type])
						globals[type] = [];
					globals[type].push(value);
				}

				let width, height;
				if (options.capture) {
					width = config.get('capture:width');
					height = config.get('capture:height');
				} else {
					if (config.get('demo:resolution:width') > 0 && config.get('demo:resolution:height') > 0) {
						width = config.get('demo:resolution:width');
						height = config.get('demo:resolution:height');
					} else {
						width = 'resolutionWidth';
						height = 'resolutionHeight';
						uniforms.push(width, height);
					}
				}

				addGlobal('vec2', 'synth_Resolution = vec2(' + width + ', ' + height + ')');

				Object.keys(constantsMap).forEach(constantName => {
					const constantEntry = constantsMap[constantName];

					const re = new RegExp('\\b' + constantName + '\\b', 'g');
					const matches = shader.match(re);
					if (matches) {
						if (matches.length > 1) {
							addGlobal(constantEntry.type, constantName + ' = ' + constantEntry.value);
						} else {
							shader = shader.replace(re, constantEntry.value);
						}
					}
				});

				const shaderLines = shader.split('\n');
				Object.keys(globals).forEach((type) => (globals[type] == null) && delete globals[type]);

				let newShader = [
					'//! FRAGMENT',
					config.get('demo:glslversion') ? '#version ' + config.get('demo:glslversion') : '',
					'uniform float _[' + uniforms.length + '];',
				]

					.concat(Object.keys(globals).map(type => {
						return type + ' ' + globals[type].join(', ') + ';';
					}))
					.concat(shaderLines)
					.join('\n');

				uniforms.forEach((name, index) => {
					const re = new RegExp('\\b' + name + '\\b', 'g');
					newShader = newShader.replace(re, '_[' + index + ']');
				});

				return writeFile(join(options.buildDirectory, 'shader.glsl'), newShader);
			}))

		.then(() => spawn('node', [
			join('node_modules', 'glsl-unit', 'bin', 'template_glsl_compiler.js'),
			'--input=' + join(options.buildDirectory, 'shader.glsl'),
			'--variable_renaming=INTERNAL',
			'--output=' + join(options.buildDirectory, 'shader.min.glsl'),
		]))

		.then(() => readFile(join(options.buildDirectory, options.nominify ? 'shader.glsl' : 'shader.min.glsl')))
		.then(contents => {
			let shader;

			if (options.nominify) {
				shader = contents.toString().replace(/\n/g, '\\n').replace(/"/g, '\\"');
			}
			else {
				const lines = contents.toString().split('\n');
				shader = lines[lines.length - 1];
			}

			const headerContents = [
				'static const char *shaderSource = "' + shader.replace(/\r/g, '') + '";',
				'#define UNIFORM_FLOAT_COUNT ' + uniforms.length,
				'static float uniforms[UNIFORM_FLOAT_COUNT];'
			];

			if (options.debug)
				headerContents.push(
					'#define DEBUG'
				);

			if (config.get('demo:bufferCount') && config.get('demo:bufferCount') != '0')
				headerContents.push(
					'#define BUFFERS '+config.get('demo:bufferCount')
				);

			if (config.get('demo:audioTool') == 'shader')
				headerContents.unshift(
					'#include "audio-shader.cpp"',
					'#define AUDIO_TEXTURE'
				);

			uniforms.forEach((name, index) => {
				name = name
					.replace(/^\w|\b\w/g, letter => letter.toUpperCase())
					.replace(/_+/g, '');
				headerContents.push('#define uniform' + name + ' uniforms[' + index + ']');
			});

			if (options.capture) {
				headerContents.push(
					'#define CAPTURE',
					'#define CAPTURE_FPS ' + config.get('capture:fps'),
					'#define FORCE_RESOLUTION',
					'static const constexpr int width = ' + config.get('capture:width') + ';',
					'static const constexpr int height = ' + config.get('capture:height') + ';'
				);
			} else {
				headerContents.push('void captureFrame() {}');

				if (config.get('demo:resolution:width') > 0 && config.get('demo:resolution:height') > 0) {
					headerContents.push(
						'#define FORCE_RESOLUTION',
						'static const constexpr int width = ' + config.get('demo:resolution:width') + ';',
						'static const constexpr int height = ' + config.get('demo:resolution:height') + ';'
					);
				} else {
					headerContents.push('static int width, height;');
				}

				const scale = config.get('demo:resolution:scale');
				if (scale > 0 && scale !== 1) {
					headerContents.push('#define SCALE_RESOLUTION ' + scale);
				}
			}

			if (options.capture || config.get('demo:closeWhenFinished')) {
				headerContents.push('#define CLOSE_WHEN_FINISHED');
			}

			return writeFile(join(options.buildDirectory, 'demo-data.hpp'), headerContents.join('\n'));
		});

	const asmSources = {};
	const cppSources = {};

	cppSources[join(options.buildDirectory, 'entry.obj')] = {
		source: join('engine', 'entry.cpp'),
		dependencies: [
			join(options.buildDirectory, 'demo-data.hpp'),
			join('demo', 'config.yml'),
			join('demo', 'config.local.yml'),
		],
	};

	if (options.capture) {
		cppSources[join(options.buildDirectory, 'audio-capture.obj')] = {
			source: join('engine', 'audio-capture.cpp'),
			dependencies: [
				join('demo', '4klang.inc'),
				join('demo', 'config.yml'),
				join('demo', 'config.local.yml'),
			],
		};
	}

	switch (config.get('demo:audioTool')) {
	case '4klang':
	{
		asmSources[join(options.buildDirectory, '4klang.obj')] = {
			source: join(config.get('paths:4klang'), '4klang.asm'),
			dependencies: [
				join('demo', '4klang.inc'),
			],
		};

		cppSources[join(options.buildDirectory, 'audio-4klang.obj')] = {
			source: join('engine', 'audio-4klang.cpp'),
			dependencies: [
				join('demo', '4klang.inc'),
				join('demo', 'config.yml'),
				join('demo', 'config.local.yml'),
			],
		};

		break;
	}

	case '8klang':
	{
		asmSources[join(options.buildDirectory, '8klang.obj')] = {
			source: join(config.get('paths:8klang'), '4klang.asm'),
			dependencies: [
				join('demo', '4klang.inc'),
			],
		};

		cppSources[join(options.buildDirectory, 'audio-8klang.obj')] = {
			source: join('engine', 'audio-4klang.cpp'),
			dependencies: [
				join('demo', '4klang.inc'),
				join('demo', 'config.yml'),
				join('demo', 'config.local.yml'),
			],
		};

		break;
	}

	case 'none':
	{
		cppSources[join(options.buildDirectory, 'audio-none.obj')] = {
			source: join('engine', 'audio-none.cpp'),
			dependencies: [
				join('demo', 'config.yml'),
				join('demo', 'config.local.yml'),
			],
		};

		break;
	}

	case 'oidos':
	{
		chain = chain
			.then(() => spawn(config.get('paths:python2'), [
				join(config.get('paths:oidos'), 'convert', 'OidosConvert.py'),
				join('demo', config.get('demo:audioFilename')),
				join(options.buildDirectory, 'music.asm'),
			]));

		asmSources[join(options.buildDirectory, 'oidos.obj')] = {
			source: join(config.get('paths:oidos'), 'player', 'oidos.asm'),
			dependencies: [
				join(options.buildDirectory, 'music.asm'),
			],
		};

		asmSources[join(options.buildDirectory, 'random.obj')] = {
			source: join(config.get('paths:oidos'), 'player', 'random.asm'),
		};

		cppSources[join(options.buildDirectory, 'audio-oidos.obj')] = {
			source: join('engine', 'audio-oidos.cpp'),
			dependencies: [
				join('demo', 'config.yml'),
				join('demo', 'config.local.yml'),
			],
			includes: [
				join(config.get('paths:oidos'), 'player'),
			],
		};

		break;
	}
	}

	chain = chain
		.then(() => Promise.all([
			Promise.all(Object.keys(asmSources).map(obj => spawn(config.get('paths:nasm'), [
				'-f',
				'win32',
				'-i',
				options.buildDirectory + sep,
				'-i',
				'demo' + sep,
				'-o',
				obj,
				asmSources[obj].source,
			]))),
			Promise.all(Object.keys(cppSources).map(obj => spawn('cl',
				(cppSources[obj].includes || [])
					.map(filename => '/I' + filename)
					.concat(config.get('cl:args'))
					.concat([
						'/I' + options.buildDirectory,
						'/Idemo',
						'/FA',
						'/Fa' + obj + '.asm',
						'/c',
						'/Fo' + obj,
						cppSources[obj].source,
					])))),
		]))

		.then(() => spawn(options.debug ? 'Link' : config.get('paths:crinkler'),
			(options.debug ?
				config.get('debugLinkArgs')
					.concat([
						'/OUT:' + options.exePath,
					])
				:
				config.get('crinkler:args')
					.concat([
						'/REPORT:' + join(options.buildDirectory, 'stats.html'),
						'/OUT:' + options.exePath,
					])
			)
				.concat(Object.keys(asmSources))
				.concat(Object.keys(cppSources))
		));

	return chain;
}

module.exports = makeChain;
