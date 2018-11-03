const {
	pathExists,
	remove,
	stat,
} = require('fs-extra');
const {
	Notification,
} = require('node-notifier');
const {
	join,
	resolve,
} = require('path');

const {
	spawn,
} = require('./lib');

const argv = require('yargs')
	.option('notify', {
		alias: 'n',
		default: false,
		describe: 'Display a notification when build ends.',
	})
	.help('help')
	.alias('help', 'h')
	.argv;

const config = require('./config');

const outputDirectory = 'dist';
const exePath = resolve(outputDirectory, config.get('demo:name') + '.exe');

let chain = require('./make-chain')(config, {
	debug : process.argv.includes('debug'),
	nominify : process.argv.includes('nominify'),
	buildDirectory: 'build',
	exePath,
});

const notifier = new Notification({
	withFallback: true,
});

const startTime = Date.now();

let size;

chain
	.then(() => {
		return stat(exePath);
	})
	.then(stats => {
		size = stats.size;

		if (argv.notify) {
			notifier.notify({
				title: 'Build successful.',
				message: size + ' bytes.',
				wait: true,
			});

			notifier.on('click', () => {
				spawn(exePath, {
					cwd: outputDirectory,
				});
			});
		}
	})

	.then(() => {
		if (config.get('demo:zip')) {
			const zipPath = resolve('dist', config.get('demo:name') + '.zip');
			return remove(zipPath)
				.then(() => {
					return spawn(config.get('paths:7z'), [
						'a',
						zipPath,
						exePath,
					], {
						cwd: 'dist',
					});
				})
				.then(() => {
					return pathExists(join('demo', 'static'));
				})
				.then(exists => {
					if (exists) {
						return spawn(config.get('paths:7z'), [
							'a',
							zipPath,
							'*',
							'-r',
						], {
							cwd: join('demo', 'static'),
						});
					}
				})
				.catch(err => {
					console.error('Unable to zip the demo.');
					console.error(err);
				});
		}
	})

	.then(() => {
		console.log('Build successful.');
		console.log('Build duration: %s seconds.', ((Date.now() - startTime) * 1e-3).toFixed(1));
		console.log('Demo size: %d bytes.', size);
	}, err => {
		console.error('Build failed.');
		console.error(err);

		if (argv.notify) {
			notifier.notify({
				title: 'Build failed.',
				message: err.toString(),
			});
		}
	});
