import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';

const require = createRequire(import.meta.url);

const platformMap = {
  darwin: {arm64: 'lightningcss-darwin-arm64', x64: 'lightningcss-darwin-x64'},
  linux: {
    arm: 'lightningcss-linux-arm-gnueabihf',
    arm64: 'lightningcss-linux-arm64-gnu',
    x64: 'lightningcss-linux-x64-gnu',
  },
  win32: {arm64: 'lightningcss-win32-arm64-msvc', x64: 'lightningcss-win32-x64-msvc'},
};

function resolveBinaryPackageName() {
  const byArch = platformMap[process.platform];
  if (!byArch) return null;
  return byArch[process.arch] ?? null;
}

function shouldAttemptRepair(error) {
  return (
    error &&
    typeof error === 'object' &&
    error.code === 'MODULE_NOT_FOUND' &&
    typeof error.message === 'string' &&
    error.message.includes('lightningcss')
  );
}

function getLightningcssVersion() {
  try {
    const pkg = require('lightningcss/package.json');
    return pkg.version;
  } catch {
    return null;
  }
}

function installBinary(pkgName, version) {
  const spec = version ? `${pkgName}@${version}` : pkgName;
  console.log(`[ensure-lightningcss] Installing missing optional dependency: ${spec}`);
  execSync(`npm install --no-save ${spec}`, {stdio: 'inherit'});
}

function main() {
  const pkgName = resolveBinaryPackageName();
  if (!pkgName) {
    console.log(`[ensure-lightningcss] Skipping unsupported platform ${process.platform}/${process.arch}`);
    return;
  }

  try {
    require('lightningcss');
    return;
  } catch (error) {
    if (!shouldAttemptRepair(error)) {
      throw error;
    }
  }

  const version = getLightningcssVersion();
  installBinary(pkgName, version);

  // Validate install and fail with a clear message if still unavailable.
  try {
    require('lightningcss');
    console.log('[ensure-lightningcss] lightningcss native binary is ready.');
  } catch (error) {
    console.error('[ensure-lightningcss] Unable to load lightningcss after attempted repair.');
    throw error;
  }
}

main();
