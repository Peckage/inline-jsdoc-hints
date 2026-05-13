export const EXTENSION_ID = 'inline-jsdoc-hints';
export const EXTENSION_DISPLAY_NAME = 'Inline JSDoc Hints';
export const OUTPUT_CHANNEL_NAME = 'Inline JSDoc Hints';
export const PLUGIN_NAME = 'inline-jsdoc-hints';
export const PLUGIN_DIST_PATH = 'dist/plugin.js';

export const COMMANDS = {
  addToTsConfig: `${EXTENSION_ID}.addToTsConfig`,
  removeFromTsConfig: `${EXTENSION_ID}.removeFromTsConfig`,
} as const;

export const CONFIG_SECTION = 'inlineJsdocHints';

export const CONFIG_KEYS = {
  enabled: `${CONFIG_SECTION}.enabled`,
  maxLength: `${CONFIG_SECTION}.maxLength`,
  extractionStrategy: `${CONFIG_SECTION}.extractionStrategy`,
  showInDetail: `${CONFIG_SECTION}.showInDetail`,
  includeLanguages: `${CONFIG_SECTION}.includeLanguages`,
  fallbackProviderEnabled: `${CONFIG_SECTION}.fallbackProviderEnabled`,
  ignoredSymbolPrefixes: `${CONFIG_SECTION}.ignoredSymbolPrefixes`,
} as const;

export const DEFAULTS = {
  enabled: true,
  maxLength: 72,
  extractionStrategy: 'firstSentence' as ExtractionStrategy,
  showInDetail: false,
  includeLanguages: ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
  fallbackProviderEnabled: false,
  ignoredSymbolPrefixes: [] as string[],
} as const;

export type ExtractionStrategy = 'firstSentence' | 'firstLine' | 'full';
