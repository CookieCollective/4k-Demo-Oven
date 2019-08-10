#pragma hook declarations

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

#pragma hook initialize

frameNumber = 0;
frameBuffer = (char *)HeapAlloc(GetProcessHeap(), 0, resolutionWidth *resolutionHeight * 3 /* RGB8 */);

#pragma hook capture_time

float time = (float)frameNumber / CAPTURE_FPS;

#pragma hook capture_is_playing

((float)frameNumber / CAPTURE_FPS) < REPLACE_HOOK_AUDIO_DURATION

#pragma hook capture_frame

	glReadPixels(0, 0, resolutionWidth, resolutionHeight, GL_RGB, GL_UNSIGNED_BYTE, frameBuffer);
frameFile = CreateFile(frameFilename(frameNumber), GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_NEW, FILE_ATTRIBUTE_NORMAL, NULL);
if (frameFile)
{
	WriteFile(frameFile, frameBuffer, resolutionWidth * resolutionHeight * 3, &frameBytesWritten, NULL);
	CloseHandle(frameFile);
}
frameNumber++;
