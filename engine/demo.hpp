#pragma once

#include "../build/demo-data.hpp"

#ifdef DEBUG

#define GLEW_STATIC
#include <GL/glew.h>
#include <GL/gl.h>

#define loadGLFunctions() \
	{ \
	GLenum err = glewInit(); \
	if (GLEW_OK != err) \
	{ \
		std::cerr << "Error: " << glewGetErrorString(err) << std::endl; \
		return; \
	} \
	}

#else

#include "../build/demo-gl.hpp"

#define loadGLFunctions() \
	for (auto i = 0; i < GL_EXT_FUNCTION_COUNT; ++i) \
	{ \
		glExtFunctions[i] = wglGetProcAddress(glExtFunctionNames[i]); \
	}

#endif
