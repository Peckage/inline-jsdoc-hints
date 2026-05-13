import * as vscode from 'vscode';
import * as path from 'path';
import { PLUGIN_NAME } from '../constants';
import { addPlugin, fileExists, hasPlugin, readTsConfig, resolveTsConfigPath } from '../utils/tsConfigEditor';
import { log, logError } from '../utils/logger';
import { notifyRestartRequired } from './shared';

export async function addToTsConfig(extensionDistDir: string): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    await vscode.window.showWarningMessage('Inline JSDoc Hints: No workspace folder is open.');
    return;
  }

  const tsconfigPath = resolveTsConfigPath(folder.uri.fsPath);

  if (!fileExists(tsconfigPath)) {
    const choice = await vscode.window.showWarningMessage(
      `Inline JSDoc Hints: No tsconfig.json found at ${tsconfigPath}. Create one?`,
      'Create',
      'Cancel',
    );
    if (choice !== 'Create') {
      return;
    }
    try {
      const { writeFileSync } = await import('fs');
      writeFileSync(tsconfigPath, '{\n  "compilerOptions": {}\n}\n', 'utf8');
      log(`Created ${tsconfigPath}`);
    } catch (err) {
      logError('Failed to create tsconfig.json', err);
      await vscode.window.showErrorMessage(`Inline JSDoc Hints: Failed to create tsconfig.json — ${String(err)}`);
      return;
    }
  }

  const config = readTsConfig(tsconfigPath);
  if (!config) {
    await vscode.window.showErrorMessage(
      `Inline JSDoc Hints: Could not read ${tsconfigPath}. Check the Output channel for details.`,
    );
    return;
  }

  if (hasPlugin(config, PLUGIN_NAME)) {
    await vscode.window.showInformationMessage(
      `Inline JSDoc Hints: Plugin is already registered in ${path.basename(tsconfigPath)}.`,
    );
    return;
  }

  const pluginDistPath = path.join(extensionDistDir, 'plugin.js');
  const relativePluginPath = path.relative(folder.uri.fsPath, pluginDistPath);

  const confirm = await vscode.window.showInformationMessage(
    `Inline JSDoc Hints: Add the TypeScript language service plugin to ${path.basename(tsconfigPath)}?\n\nThis will add:\n  { "name": "${PLUGIN_NAME}", "location": "${relativePluginPath}" }\nunder compilerOptions.plugins.`,
    { modal: true },
    'Add Plugin',
    'Cancel',
  );

  if (confirm !== 'Add Plugin') {
    log('User cancelled addToTsConfig');
    return;
  }

  const result = addPlugin(tsconfigPath, PLUGIN_NAME, relativePluginPath);

  if (result.error) {
    await vscode.window.showErrorMessage(
      `Inline JSDoc Hints: Failed to update tsconfig.json — ${result.error}`,
    );
    return;
  }

  if (result.modified) {
    await notifyRestartRequired('Plugin added to tsconfig.json');
  }
}
