export interface IContextOptions {
	capture?: boolean;
	debug?: boolean;
}

export interface IPass {
	fragmentCode?: string;
	vertexCode?: string;
}

export interface IAnnotations {
	[key: string]: string | boolean;
}

export interface IVariable {
	kind?: string;

	active: boolean;
	minifiedName?: string;
	name: string;
	type: string;
}

export interface IConstVariable extends IVariable {
	kind: 'const';

	value: string;
}

export interface IRegularVariable extends IVariable {
	kind: 'regular';
}

export interface IUniformVariable extends IVariable {
	kind: 'uniform';
}

export type Variable = IConstVariable | IRegularVariable | IUniformVariable;

export interface IUniformArray {
	name: string;
	minifiedName?: string;
	variables: IUniformVariable[];
}

export interface IUniformArrays {
	[type: string]: IUniformArray;
}

export interface IHooks {
	declarations?: string;
	initialize?: string;
	render?: string;
}

export interface IShaderDefinition {
	prologCode?: string;
	attributesCode?: string;
	varyingsCode?: string;
	outputsCode?: string;
	commonCode: string;
	passes: IPass[];

	glslVersion?: string;
	uniformArrays: IUniformArrays;
	variables: Variable[];
}

export interface IShaderProvider {
	getDefaultConfig(): object;
	checkConfig(): void;
	provide(definition: IShaderDefinition): Promise<void>;
}

export interface IShaderMinifier {
	checkConfig(): void;
	minify(definition: IShaderDefinition): Promise<void>;
}

export interface IDemoDefinition {
	shader: IShaderDefinition;
	hooks: IHooks;
}

export interface IConfig {
	get(key?: string): any;
}

export interface IContext {
	config: IConfig;

	shaderProvider: IShaderProvider;
	shaderMinifier?: IShaderMinifier;
}
