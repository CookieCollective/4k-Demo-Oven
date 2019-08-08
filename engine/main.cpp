#define WIN32_LEAN_AND_MEAN
#define WIN32_EXTRA_LEAN
#include <windows.h>

#include "demo.hpp"

#include "debug.hpp"
#include "definitions.hpp"
#include "window.hpp"

#ifdef SERVER
#include "server.hpp"
#endif

#ifdef HOOK_DECLARATIONS
HOOK_DECLARATIONS
#endif

void main()
{
#ifndef FORCE_RESOLUTION
	int resolutionWidth = GetSystemMetrics(SM_CXSCREEN);
	int resolutionHeight = GetSystemMetrics(SM_CYSCREEN);

#ifdef SCALE_RESOLUTION
	resolutionWidth *= SCALE_RESOLUTION;
	resolutionHeight *= SCALE_RESOLUTION;
#endif

#ifdef uniformResolutionWidth
	uniformResolutionWidth = (float)resolutionWidth;
#endif

#ifdef uniformResolutionHeight
	uniformResolutionHeight = (float)resolutionHeight;
#endif

#endif

	auto hwnd = CreateWindowA("static", NULL, WS_POPUP | WS_VISIBLE, 0, 0, resolutionWidth, resolutionHeight, NULL, NULL, NULL, 0);
	auto hdc = GetDC(hwnd);
	SetPixelFormat(hdc, ChoosePixelFormat(hdc, &pfd), &pfd);
	wglMakeCurrent(hdc, wglCreateContext(hdc));
	ShowCursor(FALSE);

#ifdef DEBUG
	debugHwnd = hwnd;
#endif

#ifdef LOADING_BLACK_SCREEN
	wglSwapLayerBuffers(hdc, WGL_SWAP_MAIN_PLANE);
#endif

	loadGLFunctions();

#ifdef DEBUG
	// Display Opengl info in console.
	std::cout << "OpenGL version: " << glGetString(GL_VERSION) << std::endl;
	// std::cout << "OpenGL extensions: " << glGetString(GL_EXTENSIONS) << std::endl;
	std::cout << std::endl;

	//TODO : here we set a callback function for GL to use when an error is encountered. Does not seem to work !
	/*
	glEnable(GL_DEBUG_OUTPUT);
	glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);
	glDebugMessageCallback(showDebugMessageFromOpenGL, NULL);
	glDebugMessageControl(
		GL_DONT_CARE,
		GL_DONT_CARE,
		GL_DONT_CARE,
		0,
		0,
		true);
		*/
#endif

#ifdef SERVER
	StartServerOptions startServerOptions = {};
	startServerOptions.port = SERVER_PORT;
#endif

#if PASS_COUNT == 1
	GLint program = glCreateProgram();
	checkGLError();

#ifdef HAS_SHADER_PASS_0_VERTEX_CODE
	const char *vertexShaderSources[] = {
#ifdef HAS_SHADER_PROLOG_CODE
		shaderPrologCode,
#endif
#ifdef HAS_SHADER_VERTEX_SPECIFIC_CODE
		shaderVertexSpecificCode,
#endif
#ifdef HAS_SHADER_COMMON_CODE
		shaderCommonCode,
#endif
		shaderPassCodes[0],
	};

	GLint vertexShader = glCreateShader(GL_VERTEX_SHADER);
	glShaderSource(vertexShader, sizeof(vertexShaderSources) / sizeof(vertexShaderSources[0]), vertexShaderSources, 0);
	glCompileShader(vertexShader);
	checkShaderCompilation(vertexShader);
	glAttachShader(program, vertexShader);
#endif

#ifdef HAS_SHADER_PASS_0_FRAGMENT_CODE
	const char *fragmentShaderSources[] = {
#ifdef HAS_SHADER_PROLOG_CODE
		shaderPrologCode,
#endif
#ifdef HAS_SHADER_FRAGMENT_SPECIFIC_CODE
		shaderFragmentSpecificCode,
#endif
#ifdef HAS_SHADER_COMMON_CODE
		shaderCommonCode,
#endif
		shaderPassCodes[1],
	};

	GLint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
	glShaderSource(fragmentShader, sizeof(fragmentShaderSources) / sizeof(fragmentShaderSources[0]), fragmentShaderSources, 0);
	glCompileShader(fragmentShader);
	checkShaderCompilation(fragmentShader);
	glAttachShader(program, fragmentShader);
#endif

	glLinkProgram(program);
	checkGLError();

#ifdef DEBUG
	std::cout << "Uniform locations:" << std::endl;
	DEBUG_DISPLAY_UNIFORM_LOATIONS(program);
	std::cout << std::endl;
#endif

#ifdef SERVER
	startServerOptions.programs = &program;
#endif

	glUseProgram(program);
	checkGLError();

#else
	GLint programs[PASS_COUNT];

	for (auto i = 0; i < PASS_COUNT; ++i)
	{
		programs[i] = glCreateProgram();
		checkGLError();

		if (shaderPassCodes[i * 2])
		{
			const char *vertexShaderSources[] = {
#ifdef HAS_SHADER_PROLOG_CODE
				shaderPrologCode,
#endif
#ifdef HAS_SHADER_VERTEX_SPECIFIC_CODE
				shaderVertexSpecificCode,
#endif
#ifdef HAS_SHADER_COMMON_CODE
				shaderCommonCode,
#endif
				shaderPassCodes[i * 2],
			};

			GLint vertexShader = glCreateShader(GL_VERTEX_SHADER);
			checkGLError();
			glShaderSource(vertexShader, sizeof(vertexShaderSources) / sizeof(vertexShaderSources[0]), vertexShaderSources, 0);
			checkGLError();
			glCompileShader(vertexShader);
			checkGLError();
			checkShaderCompilation(vertexShader);
			glAttachShader(programs[i], vertexShader);
			checkGLError();

#ifdef DEBUG
			debugVertexShaders[i] = vertexShader;
#endif
		}

		if (shaderPassCodes[i * 2 + 1])
		{
			const char *fragmentShaderSources[] = {
#ifdef HAS_SHADER_PROLOG_CODE
				shaderPrologCode,
#endif
#ifdef HAS_SHADER_FRAGMENT_SPECIFIC_CODE
				shaderFragmentSpecificCode,
#endif
#ifdef HAS_SHADER_COMMON_CODE
				shaderCommonCode,
#endif
				shaderPassCodes[i * 2 + 1],
			};

			GLint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
			checkGLError();
			glShaderSource(fragmentShader, sizeof(fragmentShaderSources) / sizeof(fragmentShaderSources[0]), fragmentShaderSources, 0);
			checkGLError();
			glCompileShader(fragmentShader);
			checkShaderCompilation(fragmentShader);
			glAttachShader(programs[i], fragmentShader);
			checkGLError();

#ifdef DEBUG
			debugFragmentShaders[i] = fragmentShader;
#endif
		}

		glLinkProgram(programs[i]);
		checkGLError();

#ifdef DEBUG
		std::cout << "Uniform locations in pass " << i << ":" << std::endl;
		DEBUG_DISPLAY_UNIFORM_LOATIONS(programs[i]);
		std::cout << std::endl;
#endif

#ifdef SERVER
		startServerOptions.programs = programs;
#endif
	}
#endif

#ifdef SERVER
	serverStart(startServerOptions);
#endif

#ifdef HOOK_INITIALIZE
	HOOK_INITIALIZE
#endif

	audioStart();

	do
	{
		// Avoid 'not responding' system messages.
		PeekMessage(NULL, NULL, 0, 0, PM_REMOVE);

		float time = audioGetTime();

#ifdef uniformTime
		uniformTime = time;
#endif

#ifdef HOOK_RENDER
		HOOK_RENDER
#else
		glUniform1fv(0, FLOAT_UNIFORM_COUNT, floatUniforms);
		checkGLError();

		glRects(-1, -1, 1, 1);
		checkGLError();
#endif

		captureFrame();

#ifdef SERVER
		serverUpdate();
#endif

		wglSwapLayerBuffers(hdc, WGL_SWAP_MAIN_PLANE);
	} while (
#ifdef CLOSE_WHEN_FINISHED
		!audioIsFinished() &&
#endif
		!GetAsyncKeyState(VK_ESCAPE));

#ifdef SERVER
	serverStop();
#endif

	ExitProcess(0);
}
