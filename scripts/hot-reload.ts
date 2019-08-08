import * as request from 'request-promise-native';

import { IConfig, IShaderDefinition } from './definitions';
import { forEachMatch } from './lib';

export async function updateShaders(
	config: IConfig,
	definition: IShaderDefinition
) {
	const baseUrl = `http://localhost:${config.get('server:port')}/`;

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

	definition.passes.forEach((pass, passIndex) => {
		if (pass.vertexCode) {
			let code = '';

			if (definition.prologCode) {
				code += definition.prologCode;
			}

			code += vertexSpecificCode;
			code += definition.commonCode;
			code += pass.vertexCode;

			addRequest(passIndex, 'vertex', code);
		}

		if (pass.fragmentCode) {
			let code = '';

			if (definition.prologCode) {
				code += definition.prologCode;
			}

			code += fragmentSpecificCode;
			code += definition.commonCode;
			code += pass.fragmentCode;

			addRequest(passIndex, 'fragment', code);
		}
	});

	await Promise.all(requests);
}
