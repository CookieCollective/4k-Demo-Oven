import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';

import { IConfig, IShaderDefinition } from './definitions';

export async function writeDemoData(
	config: IConfig,
	definition: IShaderDefinition
) {
	const buildDirectory: string = config.get('paths:build');

	const shader = definition.shader
		.replace(/\n/g, '\\n')
		.replace(/"/g, '\\"')
		.replace(/\r/g, '');

	const fileContents = [`static const char *shaderSource = "${shader}";`];

	Object.keys(definition.uniformArrays).forEach((type) => {
		const macroName = `${type.toUpperCase()}_UNIFORMS_COUNT`;
		const arrayName = `${type}Uniforms`;
		fileContents.push(
			`#define ${macroName} ${definition.uniformArrays[type].globals.length}`,
			`static ${type} ${arrayName}[${macroName}];`
		);
		definition.uniformArrays[type].globals.forEach((global, index) => {
			const name = global.name
				.replace(/^\w|\b\w/g, (letter) => letter.toUpperCase())
				.replace(/_+/g, '');
			fileContents.push(`#define uniform${name} ${arrayName}[${index}]`);
		});
	});

	if (config.get('debug')) {
		fileContents.push('#define DEBUG');
	}

	const bufferCount = config.get('demo:bufferCount');
	if (bufferCount && bufferCount > 0) {
		fileContents.push('#define BUFFERS ' + bufferCount);
	}

	if (config.get('demo:audio:tool') === 'shader') {
		fileContents.unshift(
			'#include "audio-shader.cpp"',
			'#define AUDIO_TEXTURE'
		);
	}

	if (config.get('capture')) {
		fileContents.push(
			'#define CAPTURE',
			'#define CAPTURE_FPS ' + config.get('capture:fps'),
			'#define FORCE_RESOLUTION',
			'static const constexpr int resolutionWidth = ' +
				config.get('capture:width') +
				';',
			'static const constexpr int resolutionHeight = ' +
				config.get('capture:height') +
				';'
		);
	} else {
		fileContents.push('static void captureFrame() {}');

		if (
			config.get('demo:resolution:width') > 0 &&
			config.get('demo:resolution:height') > 0
		) {
			fileContents.push(
				'#define FORCE_RESOLUTION',
				'static const constexpr int resolutionWidth = ' +
					config.get('demo:resolution:width') +
					';',
				'static const constexpr int resolutionHeight = ' +
					config.get('demo:resolution:height') +
					';'
			);
		} else {
			fileContents.push('static int resolutionWidth, resolutionHeight;');
		}

		const scale = config.get('demo:resolution:scale');
		if (scale > 0 && scale !== 1) {
			fileContents.push('#define SCALE_RESOLUTION ' + scale);
		}
	}

	if (config.get('capture') || config.get('demo:closeWhenFinished')) {
		fileContents.push('#define CLOSE_WHEN_FINISHED');
	}

	await writeFile(
		join(buildDirectory, 'demo-data.hpp'),
		fileContents.join('\n')
	);
}

export async function writeDemoGl(config: IConfig) {
	const fileContents = [
		'#include <GL/gl.h>',
		'#define APIENTRYP __stdcall *',
		'typedef char GLchar;',
		'typedef void (APIENTRY * GLDEBUGPROC)(GLenum source, GLenum type, GLuint id, GLenum severity, GLsizei length,const GLchar * message,const void * userParam);',
	];

	const glConstantNames = ['GL_FRAGMENT_SHADER'];

	const glFunctionNames = [
		'glAttachShader',
		'glCompileShader',
		'glCreateProgram',
		'glCreateShader',
		'glLinkProgram',
		'glShaderSource',
		'glUseProgram',
		'glUniform1fv',
	];

	function addGlConstantName(constantName: string) {
		if (glConstantNames.indexOf(constantName) === -1) {
			glConstantNames.push(constantName);
		}
	}

	function addGlFunctionName(functionName: string) {
		if (glFunctionNames.indexOf(functionName) === -1) {
			glFunctionNames.push(functionName);
		}
	}

	if (config.get('debug')) {
		[
			'GL_DEBUG_OUTPUT',
			'GL_DEBUG_OUTPUT_SYNCHRONOUS',
			'GL_DEBUG_TYPE_ERROR',
			'GL_INVALID_FRAMEBUFFER_OPERATION_EXT',
		].forEach(addGlConstantName);

		[
			'glDebugMessageControl',
			'glDebugMessageCallback',
			'glGetShaderInfoLog',
			'glGetUniformLocation',
		].forEach(addGlFunctionName);
	}

	function addFromConfig(key: string, action: (name: string) => void) {
		const value = config.get(key);
		if (Array.isArray(value)) {
			value.forEach(action);
		}
	}

	addFromConfig('demo:gl:constants', addGlConstantName);
	addFromConfig('demo:gl:functions', addGlFunctionName);

	const glextContents = await readFile(config.get('tools:glext'), 'utf8');

	glConstantNames.forEach((constantName: string) => {
		const match = glextContents.match(
			new RegExp(`^#define ${constantName} .+$`, 'gm')
		);
		if (match) {
			fileContents.push(match[0]);
		} else {
			console.warn(`OpenGL constant ${constantName} does not seem to exist.`);
		}
	});

	const glExtFunctionNames: string[] = [];

	glFunctionNames.forEach((functionName, index) => {
		const typedefName = 'PFN' + functionName.toUpperCase() + 'PROC';
		const match = glextContents.match(
			new RegExp(`^typedef \\w+ ?\\(APIENTRYP ${typedefName}\\).+$`, 'gm')
		);
		if (match) {
			fileContents.push(
				match[0],
				`#define ${functionName} ((${typedefName})glExtFunctions[${index}])`
			);
			glExtFunctionNames.push(`"${functionName}"`);
		} else {
			console.warn(`OpenGL function ${functionName} does not seem to exist.`);
			glExtFunctionNames.push(`0`);
		}
	});

	fileContents.push(
		'#define GL_EXT_FUNCTION_COUNT ' + glExtFunctionNames.length,
		'static const char *glExtFunctionNames[GL_EXT_FUNCTION_COUNT] = { ' +
			glExtFunctionNames.join(', ') +
			' };',
		'static void *glExtFunctions[GL_EXT_FUNCTION_COUNT];'
	);

	const buildDirectory: string = config.get('paths:build');

	await writeFile(join(buildDirectory, 'demo-gl.hpp'), fileContents.join('\n'));
}
