'use strict';
/**
 * esbuild bundler script (CommonJS).
 * Produces two CJS bundles:
 *   dist/extension.js  — extension host (external: vscode)
 *   dist/plugin.js     — tsserver plugin (external: typescript only)
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const isProduction = args.includes('--production');
const isWatch = args.includes('--watch');

const root = path.resolve(__dirname, '..');

/** @type {import('esbuild').BuildOptions} */
const extensionConfig = {
  entryPoints: [path.join(root, 'src', 'extension.ts')],
  bundle: true,
  outfile: path.join(root, 'dist', 'extension.js'),
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['vscode'],
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
};

/** @type {import('esbuild').BuildOptions} */
const pluginConfig = {
  entryPoints: [path.join(root, 'src', 'plugin', 'index.ts')],
  bundle: true,
  outfile: path.join(root, 'dist', 'plugin.js'),
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  // typescript is provided by tsserver at runtime
  external: ['typescript'],
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
  // tsserver requires the plugin factory as module.exports
  footer: { js: 'if (typeof module !== "undefined") { module.exports = exports.default ?? exports; }' },
};

function ensureDistDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function build() {
  ensureDistDir(path.join(root, 'dist'));

  if (isWatch) {
    const [extCtx, pluginCtx] = await Promise.all([
      esbuild.context(extensionConfig),
      esbuild.context(pluginConfig),
    ]);
    await Promise.all([extCtx.watch(), pluginCtx.watch()]);
    console.log('Watching for changes…');
  } else {
    await Promise.all([esbuild.build(extensionConfig), esbuild.build(pluginConfig)]);
    console.log('Build complete.');
  }
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
