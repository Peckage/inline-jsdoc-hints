'use strict';
/**
 * Compiles the test suite to dist/test/ using esbuild so tests can be run
 * without a full TypeScript compile step.
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');

const testFiles = [
  path.join(root, 'test', 'runTests.ts'),
  path.join(root, 'test', 'suite', 'index.ts'),
  path.join(root, 'test', 'suite', 'extractDescription.test.ts'),
  path.join(root, 'test', 'suite', 'tsConfigEditor.test.ts'),
  path.join(root, 'test', 'suite', 'extension.test.ts'),
];

async function main() {
  const outDir = path.join(root, 'dist', 'test');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.mkdirSync(path.join(outDir, 'suite'), { recursive: true });

  await esbuild.build({
    entryPoints: testFiles,
    bundle: true,
    outbase: path.join(root, 'test'),
    outdir: outDir,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['vscode', 'mocha', '@vscode/test-electron', 'jsonc-parser'],
    sourcemap: true,
    logLevel: 'info',
  });

  console.log('Tests compiled.');
}

main().catch((err) => {
  console.error('Test compilation failed:', err);
  process.exit(1);
});
