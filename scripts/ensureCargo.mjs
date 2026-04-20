import {execSync} from 'node:child_process';

const INSTALL_INSTRUCTIONS = {
  win32: `  Windows (PowerShell) — requires Windows 10 1709 or later:
    winget install --id Rustlang.Rustup -e
  If winget is unavailable, download the installer directly from:
    https://rustup.rs
  Then close/reopen your terminal and run: cargo --version`,
  darwin: `  macOS / Linux (via rustup — review the script before running):
    curl https://sh.rustup.rs -sSf | sh
  Alternatively, download and inspect the installer at https://rustup.rs first.
  Then reload your shell (source "$HOME/.cargo/env") and run: cargo --version`,
  linux: `  macOS / Linux (via rustup — review the script before running):
    curl https://sh.rustup.rs -sSf | sh
  Alternatively, download and inspect the installer at https://rustup.rs first.
  Then reload your shell (source "$HOME/.cargo/env") and run: cargo --version`,
};

function isCargoAvailable() {
  try {
    execSync('cargo --version', {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (isCargoAvailable()) {
    return;
  }

  const instructions =
    INSTALL_INSTRUCTIONS[process.platform] ??
    '  Visit https://rustup.rs for installation instructions.';

  const invokedScript = process.env.npm_lifecycle_event ?? 'desktop:build';

  console.error(`
[ensure-cargo] ERROR: \`cargo\` was not found on your PATH.

Tauri requires the Rust toolchain (cargo) to build the desktop app.

Install Rust:
${instructions}

After installing, reopen your terminal and run:
  npm run ${invokedScript}

For full setup instructions see the "Desktop Installation (Tauri v2)" section in README.md.
`);

  process.exit(1);
}

main();
