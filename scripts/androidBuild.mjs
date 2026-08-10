import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const androidRoot = resolve(projectRoot, 'android');
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const androidEnv = {
  ...process.env,
  VITE_CAPACITOR_PLATFORM: 'android',
  VITE_ANDROID_APP_VERSION: process.env.VITE_ANDROID_APP_VERSION || process.env.npm_package_version || packageJson.version,
};

const run = (command, args, options = {}) => {
  execFileSync(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    ...options,
  });
};

const syncAndroid = () => {
  run(npmCommand, ['run', 'build'], { cwd: projectRoot, env: androidEnv });
  run(npmCommand, ['exec', '--', 'cap', 'sync', 'android'], { cwd: projectRoot, env: androidEnv });
};

const buildApk = (variant) => {
  syncAndroid();
  const gradleCommand = resolve(androidRoot, isWindows ? 'gradlew.bat' : 'gradlew');
  run(gradleCommand, [`assemble${variant}`, '--rerun-tasks'], { cwd: androidRoot, env: androidEnv });
};

const command = process.argv[2];

if (command === 'sync') {
  syncAndroid();
} else if (command === 'debug') {
  buildApk('Debug');
} else if (command === 'release') {
  buildApk('Release');
} else {
  console.error('Usage: node scripts/androidBuild.mjs <sync|debug|release>');
  process.exitCode = 1;
}
