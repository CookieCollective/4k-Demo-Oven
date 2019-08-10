import { join, sep } from 'path';

import { IContext, IDemoDefinition } from './definitions';
import { spawn } from './lib';

export async function compile(context: IContext, demo: IDemoDefinition) {
	const { config } = context;
	const { compilation } = demo;
	const buildDirectory: string = config.get('paths:build');
	const demoDirectory: string = config.get('directory');

	let outArgs = ['/OUT:' + config.get('paths:exe')];

	/*
	switch (config.get('demo:audioSynthesizer:tool') || 'none') {
		case '4klang': {
			compilation.asm.sources[join(buildDirectory, '4klang.obj')] = {
				dependencies: [join(demoDirectory, '4klang.inc')],
				source: join(config.get('tools:4klang'), '4klang.asm'),
			};

			compilation.cpp.sources[join(buildDirectory, 'audio-4klang.obj')] = {
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
			compilation.asm.sources[join(buildDirectory, '8klang.obj')] = {
				dependencies: [join(demoDirectory, '4klang.inc')],
				source: join(config.get('tools:8klang'), '4klang.asm'),
			};

			compilation.cpp.sources[join(buildDirectory, 'audio-8klang.obj')] = {
				dependencies: [
					join(demoDirectory, '4klang.inc'),
					join(demoDirectory, 'config.yml'),
					join(demoDirectory, 'config.local.yml'),
				],
				source: join('engine', 'audio-4klang.cpp'),
			};

			break;
		}

		case 'oidos': {
			await spawn(config.get('tools:python2'), [
				join(config.get('tools:oidos'), 'convert', 'OidosConvert.py'),
				join(demoDirectory, config.get('demo:audioSynthesizer:filename')),
				join(buildDirectory, 'music.asm'),
			]);

			compilation.asm.sources[join(buildDirectory, 'oidos.obj')] = {
				dependencies: [join(buildDirectory, 'music.asm')],
				source: join(config.get('tools:oidos'), 'player', 'oidos.asm'),
			};

			compilation.asm.sources[join(buildDirectory, 'random.obj')] = {
				source: join(config.get('tools:oidos'), 'player', 'random.asm'),
			};

			compilation.cpp.sources[join(buildDirectory, 'audio-oidos.obj')] = {
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
	*/

	await Promise.all([
		Promise.all(
			Object.keys(compilation.asm.sources).map((obj) => {
				const asmSource = compilation.asm.sources[obj];

				let args = compilation.asm.nasmArgs;

				if (asmSource.includes) {
					args = args.concat(asmSource.includes);
				}

				args = args.concat([
					'-f',
					'win32',
					'-i',
					buildDirectory + sep,
					'-i',
					demoDirectory + sep,
					'-o',
					obj,
					asmSource.source,
				]);

				return spawn(config.get('tools:nasm'), args);
			})
		),
		Promise.all(
			Object.keys(compilation.cpp.sources).map((obj) => {
				const cppSource = compilation.cpp.sources[obj];

				let args = compilation.cpp.clArgs;

				if (cppSource.includes) {
					args = args.concat(
						cppSource.includes.map((filename) => '/I' + filename)
					);
				}

				args = args
					.concat(config.get('cl:args'))
					.concat([
						'/I' + join(config.get('tools:glew'), 'include'),
						'/FA',
						'/Fa' + obj + '.asm',
						'/c',
						'/Fo' + obj,
						cppSource.source,
					]);

				return spawn('cl', args);
			})
		),
	]).then(() => {
		outArgs = outArgs
			.concat(Object.keys(compilation.asm.sources))
			.concat(Object.keys(compilation.cpp.sources));

		return config.get('debug')
			? spawn(
					'link',
					compilation.linkArgs
						.concat(config.get('link:args'))
						.concat([
							join(
								config.get('tools:glew'),
								'lib',
								'Release',
								'Win32',
								'glew32s.lib'
							),
						])
						.concat(outArgs)
			  )
			: spawn(
					config.get('tools:crinkler'),
					compilation.crinklerArgs
						.concat(config.get('crinkler:args'))
						.concat(['/REPORT:' + join(buildDirectory, 'stats.html')])
						.concat(outArgs)
			  );
	});
}
