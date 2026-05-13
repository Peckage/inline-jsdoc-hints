/**
 * esbuild bundler script.
 * Produces two separate CJS bundles:
 *   dist/extension.js  — extension host (external: vscode)
 *   dist/plugin.js     — tsserver plugin (no externals, fully self-contained)
 */

import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';

const args = process.argv.slice(2);
const isProduction = args.includes('--production');
const isWatch = args.includes('--watch');

const root = path.resolve(__dirname, '..');

const extensionConfig: esbuild.BuildOptions = {
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
  metafile: true,
};

const pluginConfig: esbuild.BuildOptions = {
  entryPoints: [path.join(root, 'src', 'plugin', 'index.ts')],
  bundle: true,
  outfile: path.join(root, 'dist', 'plugin.js'),
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  // No externals: tsserver loads the plugin in-process and does not share modules
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
  metafile: true,
  // tsserver plugins must export via CJS; mark typescript as external since
  // the plugin receives the ts module from tsserver at runtime
  external: ['typescript'],
};

async function build(): Promise<void> {
  ensureDistDir(path.join(root, 'dist'));

  if (isWatch) {
    const [extCtx, pluginCtx] = await Promise.all([
      esbuild.context(extensionConfig),
      esbuild.context(pluginConfig),
    ]);
    await Promise.all([extCtx.watch(), pluginCtx.watch()]);
    console.log('Watching for changes…');
  } else {
    const [extResult, pluginResult] = await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(pluginConfig),
    ]);

    if (isProduction) {
      writeMetafile(path.join(root, 'dist', 'extension.meta.json'), extResult.metafile);
      writeMetafile(path.join(root, 'dist', 'plugin.meta.json'), pluginResult.metafile);
    }

    console.log('Build complete.');
  }
}

function ensureDistDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeMetafile(outPath: string, metafile: esbuild.Metafile | undefined): void {
  if (metafile) {
    fs.writeFileSync(outPath, JSON.stringify(metafile, null, 2));
  }
}

build().catch((err: unknown) => {
  console.error('Build failed:', err);
  process.exit(1);
});
