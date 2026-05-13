'use strict';
/**
 * Runs unit tests (extractDescription + tsConfigEditor) directly with mocha,
 * without the VS Code electron host. Provides a vscode stub so the logger
 * module resolves cleanly.
 */

const Module = require('module');
const path = require('path');
const Mocha = require('mocha');

// Inject the vscode stub before any test files are loaded
const vscodeStub = require('../test/fixtures/vscode-mock');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'vscode') {
    return vscodeStub;
  }
  return originalLoad.call(this, request, parent, isMain);
};

const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 10000 });
mocha.addFile(path.resolve(__dirname, '../dist/test/suite/extractDescription.test.js'));
mocha.addFile(path.resolve(__dirname, '../dist/test/suite/tsConfigEditor.test.js'));

mocha.run((failures) => {
  process.exit(failures > 0 ? 1 : 0);
});
