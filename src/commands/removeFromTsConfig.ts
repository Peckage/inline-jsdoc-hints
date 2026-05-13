import * as vscode from 'vscode';
import * as path from 'path';
import { PLUGIN_NAME } from '../constants';
import { fileExists, hasPlugin, readTsConfig, removePlugin, resolveTsConfigPath } from '../utils/tsConfigEditor';
import { log } from '../utils/logger';
import { notifyRestartRequired } from './shared';

export async function removeFromTsConfig(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    await vscode.window.showWarningMessage('Inline JSDoc Hints: No workspace folder is open.');
    return;
  }

  const tsconfigPath = resolveTsConfigPath(folder.uri.fsPath);

  if (!fileExists(tsconfigPath)) {
    await vscode.window.showWarningMessage(
      `Inline JSDoc Hints: No tsconfig.json found at ${tsconfigPath}.`,
    );
    return;
  }

  const config = readTsConfig(tsconfigPath);
  if (!config) {
    await vscode.window.showErrorMessage(
      `Inline JSDoc Hints: Could not read ${tsconfigPath}. Check the Output channel for details.`,
    );
    return;
  }

  if (!hasPlugin(config, PLUGIN_NAME)) {
    await vscode.window.showInformationMessage(
      `Inline JSDoc Hints: Plugin is not present in ${path.basename(tsconfigPath)}.`,
    );
    return;
  }

  const confirm = await vscode.window.showInformationMessage(
    `Inline JSDoc Hints: Remove the TypeScript language service plugin from ${path.basename(tsconfigPath)}?`,
    { modal: true },
    'Remove Plugin',
    'Cancel',
  );

  if (confirm !== 'Remove Plugin') {
    log('User cancelled removeFromTsConfig');
    return;
  }

  const result = removePlugin(tsconfigPath, PLUGIN_NAME);

  if (result.error) {
    await vscode.window.showErrorMessage(
      `Inline JSDoc Hints: Failed to update tsconfig.json — ${result.error}`,
    );
    return;
  }

  if (result.modified) {
    await notifyRestartRequired('Plugin removed from tsconfig.json');
  }
}
