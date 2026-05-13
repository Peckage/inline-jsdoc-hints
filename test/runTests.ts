import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');

  const testWorkspacePath = path.resolve(__dirname, './fixtures/workspace');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [testWorkspacePath, '--disable-extensions'],
  });
}

main().catch((err: unknown) => {
  console.error('Failed to run tests:', err);
  process.exit(1);
});
