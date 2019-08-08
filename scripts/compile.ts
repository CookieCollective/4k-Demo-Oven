import { join, sep } from 'path';

import { IConfig } from './definitions';
import { spawn } from './lib';

interface ISource {
	dependencies?: string[];
	includes?: string[];
	source: string;
}

interface ISources {
	[objPath: string]: ISource;
}

export async function compile(config: IConfig) {
	const buildDirectory: string = config.get('paths:build');
	const demoDirectory: string = config.get('directory');

	const asmSources: ISources = {};
	const cppSources: ISources = {};

	let outArgs = ['/OUT:' + config.get('paths:exe')];

	cppSources[join(buildDirectory, 'main.obj')] = {
		dependencies: [
			join(buildDirectory, 'demo-data.hpp'),
			join(demoDirectory, 'config.yml'),
			join(demoDirectory, 'config.local.yml'),
		],
		source: join('engine', 'main.cpp'),
	};

	if (config.get('debug')) {
		cppSources[join(buildDirectory, 'debug.obj')] = {
			source: join('engine', 'debug.cpp'),
		};

		if (config.get('server')) {
			cppSources[join(buildDirectory, 'server.obj')] = {
				source: join('engine', 'server.cpp'),
			};
			outArgs.push('httpapi.lib');
		}
	}

	if (config.get('capture')) {
		cppSources[join(buildDirectory, 'audio-capture.obj')] = {
			dependencies: [
				join(demoDirectory, '4klang.inc'),
				join(demoDirectory, 'config.yml'),
				join(demoDirectory, 'config.local.yml'),
			],
			source: join('engine', 'audio-capture.cpp'),
		};
	}

	switch (config.get('demo:audio:tool')) {
		case '4klang': {
			asmSources[join(buildDirectory, '4klang.obj')] = {
				dependencies: [join(demoDirectory, '4klang.inc')],
				source: join(config.get('tools:4klang'), '4klang.asm'),
			};

			cppSources[join(buildDirectory, 'audio-4klang.obj')] = {
				dependencies: [
					join(demoDirectory, '4klang.inc'),
					join(demoDirectory, 'config.yml'),
					join(demoDirectory, 'config.local.yml'),
				],
				source: join('engine', 'audio-4klang.cpp'),
			};

			break;
		}

		case '8klang': {
			asmSources[join(buildDirectory, '8klang.obj')] = {
				dependencies: [join(demoDirectory, '4klang.inc')],
				source: join(config.get('tools:8klang'), '4klang.asm'),
			};

			cppSources[join(buildDirectory, 'audio-8klang.obj')] = {
				dependencies: [
					join(demoDirectory, '4klang.inc'),
					join(demoDirectory, 'config.yml'),
					join(demoDirectory, 'config.local.yml'),
				],
				source: join('engine', 'audio-4klang.cpp'),
			};

			break;
		}

		case 'none': {
			cppSources[join(buildDirectory, 'audio-none.obj')] = {
				dependencies: [
					join(demoDirectory, 'config.yml'),
					join(demoDirectory, 'config.local.yml'),
				],
				source: join('engine', 'audio-none.cpp'),
			};

			break;
		}

		case 'oidos': {
			await spawn(config.get('tools:python2'), [
				join(config.get('tools:oidos'), 'convert', 'OidosConvert.py'),
				join(demoDirectory, config.get('demo:audio:filename')),
				join(buildDirectory, 'music.asm'),
			]);

			asmSources[join(buildDirectory, 'oidos.obj')] = {
				dependencies: [join(buildDirectory, 'music.asm')],
				source: join(config.get('tools:oidos'), 'player', 'oidos.asm'),
			};

			asmSources[join(buildDirectory, 'random.obj')] = {
				source: join(config.get('tools:oidos'), 'player', 'random.asm'),
			};

			cppSources[join(buildDirectory, 'audio-oidos.obj')] = {
				dependencies: [
					join(demoDirectory, 'config.yml'),
					join(demoDirectory, 'config.local.yml'),
				],
				includes: [join(config.get('tools:oidos'), 'player')],
				source: join('engine', 'audio-oidos.cpp'),
			};

			break;
		}
	}

	await Promise.all([
		Promise.all(
			Object.keys(asmSources).map((obj) =>
				spawn(config.get('tools:nasm'), [
					'-f',
					'win32',
					'-i',
					buildDirectory + sep,
					'-i',
					demoDirectory + sep,
					'-o',
					obj,
					asmSources[obj].source,
				])
			)
		),
		Promise.all(
			Object.keys(cppSources).map((obj) =>
				spawn(
					'cl',
					(cppSources[obj].includes || [])
						.map((filename) => '/I' + filename)
						.concat(config.get('cl:args'))
						.concat([
							'/I' + buildDirectory,
							'/I' + config.get('tools:glew:include'),
							'/Idemo',
							'/FA',
							'/Fa' + obj + '.asm',
							'/c',
							'/Fo' + obj,
							cppSources[obj].source,
						])
				)
			)
		),
	]).then(() => {
		outArgs = outArgs
			.concat(Object.keys(asmSources))
			.concat(Object.keys(cppSources));

		return config.get('debug')
			? spawn(
					'link',
					config
						.get('link:args')
						.concat([config.get('tools:glew:lib')])
						.concat(outArgs)
			  )
			: spawn(
					config.get('tools:crinkler'),
					config
						.get('crinkler:args')
						.concat(['/REPORT:' + join(buildDirectory, 'stats.html')])
						.concat(outArgs)
			  );
	});
}
