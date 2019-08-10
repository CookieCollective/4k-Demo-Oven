import { readFile } from 'fs-extra';

import { IHooks } from './definitions';
import { forEachMatch } from './lib';

export async function addHooks(hooks: IHooks, path: string) {
	const contents = await readFile(path, 'utf8');

	let partStartIndex = 0;
	let hookName: string | undefined;

	function takePart(partEndIndex?: number) {
		if (hookName) {
			const code = contents.substring(partStartIndex, partEndIndex);

			if (hooks[hookName]) {
				hooks[hookName] += code;
			} else {
				hooks[hookName] = code;
			}
		}
	}

	const partsRegExp = /^#pragma\s+hook\s+(.+)\s+$/gm;
	forEachMatch(partsRegExp, contents, (match) => {
		takePart(match.index);
		partStartIndex = partsRegExp.lastIndex;
		hookName = match[1];
	});

	takePart();
}

export function replaceHooks(hooks: IHooks, str: string): string {
	Object.keys(hooks).forEach((hookName) => {
		str = str.replace(
			new RegExp(`\\bREPLACE_HOOK_${hookName.toUpperCase()}`, 'g'),
			() => replaceHooks(hooks, hooks[hookName])
		);
	});
	return str;
}
