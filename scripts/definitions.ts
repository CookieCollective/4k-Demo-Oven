export interface IPass {
	fragment?: string;
	vertex?: string;
}

export interface IAnnotations {
	[key: string]: string | boolean;
}

export interface IGlobal {
	annotations: IAnnotations;
	name: string;
	type: string;
	value?: string; // For constants.
}

export type Globals = IGlobal[];

export interface IAugmentedGlobal extends IGlobal {
	active: boolean;
	referencedInShader: boolean;
	referencesToGlobals: AugmentedGlobals;
	referencedByGlobals: AugmentedGlobals;

	minifiedName?: string; // For stage input/output variables.
}

export type AugmentedGlobals = IAugmentedGlobal[];

export interface IUniformArray {
	name: string;
	globals: AugmentedGlobals;
}

export interface IUniformArrays {
	[type: string]: IUniformArray;
}

export interface IShaderDefinition {
	globals: AugmentedGlobals;
	uniformArrays: IUniformArrays;
	passMainFunctionNames?: IPass[];
	shader: string;
}

export interface IShaderProvider {
	getDefaultConfig(): object;
	provide(globals: Globals): Promise<string>;
}

export interface IShaderMinifier {
	minify(definition: Readonly<IShaderDefinition>): Promise<IShaderDefinition>;
}

export interface IConfig {
	provideShaderDefinition(): Promise<Readonly<IShaderDefinition>>;

	get(key?: string): any;
}
