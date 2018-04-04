#include <demo-data.hpp>

#include <4klang.h>

#ifdef CAPTURE

float audioGetDuration()
{
	return MAX_SAMPLES / (float)SAMPLE_RATE;
}

#else

#define WIN32_LEAN_AND_MEAN
#define WIN32_EXTRA_LEAN
#include <windows.h>

#include <MMSystem.h>
#include <MMReg.h>

static SAMPLE_TYPE soundBuffer[MAX_SAMPLES * 2];
static HWAVEOUT waveOut;

#pragma data_seg(".wavefmt")
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

#pragma data_seg(".wavehdr")
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

void audioStart()
{
	CreateThread(0, 0, (LPTHREAD_START_ROUTINE)_4klang_render, soundBuffer, 0, 0);
	waveOutOpen(&waveOut, WAVE_MAPPER, &waveFormat, NULL, 0, CALLBACK_NULL);
	waveOutPrepareHeader(waveOut, &waveHDR, sizeof(waveHDR));
	waveOutWrite(waveOut, &waveHDR, sizeof(waveHDR));
}

float audioGetTime()
{
	waveOutGetPosition(waveOut, &mmTime, sizeof(MMTIME));
	return (float)mmTime.u.sample / (float)SAMPLE_RATE;
}

bool audioIsFinished()
{
	return (mmTime.u.sample >= MAX_SAMPLES);
}

#endif
