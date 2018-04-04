'use strict';

const {
	spawn
} = require('child_process');
const {
	stat,
} = require('fs-extra');

exports.spawn = function (command, args, options) {
	return new Promise((resolve, reject) => {
		const cp = spawn(command, args, options);

		cp.stdout.on('data', (data) => {
			console.log(data.toString());
		});

		cp.stderr.on('data', (data) => {
			console.error(data.toString());
		});

		cp.on('close', (code, signal) => {
			if (code)
				return reject(new Error(command + ' exited with code ' + code + '.'));
			else if (signal)
				return reject(new Error(command + ' was stopped by signal ' + signal + '.'));
			else
				return resolve();
		});
	});
};

function statsOrNull(path) {
	return new Promise(resolve => {
		return stat(path, (err, stats) => {
			if (err)
				return resolve(null);
			return resolve(stats);
		});
	});
}

exports.step = function (name, output, inputs, promiseGenerator) {
	return Promise.all([
		statsOrNull(output),
		Promise.all(inputs.map(statsOrNull)),
	]).then(([outputStats, inputsStats]) => {
		const buildNeeded = !outputStats || inputsStats.some(inputStats => inputStats && inputStats.mtime > outputStats.mtime);
		if (buildNeeded) {
			console.log(name);
			return promiseGenerator(output, inputs);
		}
	});
};
