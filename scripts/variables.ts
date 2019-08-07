import {
	IConstVariable,
	IRegularVariable,
	IUniformVariable,
	Variable,
} from './definitions';

export function addConstant(
	variables: Variable[],
	type: string,
	name: string,
	value: string
) {
	const variable: IConstVariable = {
		active: true,
		kind: 'const',
		name,
		type,
		value,
	};
	variables.push(variable);
}

export function addRegular(variables: Variable[], type: string, name: string) {
	const variable: IRegularVariable = {
		active: true,
		kind: 'regular',
		name,
		type,
	};
	variables.push(variable);
}

export function addUniform(variables: Variable[], type: string, name: string) {
	const variable: IUniformVariable = {
		active: true,
		kind: 'uniform',
		name,
		type,
	};
	variables.push(variable);
}
