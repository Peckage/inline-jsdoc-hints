# Changelog

All notable changes to the "Inline JSDoc Hints" extension are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-14

### Added
- TypeScript Language Service Plugin that injects JSDoc summary text into
  `CompletionEntry.labelDetails.description`, making it visible inline in
  the VS Code completion list without opening the documentation side panel.
- Fallback `CompletionItemProvider` for non-TS workspaces and edge cases
  (disabled by default, enable via `inlineJsdocHints.fallbackProviderEnabled`).
- Command `inline-jsdoc-hints.addToTsConfig`: non-destructively adds the
  plugin entry to the workspace `tsconfig.json` with user confirmation.
- Command `inline-jsdoc-hints.removeFromTsConfig`: removes the plugin entry
  from the workspace `tsconfig.json`.
- Notification with "Restart TS Server" button whenever tsconfig changes require
  a tsserver restart.
- Configuration options:
  - `inlineJsdocHints.enabled`
  - `inlineJsdocHints.maxLength`
  - `inlineJsdocHints.extractionStrategy`
  - `inlineJsdocHints.showInDetail`
  - `inlineJsdocHints.includeLanguages`
  - `inlineJsdocHints.fallbackProviderEnabled`
  - `inlineJsdocHints.ignoredSymbolPrefixes`
- Full unit test suite for `extractDescription` and `tsConfigEditor` utilities.
- Integration test that activates the extension in a test workspace.
