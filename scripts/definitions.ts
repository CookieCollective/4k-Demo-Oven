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
	[type: string]: string;
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

export interface ISource {
	dependencies?: string[];
	includes?: string[];
	source: string;
}

export interface ISources {
	[objPath: string]: ISource;
}

export interface IAsmCompilationDefinition {
	nasmArgs: string[];
	includePaths: string[];

	sources: ISources;
}

export interface ICppCompilationDefinition {
	clArgs: string[];

	hooks: IHooks;

	sources: ISources;
}

export interface ICompilationDefinition {
	asm: IAsmCompilationDefinition;
	cpp: ICppCompilationDefinition;

	crinklerArgs: string[];
	linkArgs: string[];
}

export interface IAudioSynthesizer {
	getDefaultConfig(): object;
	checkConfig(): void;
	addToCompilation(compilation: ICompilationDefinition): Promise<void>;
}

export interface IShaderProvider {
	getDefaultConfig(): object;
	checkConfig(): void;
	provide(definition: IShaderDefinition): Promise<void>;
}

export interface IShaderMinifier {
	getDefaultConfig(): object;
	checkConfig(): void;
	minify(definition: IShaderDefinition): Promise<void>;
}

export interface IDemoDefinition {
	shader: IShaderDefinition;
	compilation: ICompilationDefinition;
}

export interface IConfig {
	get(key?: string): any;
}

export interface IContext {
	config: IConfig;

	audioSynthesizer?: IAudioSynthesizer;
	shaderProvider: IShaderProvider;
	shaderMinifier?: IShaderMinifier;
}
