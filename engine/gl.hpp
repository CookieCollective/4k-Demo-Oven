#pragma once

#include <GL/gl.h>

// relevant glext.h fragment
#define APIENTRYP __stdcall *
typedef char GLchar;
#define GL_FRAGMENT_SHADER 0x8B30
typedef void(APIENTRYP PFNGLATTACHSHADERPROC)(GLuint program, GLuint shader);
typedef void(APIENTRYP PFNGLCOMPILESHADERPROC)(GLuint shader);
typedef GLuint(APIENTRYP PFNGLCREATEPROGRAMPROC)(void);
typedef GLuint(APIENTRYP PFNGLCREATESHADERPROC)(GLenum type);
typedef void(APIENTRYP PFNGLLINKPROGRAMPROC)(GLuint program);
typedef void(APIENTRYP PFNGLSHADERSOURCEPROC)(GLuint shader, GLsizei count, const GLchar *const *string, const GLint *length);
typedef void(APIENTRYP PFNGLUSEPROGRAMPROC)(GLuint program);
typedef void(APIENTRYP PFNGLUNIFORM1FVPROC)(GLint location, GLsizei count, const GLfloat *value);
#ifdef DEBUG
typedef void (APIENTRYP PFNGLGETSHADERINFOLOGPROC) (GLuint shader, GLsizei bufSize, GLsizei *length, GLchar *infoLog);
typedef void (APIENTRY *GLDEBUGPROC)(GLenum source,GLenum type,GLuint id,GLenum severity,GLsizei length,const GLchar *message,const void *userParam);
typedef void (APIENTRYP PFNGLDEBUGMESSAGECALLBACKPROC) (GLDEBUGPROC callback, const void *userParam);
typedef void (APIENTRYP PFNGLDEBUGMESSAGECONTROLPROC) (GLenum source, GLenum type, GLenum severity, GLsizei count, const GLuint *ids, GLboolean enabled);
typedef GLint (APIENTRYP PFNGLGETUNIFORMLOCATIONPROC) (GLuint program, const GLchar *name);
#define GL_DEBUG_OUTPUT_SYNCHRONOUS 0x8242
#define GL_DEBUG_OUTPUT 0x92E0
#endif
// end of glext.h fragment

#define GL_EXT_FUNCTION_COUNT 8

static const char *glExtFunctionNames[] = {
	"glAttachShader",
	"glCompileShader",
	"glCreateProgram",
	"glCreateShader",
	"glLinkProgram",
	"glShaderSource",
	"glUseProgram",
	"glUniform1fv",
};

static void *glExtFunctions[GL_EXT_FUNCTION_COUNT];

#define glAttachShader ((PFNGLATTACHSHADERPROC)glExtFunctions[0])
#define glCompileShader ((PFNGLCOMPILESHADERPROC)glExtFunctions[1])
#define glCreateProgram ((PFNGLCREATEPROGRAMPROC)glExtFunctions[2])
#define glCreateShader ((PFNGLCREATESHADERPROC)glExtFunctions[3])
#define glLinkProgram ((PFNGLLINKPROGRAMPROC)glExtFunctions[4])
#define glShaderSource ((PFNGLSHADERSOURCEPROC)glExtFunctions[5])
#define glUseProgram ((PFNGLUSEPROGRAMPROC)glExtFunctions[6])
#define glUniform1fv ((PFNGLUNIFORM1FVPROC)glExtFunctions[7])
