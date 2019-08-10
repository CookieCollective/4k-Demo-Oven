#pragma hook declarations

#include <oidos.h>

#pragma hook audio_start

Oidos_FillRandomData();
Oidos_GenerateMusic();
Oidos_StartMusic();

#pragma hook audio_time

float time = Oidos_GetPosition() / Oidos_TicksPerSecond;

#pragma hook audio_duration

Oidos_MusicLength / Oidos_TicksPerSecond

#pragma hook audio_is_playing

					Oidos_GetPosition() <
	Oidos_MusicLength
