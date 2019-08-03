#pragma once

#ifdef DEBUG
#include <iostream>

static void APIENTRY ShowDebugMessageFromOpenGL(
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
		hwnd, NULL, 1, 0,
		width, height,
		SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
	MessageBox(hwnd, message, "Error", MB_OK | MB_TOPMOST | MB_SETFOREGROUND | MB_SYSTEMMODAL);
#endif

	fprintf(
		stderr,
		"OpenGL debug message: %s type = 0x%x, severity = 0x%x, message = %s\n",
		(type == GL_DEBUG_TYPE_ERROR ? "** GL ERROR **" : ""),
		type,
		severity,
		message);
}

static void APIENTRY ShowDebugMessage(const char *message)
{
	fprintf(stderr, "%s\n", message);
}

//this function can be call after a GL function to check there is no error with it
static void CheckGLError()
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
			fprintf(stderr, "OpenGL error: %s\n", error);
		}
		else
		{
			fprintf(stderr, "OpenGL error: 0x%x\n", err);
		}
	}

	ExitProcess(0);
}
#endif