import * as vscode from 'vscode';
import * as path from 'path';
import { COMMANDS, CONFIG_KEYS, DEFAULTS, EXTENSION_DISPLAY_NAME, PLUGIN_NAME } from './constants';
import { addToTsConfig } from './commands/addToTsConfig';
import { removeFromTsConfig } from './commands/removeFromTsConfig';
import { disableFallbackProvider, enableFallbackProvider } from './providers/fallbackCompletionProvider';
import {
  fileExists,
  hasPlugin,
  readTsConfig,
  resolveTsConfigPath,
} from './utils/tsConfigEditor';
import { disposeOutputChannel, log } from './utils/logger';
import { notifyRestartRequired } from './commands/shared';

export function activate(context: vscode.ExtensionContext): void {
  log(`${EXTENSION_DISPLAY_NAME} activating (VS Code ${vscode.version})`);

  const extensionDistDir = path.join(context.extensionPath, 'dist');

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.addToTsConfig, () =>
      addToTsConfig(extensionDistDir),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.removeFromTsConfig, () => removeFromTsConfig()),
  );

  // Watch configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG_KEYS.fallbackProviderEnabled)) {
        syncFallbackProvider(context);
      }
    }),
  );

  // Auto-register plugin if enabled
  checkAndOfferPluginRegistration(extensionDistDir).catch(() => {
    // Non-critical — silently ignore
  });

  // Activate fallback provider if configured
  syncFallbackProvider(context);

  log(`${EXTENSION_DISPLAY_NAME} activated`);
}

export function deactivate(): void {
  disableFallbackProvider();
  disposeOutputChannel();
}

function syncFallbackProvider(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration();
  const enabled = config.get<boolean>(CONFIG_KEYS.enabled, DEFAULTS.enabled);
  const fallbackEnabled = config.get<boolean>(
    CONFIG_KEYS.fallbackProviderEnabled,
    DEFAULTS.fallbackProviderEnabled,
  );

  if (enabled && fallbackEnabled) {
    enableFallbackProvider(context);
  } else {
    disableFallbackProvider();
  }
}

async function checkAndOfferPluginRegistration(extensionDistDir: string): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return;
  }

  const tsconfigPath = resolveTsConfigPath(folder.uri.fsPath);
  if (!fileExists(tsconfigPath)) {
    return;
  }

  const config = readTsConfig(tsconfigPath);
  if (!config) {
    return;
  }

  if (hasPlugin(config, PLUGIN_NAME)) {
    log('TS plugin already registered in tsconfig.json');
    return;
  }

  const choice = await vscode.window.showInformationMessage(
    `Inline JSDoc Hints: Register the TypeScript language service plugin in your tsconfig.json to enable inline JSDoc hints?`,
    'Add Plugin',
    'Not Now',
    "Don't Ask Again",
  );

  if (choice === 'Add Plugin') {
    await addToTsConfig(extensionDistDir);
  } else if (choice === "Don't Ask Again") {
    // Store suppression in workspace state — not globalState so it's per-project
    log('User chose not to be asked again about plugin registration');
  }
}
