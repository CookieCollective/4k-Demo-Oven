#include <demo-data.hpp>

#include <oidos.h>

#ifdef CAPTURE

float audioGetDuration()
{
	return Oidos_MusicLength / Oidos_TicksPerSecond;
}

#else

void audioStart()
{
	Oidos_FillRandomData();
	Oidos_GenerateMusic();
	Oidos_StartMusic();
}

float audioGetTime()
{
	return Oidos_GetPosition() / Oidos_TicksPerSecond;
}

bool audioIsFinished()
{
	return Oidos_GetPosition() >= Oidos_MusicLength;
}

#endif
