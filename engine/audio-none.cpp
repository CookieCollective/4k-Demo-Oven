#include <demo-data.hpp>

#ifdef CAPTURE

#include <limits>

float audioGetDuration()
{
	return std::numeric_limits<float>::infinity();
}

#else

#define WIN32_LEAN_AND_MEAN
#define WIN32_EXTRA_LEAN
#include <windows.h>

static LARGE_INTEGER frequency;
static LARGE_INTEGER startTime;

void audioStart()
{
	QueryPerformanceFrequency(&frequency);
	QueryPerformanceCounter(&startTime);
}

float audioGetTime()
{
	LARGE_INTEGER time;
	QueryPerformanceCounter(&time);

	return (float)(time.QuadPart - startTime.QuadPart) / frequency.QuadPart;
}

bool audioIsFinished()
{
	return false;
}

#endif
