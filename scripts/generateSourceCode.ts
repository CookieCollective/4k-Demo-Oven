import { copy, readFile, writeFile } from 'fs-extra';
import { join } from 'path';

import { IConfig, IShaderDefinition } from './definitions';
import { forEachMatch } from './lib';

export async function writeDemoData(
	config: IConfig,
	definition: IShaderDefinition
) {
	const buildDirectory: string = config.get('paths:build');

	function escape(str: string) {
		return str
			.replace(/\n/g, '\\n')
			.replace(/\r/g, '')
			.replace(/"/g, '\\"');
	}

	const fileContents = ['#pragma once', ''];

	if (config.get('debug')) {
		fileContents.push('#define DEBUG', '');
	}

	Object.keys(definition.uniformArrays).forEach((type) => {
		const macroName = `${type.toUpperCase()}_UNIFORM_COUNT`;
		const arrayName = `${type}Uniforms`;
		fileContents.push(
			`#define ${macroName} ${definition.uniformArrays[type].variables.length}`,
			`static ${type} ${arrayName}[${macroName}];`
		);
		definition.uniformArrays[type].variables.forEach((variable, index) => {
			const name = variable.name
				.replace(/^\w|\b\w/g, (letter) => letter.toUpperCase())
				.replace(/_+/g, '');
			fileContents.push(`#define uniform${name} ${arrayName}[${index}]`);
		});
		fileContents.push('');
	});

	let prologCode = definition.prologCode;
	let commonCode = definition.commonCode;

	const stageVariableRegExp = /\w+ [\w,]+;/g;
	let vertexSpecificCode = '';
	let fragmentSpecificCode = '';

	if (definition.attributesCode) {
		forEachMatch(stageVariableRegExp, definition.attributesCode, (match) => {
			vertexSpecificCode += 'in ' + match[0];
		});
	}

	if (definition.varyingsCode) {
		forEachMatch(stageVariableRegExp, definition.varyingsCode, (match) => {
			vertexSpecificCode += 'out ' + match[0];
			fragmentSpecificCode += 'in ' + match[0];
		});
	}

	if (definition.outputsCode) {
		forEachMatch(stageVariableRegExp, definition.outputsCode, (match) => {
			fragmentSpecificCode += 'out ' + match[0];
		});
	}

	if (prologCode && !vertexSpecificCode && !fragmentSpecificCode) {
		commonCode = prologCode + commonCode;
		prologCode = '';
	}

	if (prologCode) {
		fileContents.push(
			'#define HAS_SHADER_PROLOG_CODE',
			`static const char *shaderPrologCode = "${escape(prologCode)}";`,
			''
		);
	}

	if (vertexSpecificCode) {
		fileContents.push(
			'#define HAS_SHADER_VERTEX_SPECIFIC_CODE',
			`static const char *shaderVertexSpecificCode = "${escape(
				vertexSpecificCode
			)}";`,
			''
		);
	}

	if (fragmentSpecificCode) {
		fileContents.push(
			'#define HAS_SHADER_FRAGMENT_SPECIFIC_CODE',
			`static const char *shaderFragmentSpecificCode = "${escape(
				fragmentSpecificCode
			)}";`,
			''
		);
	}

	if (commonCode) {
		fileContents.push(
			'#define HAS_SHADER_COMMON_CODE',
			`static const char *shaderCommonCode = "${escape(commonCode)}";`,
			''
		);
	}

	fileContents.push('#define PASSES ' + definition.passes.length);

	fileContents.push('static const char *shaderPassCodes[] = {');
	definition.passes.forEach((pass, index) => {
		if (pass.vertexCode) {
			fileContents.push(
				`#define HAS_SHADER_PASS_${index}_VERTEX_CODE`,
				`"${escape(pass.vertexCode)}",`
			);
		} else {
			fileContents.push('nullptr,');
		}

		if (pass.fragmentCode) {
			fileContents.push(
				`#define HAS_SHADER_PASS_${index}_FRAGMENT_CODE`,
				`"${escape(pass.fragmentCode)}",`
			);
		} else {
			fileContents.push('nullptr,');
		}
	});
	fileContents.push('};', '');

	const bufferCount = config.get('demo:bufferCount');
	if (bufferCount && bufferCount > 0) {
		fileContents.push('#define BUFFER_COUNT ' + bufferCount);
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
		}

		const scale = config.get('demo:resolution:scale');
		if (scale > 0 && scale !== 1) {
			fileContents.push('#define SCALE_RESOLUTION ' + scale);
		}
	}

	fileContents.push('');

	if (config.get('capture') || config.get('demo:closeWhenFinished')) {
		fileContents.push('#define CLOSE_WHEN_FINISHED', '');
	}

	if (config.get('demo:hooksFilename')) {
		fileContents.push('#define HAS_HOOKS', '');
	}

	await writeFile(
		join(buildDirectory, 'demo-data.hpp'),
		fileContents.join('\n')
	);
}

export async function writeDemoGl(config: IConfig) {
	const fileContents = [
		'#pragma once',
		'',
		'#include <GL/gl.h>',
		'',
		'#define APIENTRYP __stdcall *',
		'typedef char GLchar;',
		'typedef ptrdiff_t GLintptr;',
		'typedef ptrdiff_t GLsizeiptr;',
		'typedef void (APIENTRY * GLDEBUGPROC)(GLenum source, GLenum type, GLuint id, GLenum severity, GLsizei length,const GLchar * message,const void * userParam);',
		'',
	];

	const glConstantNames = ['GL_FRAGMENT_SHADER', 'GL_VERTEX_SHADER'];

	const glFunctionNames = [
		'glAttachShader',
		'glCompileShader',
		'glCreateProgram',
		'glCreateShader',
		'glLinkProgram',
		'glShaderSource',
		'glUniform1fv',
		'glUseProgram',
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
			'glDebugMessageCallback',
			'glDebugMessageControl',
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
		'static const char *glExtFunctionNames[GL_EXT_FUNCTION_COUNT] = { ',
		glExtFunctionNames.join(',\n'),
		' };',
		'static void *glExtFunctions[GL_EXT_FUNCTION_COUNT];'
	);

	const buildDirectory: string = config.get('paths:build');

	await writeFile(join(buildDirectory, 'demo-gl.hpp'), fileContents.join('\n'));
}

export async function copyHooks(config: IConfig) {
	const hooksFilename = config.get('demo:hooksFilename');
	if (hooksFilename) {
		const src = join(config.get('directory'), hooksFilename);
		const dest = join(config.get('paths:build'), 'hooks.hpp');

		await copy(src, dest);
	}
}
