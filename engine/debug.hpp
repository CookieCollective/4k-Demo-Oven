#pragma once

#ifdef DEBUG

#include <iostream>

static char debugBuffer[4096];

static HWND debugHwnd;

static void APIENTRY showDebugMessageFromOpenGL(
	GLenum source,
	GLenum type,
	GLuint id,
	GLenum severity,
	GLsizei length,
	const GLchar *message,
	const void *userParam)
{
#ifdef DEBUG_MESSAGE_BOX
	// TODO : find better. This disable fullscreen, this is the only solution I found to display message box on top...
	SetWindowPos(
		debugHwnd, NULL, 1, 0,
		width, height,
		SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
	MessageBox(debugHwnd, message, "Error", MB_OK | MB_TOPMOST | MB_SETFOREGROUND | MB_SYSTEMMODAL);
#endif

	fprintf(
		stderr,
		"OpenGL debug message: %s type = 0x%x, severity = 0x%x, message = %s\n",
		(type == GL_DEBUG_TYPE_ERROR ? "** GL ERROR **" : ""),
		type,
		severity,
		message);
}

static void APIENTRY showDebugMessage(const char *message)
{
	fprintf(stderr, "%s\n", message);
}

//this function can be call after a GL function to check there is no error with it
static void _checkGLError(const char *filename, int lineNumber)
{
	GLenum err = glGetError();
	if (err != GL_NO_ERROR)
	{
		char *error = nullptr;

#define ERROR_CASE(ERR) \
	case ERR:           \
		error = #ERR;   \
		break;

		switch (err)
		{
			ERROR_CASE(GL_INVALID_ENUM)
			ERROR_CASE(GL_INVALID_OPERATION)
			ERROR_CASE(GL_INVALID_VALUE)
			ERROR_CASE(GL_INVALID_FRAMEBUFFER_OPERATION_EXT)
			ERROR_CASE(GL_OUT_OF_MEMORY)
		}

#undef ERROR_CASE

		if (error != nullptr)
		{
			fprintf(stderr, "OpenGL error at %s:%d: %s\n", filename, lineNumber, error);
		}
		else
		{
			fprintf(stderr, "OpenGL error at %s:%d: 0x%x\n", filename, lineNumber, err);
		}
	}

	// ExitProcess(1);
}

#define checkGLError() _checkGLError(__FILE__, __LINE__)

static void checkShaderCompilation(GLint shader)
{
	glGetShaderInfoLog(shader, sizeof(debugBuffer), NULL, debugBuffer);
	if (debugBuffer[0] != '\0')
	{
		showDebugMessage(debugBuffer);
	}
}

#else

#define checkGLError()
#define checkShaderCompilation(shader)

#endif
