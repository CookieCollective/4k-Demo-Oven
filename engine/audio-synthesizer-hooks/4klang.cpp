#pragma hook declarations

#include <4klang.h>

#include <MMSystem.h>
#include <MMReg.h>

#pragma data_seg(".audio")
static SAMPLE_TYPE soundBuffer[MAX_SAMPLES * 2];
static HWAVEOUT waveOut;

static const WAVEFORMATEX waveFormat = {
#ifdef FLOAT_32BIT
	WAVE_FORMAT_IEEE_FLOAT,
#else
	WAVE_FORMAT_PCM,
#endif
	2,									   // channels
	SAMPLE_RATE,						   // samples per sec
	SAMPLE_RATE * sizeof(SAMPLE_TYPE) * 2, // bytes per sec
	sizeof(SAMPLE_TYPE) * 2,			   // block alignment;
	sizeof(SAMPLE_TYPE) * 8,			   // bits per sample
	0,									   // extension not needed
};

static WAVEHDR waveHDR = {
	(LPSTR)soundBuffer,
	MAX_SAMPLES * sizeof(SAMPLE_TYPE) * 2, // MAX_SAMPLES*sizeof(float)*2(stereo)
	0,
	0,
	0,
	0,
	0,
	0,
};

static MMTIME mmTime = {
	TIME_SAMPLES,
	0,
};

#pragma hook audio_start

CreateThread(0, 0, (LPTHREAD_START_ROUTINE)_4klang_render, soundBuffer, 0, 0);
waveOutOpen(&waveOut, WAVE_MAPPER, &waveFormat, NULL, 0, CALLBACK_NULL);
waveOutPrepareHeader(waveOut, &waveHDR, sizeof(waveHDR));
waveOutWrite(waveOut, &waveHDR, sizeof(waveHDR));

#pragma hook audio_time

waveOutGetPosition(waveOut, &mmTime, sizeof(MMTIME));
float time = (float)mmTime.u.sample / (float)SAMPLE_RATE;

#pragma hook audio_duration

return MAX_SAMPLES / (float)SAMPLE_RATE;

#pragma hook audio_is_playing

mmTime.u.sample < MAX_SAMPLES
