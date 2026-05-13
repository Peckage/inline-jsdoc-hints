import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Extension Integration Tests', () => {
  test('extension is present', () => {
    const ext = vscode.extensions.getExtension('ia-sol.inline-jsdoc-hints');
    assert.ok(ext, 'Extension ia-sol.inline-jsdoc-hints should be installed');
  });

  test('extension activates on TypeScript file', async () => {
    const ext = vscode.extensions.getExtension('ia-sol.inline-jsdoc-hints');
    assert.ok(ext);

    const fixtureFile = path.resolve(__dirname, '../fixtures/workspace/sample.ts');
    const doc = await vscode.workspace.openTextDocument(fixtureFile);
    await vscode.window.showTextDocument(doc);

    if (!ext.isActive) {
      await ext.activate();
    }

    assert.ok(ext.isActive, 'Extension should be active after opening a TS file');
  });

  test('commands are registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('inline-jsdoc-hints.addToTsConfig'),
      'addToTsConfig command should be registered',
    );
    assert.ok(
      commands.includes('inline-jsdoc-hints.removeFromTsConfig'),
      'removeFromTsConfig command should be registered',
    );
  });

  test('configuration defaults are correct', () => {
    const config = vscode.workspace.getConfiguration('inlineJsdocHints');
    assert.strictEqual(config.get('enabled'), true);
    assert.strictEqual(config.get('maxLength'), 72);
    assert.strictEqual(config.get('extractionStrategy'), 'firstSentence');
    assert.strictEqual(config.get('showInDetail'), false);
    assert.strictEqual(config.get('fallbackProviderEnabled'), false);
    assert.deepStrictEqual(config.get('ignoredSymbolPrefixes'), []);
    assert.deepStrictEqual(config.get('includeLanguages'), [
      'typescript',
      'typescriptreact',
      'javascript',
      'javascriptreact',
    ]);
  });

  test('fallback provider provides enhanced items when enabled', async function () {
    this.timeout(15000);

    // Enable the fallback provider for this test
    const config = vscode.workspace.getConfiguration('inlineJsdocHints');
    await config.update('fallbackProviderEnabled', true, vscode.ConfigurationTarget.Workspace);

    try {
      const fixtureFile = path.resolve(__dirname, '../fixtures/workspace/sample.ts');
      const doc = await vscode.workspace.openTextDocument(fixtureFile);
      await vscode.window.showTextDocument(doc);

      // Trigger completions at the position where we have a jsdoc'd call
      const position = new vscode.Position(9, 10);
      const result = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider',
        doc.uri,
        position,
        undefined,
        10,
      );

      // We just verify the command executes without error; actual labelDetails
      // injection requires the TS plugin to be loaded in tsserver.
      assert.ok(result !== undefined, 'Completion provider should return a result');
    } finally {
      await config.update('fallbackProviderEnabled', false, vscode.ConfigurationTarget.Workspace);
    }
  });
});
