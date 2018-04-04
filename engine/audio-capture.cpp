#define WIN32_LEAN_AND_MEAN
#define WIN32_EXTRA_LEAN
#include <windows.h>

#include <demo-data.hpp>

#include <GL/gl.h>

static int frameNumber;
static HANDLE frameFile;
static DWORD frameBytesWritten;
static char *frameBuffer;

static char *frameFilename(int n)
{
	static char *name = "00000.raw";
	char *ptr = name + 4;

	while (n > 0)
	{
		*ptr-- = (n - (n / 10) * 10) + '0';
		n /= 10;
	}

	return name;
}

void audioStart()
{
	frameNumber = 0;
	frameBuffer = (char *)HeapAlloc(GetProcessHeap(), 0, width * height * 3 /* RGB8 */);
}

float audioGetTime()
{
	return (float)frameNumber / CAPTURE_FPS;
}

float audioGetDuration();

bool audioIsFinished()
{
	return audioGetTime() >= audioGetDuration();
}

void captureFrame()
{
	glReadPixels(0, 0, width, height, GL_RGB, GL_UNSIGNED_BYTE, frameBuffer);
	frameFile = CreateFile(frameFilename(frameNumber), GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_NEW, FILE_ATTRIBUTE_NORMAL, NULL);
	if (frameFile)
	{
		WriteFile(frameFile, frameBuffer, width * height * 3, &frameBytesWritten, NULL);
		CloseHandle(frameFile);
	}
	frameNumber++;
}
