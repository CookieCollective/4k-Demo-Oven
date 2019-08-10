#pragma hook declarations

#include <limits>

#pragma hook audio_start

LARGE_INTEGER frequency;
LARGE_INTEGER startCounter;

QueryPerformanceFrequency(&frequency);
QueryPerformanceCounter(&startCounter);

#pragma hook audio_time

LARGE_INTEGER counter;
QueryPerformanceCounter(&counter);

float time = (float)(counter.QuadPart - startCounter.QuadPart) / frequency.QuadPart;

#pragma hook audio_duration

std::numeric_limits<float>::infinity()

#pragma hook audio_is_playing

	true
