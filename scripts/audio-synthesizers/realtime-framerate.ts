import { Provider } from 'nconf';
import { join } from 'path';

import { IAudioSynthesizer, ICompilationDefinition } from '../definitions';
import { addHooks } from '../hooks';

export class RealtimeFramerateAudioSynthesizer implements IAudioSynthesizer {
	private config: Provider;

	constructor(config: Provider) {
		this.config = config;
	}

	getDefaultConfig() {
		return {};
	}

	checkConfig() {
		// Fine.
		this.config.required([]);
	}

	async addToCompilation(compilation: ICompilationDefinition) {
		await addHooks(
			compilation.cpp.hooks,
			join('engine', 'audio-synthesizer-hooks', 'realtime-framerate.cpp')
		);
	}
}
