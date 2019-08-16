import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';

import { IContext, IDemoDefinition } from './definitions';
import { replaceHooks } from './hooks';
import { forEachMatch } from './lib';

export async function writeDemoData(context: IContext, demo: IDemoDefinition) {
	const buildDirectory: string = context.config.get('paths:build');

	function escape(str: string) {
		return str
			.replace(/\n/g, '\\n')
			.replace(/\r/g, '')
			.replace(/"/g, '\\"');
	}

	const fileContents = ['#pragma once', ''];

	if (context.config.get('debug')) {
		fileContents.push('#define DEBUG', '');

		if (context.config.get('server')) {
			fileContents.push(
				'#define SERVER',
				`#define SERVER_PORT ${context.config.get('server:port')}`,
				''
			);
		}
	}

	let debugDisplayUniformLocations = '';

	Object.keys(demo.shader.uniformArrays).forEach((type) => {
		const uniformArray = demo.shader.uniformArrays[type];

		const typeUpperCase = type.toUpperCase();
		const nameMacro = `${typeUpperCase}_UNIFORM_NAME`;
		const countMacro = `${typeUpperCase}_UNIFORM_COUNT`;
		const arrayName = `${type}Uniforms`;
		const cppType = type.startsWith('sampler') ? 'int' : type;

		fileContents.push(
			`#define ${nameMacro} "${uniformArray.minifiedName ||
				uniformArray.name}"`,
			`#define ${countMacro} ${uniformArray.variables.length}`,
			`static ${cppType} ${arrayName}[${countMacro}];`
		);

		uniformArray.variables.forEach((variable, index) => {
			const name = variable.name
				.replace(/^\w|\b\w/g, (letter) => letter.toUpperCase())
				.replace(/_+/g, '');
			fileContents.push(`#define uniform${name} ${arrayName}[${index}]`);
		});

		fileContents.push('');

		debugDisplayUniformLocations += `std::cout << "${type}: " << glGetUniformLocation(PROGRAM, ${nameMacro}) << std::endl; \\\n`;
	});

	fileContents.push(
		'#define DEBUG_DISPLAY_UNIFORM_LOATIONS(PROGRAM) \\',
		debugDisplayUniformLocations
	);

	let prologCode = demo.shader.prologCode;
	let commonCode = demo.shader.commonCode;

	const stageVariableRegExp = /\w+ [\w,]+;/g;
	let vertexSpecificCode = '';
	let fragmentSpecificCode = '';

	if (demo.shader.attributesCode) {
		forEachMatch(stageVariableRegExp, demo.shader.attributesCode, (match) => {
			vertexSpecificCode += 'in ' + match[0];
		});
	}

	if (demo.shader.varyingsCode) {
		forEachMatch(stageVariableRegExp, demo.shader.varyingsCode, (match) => {
			vertexSpecificCode += 'out ' + match[0];
			fragmentSpecificCode += 'in ' + match[0];
		});
	}

	if (demo.shader.outputsCode) {
		forEachMatch(stageVariableRegExp, demo.shader.outputsCode, (match) => {
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

	fileContents.push('#define PASS_COUNT ' + demo.shader.passes.length);

	fileContents.push('static const char *shaderPassCodes[] = {');
	demo.shader.passes.forEach((pass, index) => {
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

	if (context.config.get('demo:audio-synthesizer:tool') === 'shader') {
		fileContents.unshift(
			'#include "audio-shader.cpp"',
			'#define AUDIO_TEXTURE'
		);
	}

	if (context.config.get('capture')) {
		fileContents.push(
			'#define CAPTURE',
			'#define CAPTURE_FPS ' + context.config.get('capture:fps'),
			'#define FORCE_RESOLUTION',
			'static const constexpr int resolutionWidth = ' +
				context.config.get('capture:width') +
				';',
			'static const constexpr int resolutionHeight = ' +
				context.config.get('capture:height') +
				';'
		);
	} else {
		fileContents.push('static void captureFrame() {}');

		if (
			context.config.get('demo:resolution:width') > 0 &&
			context.config.get('demo:resolution:height') > 0
		) {
			fileContents.push(
				'#define FORCE_RESOLUTION',
				'static const constexpr int resolutionWidth = ' +
					context.config.get('demo:resolution:width') +
					';',
				'static const constexpr int resolutionHeight = ' +
					context.config.get('demo:resolution:height') +
					';'
			);
		}

		const scale = context.config.get('demo:resolution:scale');
		if (scale > 0 && scale !== 1) {
			fileContents.push('#define SCALE_RESOLUTION ' + scale);
		}
	}

	fileContents.push('');

	const duration = context.config.get('demo:duration');
	if (duration) {
		fileContents.push(`#define DURATION ${duration}`, '');
	}

	if (
		duration ||
		context.config.get('capture') ||
		context.config.get('demo:closeWhenFinished')
	) {
		fileContents.push('#define CLOSE_WHEN_FINISHED', '');
	}

	if (context.config.get('demo:loadingBlackScreen')) {
		fileContents.push('#define LOADING_BLACK_SCREEN', '');
	}

	Object.keys(demo.compilation.cpp.hooks).forEach((hookName) => {
		fileContents.push(`#define HAS_HOOK_${hookName.toUpperCase()}`);
	});

	await writeFile(
		join(buildDirectory, 'demo-data.hpp'),
		fileContents.join('\n')
	);
}

export async function writeDemoGl(context: IContext) {
	const fileContents = [
		'#pragma once',
		'',
		'#include <GL/gl.h>',
		'',
		'#define GLAPIENTRY __stdcall',
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

	function addFromConfig(key: string, action: (name: string) => void) {
		const value = context.config.get(key);
		if (Array.isArray(value)) {
			value.forEach(action);
		}
	}

	addFromConfig('demo:gl:constants', addGlConstantName);
	addFromConfig('demo:gl:functions', addGlFunctionName);

	const glewContents = await readFile(
		join(context.config.get('tools:glew'), 'include', 'GL', 'glew.h'),
		'utf8'
	);

	glConstantNames.forEach((constantName: string) => {
		const match = glewContents.match(
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
		const match = glewContents.match(
			new RegExp(`^typedef \\w+ \\(GLAPIENTRY \\* ${typedefName}\\).+$`, 'gm')
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
		'static void *glExtFunctions[GL_EXT_FUNCTION_COUNT];',
		''
	);

	const buildDirectory: string = context.config.get('paths:build');

	await writeFile(join(buildDirectory, 'demo-gl.hpp'), fileContents.join('\n'));
}

export async function writeDemoMain(context: IContext, demo: IDemoDefinition) {
	const buildDirectory: string = context.config.get('paths:build');

	let mainCode = await readFile(join('engine', 'main-template.cpp'), 'utf8');

	mainCode = replaceHooks(demo.compilation.cpp.hooks, mainCode);

	await writeFile(join(buildDirectory, 'main.cpp'), mainCode);
}
