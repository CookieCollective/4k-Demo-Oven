import { Provider } from 'nconf';
import { join } from 'path';

import { IAudioSynthesizer, ICompilationDefinition } from '../definitions';
import { addHooks } from '../hooks';
import { spawn } from '../lib';

export class OidosAudioSynthesizer implements IAudioSynthesizer {
	private config: Provider;

	constructor(config: Provider) {
		this.config = config;
	}

	getDefaultConfig() {
		return {
			filename: 'music.xrns',
		};
	}

	checkConfig() {
		this.config.required([
			'demo:audioSynthesizer:filename',
			'tools:oidos',
			'tools:python2',
		]);
	}

	async addToCompilation(compilation: ICompilationDefinition) {
		const buildDirectory: string = this.config.get('paths:build');
		const demoDirectory: string = this.config.get('directory');

		await addHooks(
			compilation.cpp.hooks,
			join('engine', 'audio-synthesizer-hooks', 'oidos.cpp')
		);

		compilation.cpp.clArgs.push(
			'/I' + join(this.config.get('tools:oidos'), 'player')
		);

		await spawn(this.config.get('tools:python2'), [
			join(this.config.get('tools:oidos'), 'convert', 'OidosConvert.py'),
			join(demoDirectory, this.config.get('demo:audioSynthesizer:filename')),
			join(buildDirectory, 'music.asm'),
		]);

		compilation.asm.sources[join(buildDirectory, 'oidos.obj')] = {
			dependencies: [join(buildDirectory, 'music.asm')],
			source: join(this.config.get('tools:oidos'), 'player', 'oidos.asm'),
		};

		compilation.asm.sources[join(buildDirectory, 'random.obj')] = {
			source: join(this.config.get('tools:oidos'), 'player', 'random.asm'),
		};
	}
}
