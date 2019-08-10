import { Provider } from 'nconf';
import { join } from 'path';

import { IAudioSynthesizer, ICompilationDefinition } from '../definitions';
import { addHooks } from '../hooks';

export class VierKlangAudioSynthesizer implements IAudioSynthesizer {
	private config: Provider;

	constructor(config: Provider) {
		this.config = config;
	}

	getDefaultConfig() {
		return {};
	}

	checkConfig() {
		this.config.required(['tools:4klang']);
	}

	async addToCompilation(compilation: ICompilationDefinition) {
		await addHooks(
			compilation.cpp.hooks,
			join('engine', 'audio-synthesizer-hooks', '4klang.cpp')
		);
	}
}
