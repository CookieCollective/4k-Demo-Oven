import { join } from 'path';

import { IAudioSynthesizer, ICompilationDefinition } from '../definitions';
import { addHooks } from '../hooks';

export class RealtimeAudioSynthesizer implements IAudioSynthesizer {
	getDefaultConfig() {
		return {};
	}

	checkConfig() {
		// Fine.
	}

	async addToCompilation(compilation: ICompilationDefinition) {
		await addHooks(
			compilation.cpp.hooks,
			join('engine', 'audio-synthesizer-hooks', 'realtime.cpp')
		);
	}
}
