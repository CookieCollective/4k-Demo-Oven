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

void main()
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

#ifdef BUFFERS
  //As we use 2 textures for each buffer for each buffer, "swapped" will tell which texture to render, changes at each frame
  //dualbuffering prevents reading and writing to the same render target
	bool swapped = false; //initilization costs 13 byte :(

  //Here we create textures, you can change the size of textures, filtering, add mipmaps, to suit your need
	GLuint textureID[BUFFERS*2];
  glGenTextures(BUFFERS*2,textureID);

	for (int i=0; i<BUFFERS*2; i++)
	{
		glBindTexture(GL_TEXTURE_2D, textureID[i]);
		glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, width, height, 0, GL_RGBA, GL_FLOAT, NULL);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
		//glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
	}

  //Only one framebuffer to save line of codes, we change the render targets for each buffer in the rendering loop
#endif

#if defined(AUDIO_TEXTURE) || defined(BUFFERS)
	unsigned int fbo;
	glGenFramebuffers(1, &fbo);
#endif

#ifdef DEBUG
    //this displays the indices for each uniform, it helps if you want to hardcode indices in the render loop to save line of code for release version
    PFNGLGETUNIFORMLOCATIONPROC glGetUniformLocation = (PFNGLGETUNIFORMLOCATIONPROC)wglGetProcAddress("glGetUniformLocation");
    printf ("uniform id for _ : %ld\n", glGetUniformLocation(program,"_"));
    printf ("uniform id for PASSINDEX : %ld\n", glGetUniformLocation(program,"PASSINDEX"));
    printf ("uniform id for b0 : %ld\n", glGetUniformLocation(program,"b0"));
    printf ("uniform id for b1 : %ld\n", glGetUniformLocation(program,"b1"));
    printf ("uniform id for b2 : %ld\n", glGetUniformLocation(program,"b2"));
#endif

#ifdef AUDIO_TEXTURE

	glViewport(0,0,SOUND_TEXTURE_SIZE,SOUND_TEXTURE_SIZE);
	glBindFramebuffer (GL_FRAMEBUFFER, fbo);
	glUniform1i(0,-1); //int : (PASSINDEX)

	glBindTexture(GL_TEXTURE_2D, 1234);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, SOUND_TEXTURE_SIZE, SOUND_TEXTURE_SIZE, 0, GL_RGBA, GL_FLOAT, NULL);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
	glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, 1234, 0);

	glRects(-1, -1, 1, 1);

	glReadPixels(0,0,SOUND_TEXTURE_SIZE,SOUND_TEXTURE_SIZE,GL_RGBA,GL_FLOAT,soundBuffer);
  glViewport(0,0,width,height);
  glFinish();

#ifdef DEBUG
	for (int i=0; i<10; i++)
	   printf("sound sample[%d] L/R : %f/%f \n", i, soundBuffer[i*2], soundBuffer[i*2+1]);
#endif
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
#ifdef BUFFERS
    glBindFramebuffer (GL_FRAMEBUFFER, fbo);

		for (auto i=0; i<BUFFERS; i++)
		{
      //assign uniform value with hardcoded indices, use glGetUniformLocation is better but adds more line of codes
			//uniforms can be automatically removed if not used, thus removes/offsets all the following uniforms !
      glUniform1i(0,i); //int : (PASSINDEX)
      glUniform1fv(1, UNIFORM_FLOAT_COUNT, uniforms); // floats "_[UNIFORM_FLOAT_COUNT]"
      glUniform1i(UNIFORM_FLOAT_COUNT+1+i,i); // samplers b0, b1 ..

			glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, textureID[i*2+swapped], 0);
			glRects(-1, -1, 1, 1);

			glActiveTexture(GL_TEXTURE0 + i);
			glBindTexture(GL_TEXTURE_2D, textureID[i*2+swapped]);
		}

		swapped = !swapped;

		//blit last buffer (fbo) to the displayed frame buffer (0)
    //TODO : Blit can cost performances, better render the last buffer directly to the displayed framebuffer (0) ?
		glBindFramebuffer (GL_DRAW_FRAMEBUFFER, 0);
		glDrawBuffer      (GL_BACK);

		glBlitFramebuffer (0,0, width,height,
		                   0,0, width,height,
		                   GL_COLOR_BUFFER_BIT,
		                   GL_NEAREST);
#else
    glUniform1fv(0, UNIFORM_FLOAT_COUNT, uniforms);
		glRects(-1, -1, 1, 1);
#endif

		captureFrame();

		wglSwapLayerBuffers(hdc, WGL_SWAP_MAIN_PLANE);
	} while (
#ifdef CLOSE_WHEN_FINISHED
		!audioIsFinished() &&
#endif
		!GetAsyncKeyState(VK_ESCAPE));

	ExitProcess(0);
}
