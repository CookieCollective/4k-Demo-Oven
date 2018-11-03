#define WIN32_LEAN_AND_MEAN
#define WIN32_EXTRA_LEAN
#include <windows.h>

#include <demo-data.hpp>

#include "gl.hpp"
#include "window.hpp"
#ifdef DEBUG
#include <iostream>
#endif

void audioStart();
float audioGetTime();
bool audioIsFinished();
void captureFrame();
HWND hwnd;

#ifdef DEBUG
void APIENTRY
MessageCallback( GLenum source,
                 GLenum type,
                 GLuint id,
                 GLenum severity,
                 GLsizei length,
                 const GLchar* message,
                 const void* userParam )
{
  SetWindowPos(hwnd, NULL, 1, 0,
             width, height,
             SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED); // TODO : find better. This disable fullscreen, this is the only solution I found to display message box on top ...
  printf("%s\n",message);
	MessageBox(hwnd, message, "Error", MB_OK | MB_TOPMOST | MB_SETFOREGROUND | MB_SYSTEMMODAL);
  //fprintf( stderr, "GL CALLBACK: %s type = 0x%x, severity = 0x%x, message = %s\n",
  //         ( type == GL_DEBUG_TYPE_ERROR ? "** GL ERROR **" : "" ),
  //         type, severity, message );
}

//this function can be call after a GL function to check there is no error with it
void CheckGLError()
{
  GLenum err = glGetError();
  if(err != GL_NO_ERROR)
  {
    char* error;

    switch(err) {
            case GL_INVALID_OPERATION:      error="INVALID_OPERATION";      break;
            case GL_INVALID_ENUM:           error="INVALID_ENUM";           break;
            case GL_INVALID_VALUE:          error="INVALID_VALUE";          break;
            case GL_OUT_OF_MEMORY:          error="OUT_OF_MEMORY";          break;
            case 0x0506:  error="INVALID_FRAMEBUFFER_OPERATION";  break;
    }
    MessageCallback(0,0,0,0,0,error,0);
  }
        ExitProcess(0);
}
#endif

void entry()
{
#ifndef FORCE_RESOLUTION
	width = GetSystemMetrics(SM_CXSCREEN);
	height = GetSystemMetrics(SM_CYSCREEN);

#ifdef SCALE_RESOLUTION
	width *= SCALE_RESOLUTION;
	height *= SCALE_RESOLUTION;
#endif
#endif

	hwnd = CreateWindow("static", NULL, WS_POPUP | WS_VISIBLE, 0, 0, width, height, NULL, NULL, NULL, 0);
	auto hdc = GetDC(hwnd);
	SetPixelFormat(hdc, ChoosePixelFormat(hdc, &pfd), &pfd);
	wglMakeCurrent(hdc, wglCreateContext(hdc));
	ShowCursor(FALSE);

	// Display a black screen while loading audio.
	wglSwapLayerBuffers(hdc, WGL_SWAP_MAIN_PLANE);

	for (auto i = 0; i < GL_EXT_FUNCTION_COUNT; ++i)
		glExtFunctions[i] = wglGetProcAddress(glExtFunctionNames[i]);

	#ifdef DEBUG
	  //display Opengl version in console
	  //we can get extensions available as well with : glGetString(GL_EXTENSIONS)
	  printf("OpenGL Version : %s\n\n",(char*)glGetString(GL_VERSION));

	  //TODO : here we set a callback function for GL to use when an error is encountered. Does not seem to work !
		glEnable(GL_DEBUG_OUTPUT);
		glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);
		GLuint unusedIds = 0;
		PFNGLDEBUGMESSAGECONTROLPROC glDebugMessageControl = (PFNGLDEBUGMESSAGECONTROLPROC)wglGetProcAddress("glDebugMessageControl");
		PFNGLDEBUGMESSAGECALLBACKPROC glDebugMessageCallback = (PFNGLDEBUGMESSAGECALLBACKPROC)wglGetProcAddress("glDebugMessageCallback");
		glDebugMessageCallback( MessageCallback, NULL );
		glDebugMessageControl(GL_DONT_CARE,
			GL_DONT_CARE,
			GL_DONT_CARE,
			0,
			&unusedIds,
			true);

	  //Gets GL API function to get shader compile errors
		PFNGLGETSHADERINFOLOGPROC glGetShaderInfoLog = (PFNGLGETSHADERINFOLOGPROC)wglGetProcAddress("glGetShaderInfoLog");
		char str[512];
	#endif

	GLint program = glCreateProgram();
	GLint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);

	glShaderSource(fragmentShader, 1, &shaderSource, 0);
#ifdef DEBUG
	glGetShaderInfoLog(fragmentShader, sizeof(str), NULL, str);
  if (str[0] != '\0')
    MessageCallback (0,0,0,0,0,str,NULL);
#endif

	glCompileShader(fragmentShader);
#ifdef DEBUG
	glGetShaderInfoLog(fragmentShader, sizeof(str), NULL, str);
  if (str[0] != '\0')
    MessageCallback (0,0,0,0,0,str,NULL);
#endif

	glAttachShader(program, fragmentShader);
	glLinkProgram(program);
	glUseProgram(program);

#ifndef FORCE_RESOLUTION
	uniformResolutionHeight = (float)height;
	uniformResolutionWidth = (float)width;
#endif

#ifdef DEBUG
    //this displays the indices for each uniform, it helps if you want to hardcode indices in the render loop to save line of code for release version
    PFNGLGETUNIFORMLOCATIONPROC glGetUniformLocation = (PFNGLGETUNIFORMLOCATIONPROC)wglGetProcAddress("glGetUniformLocation");
    printf ("uniform id for _ : %ld\n", glGetUniformLocation(program,"_"));
#endif

	audioStart();

	do
	{
		// Avoid 'not responding' system messages.
		PeekMessage(NULL, NULL, 0, 0, PM_REMOVE);

		float time = audioGetTime();

		// Set uniforms here.
		uniformTime = time;

		// Assume that the uniforms u[] will always be linked to locations [0-n].
		// Given that they are the only uniforms in the shader, it is likely to work on all drivers.
		glUniform1fv(0, UNIFORM_FLOAT_COUNT, uniforms);

		glRects(-1, -1, 1, 1);

		captureFrame();

		wglSwapLayerBuffers(hdc, WGL_SWAP_MAIN_PLANE);
	} while (
#ifdef CLOSE_WHEN_FINISHED
		!audioIsFinished() &&
#endif
		!GetAsyncKeyState(VK_ESCAPE));

	ExitProcess(0);
}
