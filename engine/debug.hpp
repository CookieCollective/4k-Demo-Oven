#pragma once

#ifdef DEBUG

#include <iostream>

extern char debugBuffer[4096];

extern HWND debugHwnd;

extern GLint debugFragmentShaders[PASS_COUNT];
extern GLint debugVertexShaders[PASS_COUNT];

void APIENTRY showDebugMessageFromOpenGL(
	GLenum source,
	GLenum type,
	GLuint id,
	GLenum severity,
	GLsizei length,
	const GLchar *message,
	const void *userParam);

void APIENTRY showDebugMessage(const char *message);

void _checkGLError(const char *filename, int lineNumber);

// This function can be called after a GL function to check whether an error has been raised.
#define checkGLError() _checkGLError(__FILE__, __LINE__)

void checkShaderCompilation(GLint shader);

#else

#define checkGLError()
#define checkShaderCompilation(shader)
#define showDebugMessage(...)

#endif
