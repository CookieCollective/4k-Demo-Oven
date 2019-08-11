#pragma hook declarations

#define SOUND_TEXTURE_SIZE 2048
#define SAMPLE_RATE 44100
#define MAX_SAMPLES (SOUND_TEXTURE_SIZE * SOUND_TEXTURE_SIZE * 2)
#define SAMPLE_TYPE float
#define FLOAT_32BIT

#include <MMSystem.h>
#include <MMReg.h>

#pragma data_seg(".var")

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

static GLuint audioTextureId;

static unsigned int fbo;

#pragma hook initialize

glGenTextures(1, &audioTextureId);
checkGLError();

glGenFramebuffers(1, &fbo);
checkGLError();

glViewport(0, 0, SOUND_TEXTURE_SIZE, SOUND_TEXTURE_SIZE);
checkGLError();

glBindFramebuffer(GL_FRAMEBUFFER, fbo);
checkGLError();

glUseProgram(programs[0]);
checkGLError();

glBindTexture(GL_TEXTURE_2D, audioTextureId);
checkGLError();

glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, SOUND_TEXTURE_SIZE, SOUND_TEXTURE_SIZE, 0, GL_RGBA, GL_FLOAT, NULL);
checkGLError();
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
checkGLError();
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, audioTextureId, 0);
checkGLError();

glRects(-1, -1, 1, 1);
checkGLError();

glReadPixels(0, 0, SOUND_TEXTURE_SIZE, SOUND_TEXTURE_SIZE, GL_RGBA, GL_FLOAT, soundBuffer);
checkGLError();

glViewport(0, 0, resolutionWidth, resolutionHeight);
checkGLError();

glFinish();
checkGLError();

glBindFramebuffer(GL_FRAMEBUFFER, 0);
checkGLError();

glUseProgram(programs[1]);
checkGLError();

glActiveTexture(GL_TEXTURE0 + 0);
checkGLError();

glBindTexture(GL_TEXTURE_2D, audioTextureId);
checkGLError();

glUniform1i(3, 0);
checkGLError();

waveOutOpen(&waveOut, WAVE_MAPPER, &waveFormat, NULL, 0, CALLBACK_NULL);
waveOutPrepareHeader(waveOut, &waveHDR, sizeof(waveHDR));
waveOutWrite(waveOut, &waveHDR, sizeof(waveHDR));

#pragma hook render

waveOutGetPosition(waveOut, &mmTime, sizeof(MMTIME));
float time = (float)mmTime.u.sample / (float)SAMPLE_RATE;

uniformTime = time;

glUniform1fv(0, FLOAT_UNIFORM_COUNT, floatUniforms);
checkGLError();

glRects(-1, -1, 1, 1);
checkGLError();

#pragma hook audio_duration

return MAX_SAMPLES / (float)SAMPLE_RATE;

#pragma hook audio_is_playing

mmTime.u.sample < MAX_SAMPLES
