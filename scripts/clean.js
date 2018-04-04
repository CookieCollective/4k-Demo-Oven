'use strict';

const {
	remove,
} = require('fs-extra');

Promise.all([
	'build',
	'dist',
].map(path => remove(path)));
