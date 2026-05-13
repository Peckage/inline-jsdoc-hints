import * as vscode from 'vscode';

/**
 * Shows an information message telling the user that tsserver must be
 * restarted for the change to take effect, with a clickable action button.
 */
export async function notifyRestartRequired(context: string): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    `Inline JSDoc Hints: ${context}. Restart the TypeScript server to apply changes.`,
    'Restart TS Server',
  );

  if (choice === 'Restart TS Server') {
    await vscode.commands.executeCommand('typescript.restartTsServer');
  }
}
