#define UNICODE
#define _WIN32_WINNT 0x0600
#define WIN32_LEAN_AND_MEAN

#include <windows.h>

#include "demo.hpp"

#include "debug.hpp"

char debugBuffer[4096];

HWND debugHwnd;

GLint debugFragmentShaders[PASS_COUNT];
GLint debugVertexShaders[PASS_COUNT];

void APIENTRY showDebugMessageFromOpenGL(
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

	std::cerr << "OpenGL debug message: ";
	if (type == GL_DEBUG_TYPE_ERROR)
	{
		std::cerr << "** GL ERROR **";
	}
	std::cerr << "type = 0x" << std::hex << type
			  << ", severity = 0x" << std::hex << severity
			  << ", message = " << message << std::endl;
}

void APIENTRY showDebugMessage(const char *message)
{
	std::cerr << message << std::endl;
}

void _checkGLError(const char *filename, int lineNumber)
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

		std::cerr << "OpenGL error at " << filename << "@" << lineNumber << ": ";
		if (error != nullptr)
		{
			std::cerr << error;
		}
		else
		{
			std::cerr << "0x" << std::hex << err;
		}
		std::cerr << std::endl;
	}

	// ExitProcess(1);
}

void checkShaderCompilation(GLint shader)
{
	glGetShaderInfoLog(shader, sizeof(debugBuffer), NULL, debugBuffer);
	if (debugBuffer[0] != '\0')
	{
		showDebugMessage(debugBuffer);
	}
}
