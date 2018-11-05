#pragma once

#include <GL/gl.h>

#if defined(BUFFERS) || defined(AUDIO_TEXTURE)
#define TEXTURE_NEED
#define FRAMEBUFFER_NEED
#endif

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
#ifdef FRAMEBUFFER_NEED
#define GL_FRAMEBUFFER 0x8D40
#define GL_COLOR_ATTACHMENT0 0x8CE0
#define GL_READ_FRAMEBUFFER 0x8CA8
#define GL_DRAW_FRAMEBUFFER 0x8CA9
typedef void (APIENTRYP PFNGLGENFRAMEBUFFERSEXTPROC) (GLsizei n, GLuint *framebuffers);
typedef void (APIENTRYP PFNGLBINDFRAMEBUFFEREXTPROC) (GLenum target, GLuint framebuffer);
typedef void (APIENTRYP PFNGLFRAMEBUFFERTEXTURE2DEXTPROC) (GLenum target, GLenum attachment, GLenum textarget, GLuint texture, GLint level);
typedef void (APIENTRYP PFNGLBLITFRAMEBUFFERPROC) (GLint srcX0, GLint srcY0, GLint srcX1, GLint srcY1, GLint dstX0, GLint dstY0, GLint dstX1, GLint dstY1, GLbitfield mask, GLenum filter);
#endif
#ifdef TEXTURE_NEED
#define GL_RGBA32F 0x8814
#define GL_TEXTURE0 0x84C0
typedef void (APIENTRYP PFNGLUNIFORM1IPROC) (GLint location, GLint v0);
typedef void (APIENTRYP PFNGLACTIVETEXTUREPROC) (GLenum texture);
#endif
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

#ifdef FRAMEBUFFER_NEED
#define GL_EXT_FUNCTION_COUNT 14
#elif defined(TEXTURE_NEED)
#define GL_EXT_FUNCTION_COUNT 10
#else
#define GL_EXT_FUNCTION_COUNT 8
#endif


static const char *glExtFunctionNames[] = {
	"glAttachShader",
	"glCompileShader",
	"glCreateProgram",
	"glCreateShader",
	"glLinkProgram",
	"glShaderSource",
	"glUseProgram",
	"glUniform1fv",

	#ifdef TEXTURE_NEED
	"glUniform1i",
	"glActiveTexture",
	#endif

	#ifdef FRAMEBUFFER_NEED
	"glGenFramebuffers",
	"glBindFramebuffer",
	"glFramebufferTexture2D",
	"glBlitFramebuffer",
	#endif

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

#ifdef TEXTURE_NEED
#define glUniform1i ((PFNGLUNIFORM1IPROC)glExtFunctions[8])
#define glActiveTexture ((PFNGLACTIVETEXTUREPROC)glExtFunctions[9])
#endif

#ifdef FRAMEBUFFER_NEED
#define glGenFramebuffers ((PFNGLGENFRAMEBUFFERSEXTPROC)glExtFunctions[10])
#define glBindFramebuffer ((PFNGLBINDFRAMEBUFFEREXTPROC)glExtFunctions[11])
#define glFramebufferTexture2D ((PFNGLFRAMEBUFFERTEXTURE2DEXTPROC)glExtFunctions[12])
#define glBlitFramebuffer ((PFNGLBLITFRAMEBUFFERPROC)glExtFunctions[13])
#endif
