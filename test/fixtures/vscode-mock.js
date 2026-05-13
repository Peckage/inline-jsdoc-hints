'use strict';
/**
 * Minimal vscode mock for running unit tests outside the VS Code electron host.
 * Only stubs the APIs actually used by the modules under test.
 */
const window = {
  createOutputChannel: () => ({
    appendLine: () => {},
    dispose: () => {},
  }),
};

module.exports = { window };
