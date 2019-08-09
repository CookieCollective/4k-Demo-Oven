import * as request from 'request-promise-native';

import { IContext, IDemoDefinition } from './definitions';
import { forEachMatch } from './lib';

export async function updateDemo(context: IContext, demo: IDemoDefinition) {
	const baseUrl = `http://localhost:${context.config.get('server:port')}/`;

	const requests: request.RequestPromise[] = [];

	function addRequest(passIndex: number, stage: string, code: string) {
		requests.push(
			request(`${baseUrl}passes/${passIndex}/${stage}`, {
				body: code,
				headers: {
					'Content-Type': 'text/plain',
				},
				method: 'POST',
			})
		);
	}

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

	demo.shader.passes.forEach((pass, passIndex) => {
		if (pass.vertexCode) {
			let code = '';

			if (demo.shader.prologCode) {
				code += demo.shader.prologCode;
			}

			code += vertexSpecificCode;
			code += demo.shader.commonCode;
			code += pass.vertexCode;

			addRequest(passIndex, 'vertex', code);
		}

		if (pass.fragmentCode) {
			let code = '';

			if (demo.shader.prologCode) {
				code += demo.shader.prologCode;
			}

			code += fragmentSpecificCode;
			code += demo.shader.commonCode;
			code += pass.fragmentCode;

			addRequest(passIndex, 'fragment', code);
		}
	});

	await Promise.all(requests);
}
