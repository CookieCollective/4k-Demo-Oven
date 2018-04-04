#error

// Audio backends shall implement this interface.

#include <demo-data.hpp>

#ifdef CAPTURE

float audioGetDuration();

#else

void audioStart();
float audioGetTime();
bool audioIsFinished();

#endif
