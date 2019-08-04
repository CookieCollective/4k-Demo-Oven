import { Globals } from './definitions';

export function addConstant(
	globals: Globals,
	type: string,
	name: string,
	value?: string
) {
	globals.push({
		annotations: {
			const: true,
		},
		name,
		type,
		value,
	});
}

export function addUniform(globals: Globals, type: string, name: string) {
	globals.push({
		annotations: {
			uniform: true,
		},
		name,
		type,
	});
}
