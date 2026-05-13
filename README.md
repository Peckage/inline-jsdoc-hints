# Inline JSDoc Hints

> Surface JSDoc summary text **directly inside the VS Code completion list** —
> the grayed text to the right of the item label — without expanding the
> documentation side panel.

![Inline JSDoc Hints in action](docs/images/preview.png)

---

## Features

- **Zero-friction discovery** — the first sentence of a symbol's JSDoc comment
  appears inline next to its name in the completion list, so you know *why* a
  function exists before you select it.
- **TypeScript Language Service Plugin** (primary path) — runs inside `tsserver`
  itself, so there is no duplicate-item overhead and no extra round-trips.
- **Fallback CompletionItemProvider** (optional) — for non-TS workspaces or when
  the plugin is not yet loaded.
- **Non-destructive tsconfig editing** — uses `jsonc-parser` to preserve
  comments and formatting when modifying `tsconfig.json`.
- **Works in remote/SSH/WSL workspaces** — path resolution uses
  `workspaceFolders`, not `__dirname`.

### Screenshots

| Without extension | With extension |
|---|---|
| ![before](docs/images/before.png) | ![after](docs/images/after.png) |

---

## Installation

### VS Code Marketplace

Search for **"Inline JSDoc Hints"** in the Extensions panel, or run:

```
ext install ia-sol.inline-jsdoc-hints
```

### Manual (VSIX)

1. Download the `.vsix` from the [Releases](https://github.com/ia-sol/inline-jsdoc-hints/releases) page.
2. In VS Code: **Extensions** → **⋯** → **Install from VSIX…**

---

## How the TypeScript Plugin Mechanism Works

VS Code ships a bundled TypeScript language server (`tsserver`). It supports
a plugin API (see the
[official wiki](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin))
that allows extensions to run code **inside** tsserver's process and wrap its
service methods.

This extension registers a plugin that wraps `getCompletionsAtPosition`. When
tsserver computes a completion list it passes the results through the plugin,
which:

1. Calls `getCompletionEntryDetails` for each entry (reusing already-cached
   symbol information — no second analysis pass).
2. Extracts the first sentence from the `documentation` display-parts array.
3. Stores it in `entry.labelDetails.description`.

Because `labelDetails.description` is the field VS Code renders as the grayed
inline text in each completion row, the hint appears without any extra user
interaction.

The plugin must be declared in your workspace's `tsconfig.json` under
`compilerOptions.plugins` so that VS Code's TypeScript extension picks it up
and passes it to tsserver.

---

## Setup

When you open a TypeScript workspace the extension will offer to add the plugin
automatically. You can also trigger this manually:

**Command Palette** → `Inline JSDoc Hints: Add Plugin to tsconfig.json`

You will be shown exactly what will be written before anything changes.
After confirmation, a notification will ask you to restart the TS server.

To undo: **Command Palette** → `Inline JSDoc Hints: Remove Plugin from tsconfig.json`

---

## Configuration

All settings are under the `inlineJsdocHints` prefix.

| Setting | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Master on/off switch. |
| `maxLength` | `integer` | `72` | Max chars shown. Truncated with `…`. Range: 20–120. |
| `extractionStrategy` | `string` | `"firstSentence"` | See below. |
| `showInDetail` | `boolean` | `false` | Append to type-signature `detail` instead of `labelDetails`. |
| `includeLanguages` | `string[]` | `["typescript","typescriptreact","javascript","javascriptreact"]` | Languages for the fallback provider. |
| `fallbackProviderEnabled` | `boolean` | `false` | Enable the fallback `CompletionItemProvider`. |
| `ignoredSymbolPrefixes` | `string[]` | `[]` | Skip items whose label starts with these strings. |

### Extraction strategies

| Value | Behaviour |
|---|---|
| `firstSentence` | Text up to the first `". "` (or end of text). |
| `firstLine` | Text up to the first newline. |
| `full` | Entire JSDoc summary, respecting `maxLength`. |

### Example `settings.json`

```jsonc
{
  "inlineJsdocHints.maxLength": 60,
  "inlineJsdocHints.extractionStrategy": "firstLine",
  "inlineJsdocHints.ignoredSymbolPrefixes": ["__", "$internal"]
}
```

---

## Troubleshooting

### Verify the plugin is loaded

Open the **Output** panel and select **"Inline JSDoc Hints"** from the dropdown.
You should see an activation message and any errors.

To check that tsserver has actually loaded the plugin, open a `.ts` file and
run **TypeScript: Open TS Server Log** from the Command Palette. Search for
`inline-jsdoc-hints` in the log — you should see it listed under plugins.

### Hints are not appearing

1. Confirm `inlineJsdocHints.enabled` is `true`.
2. Run **Add Plugin to tsconfig.json** if you have not done so.
3. After modifying `tsconfig.json`, restart tsserver:
   **Command Palette** → `TypeScript: Restart TS Server`
4. Check the Output channel for error messages.

### Force-restart tsserver

**Command Palette** → `TypeScript: Restart TS Server`

Or click the "Restart TS Server" button in the notification that appears after
`tsconfig.json` is modified by this extension.

### Fallback provider shows duplicate items

The fallback provider is disabled by default. If you have enabled it in a
workspace that also has the TS plugin active you may see duplicates. Disable the
fallback via `inlineJsdocHints.fallbackProviderEnabled: false`.

---

## Contributing

```bash
git clone https://github.com/ia-sol/inline-jsdoc-hints.git
cd inline-jsdoc-hints
npm install
npm run build   # production bundles
npm run dev     # watch mode
npm run test    # unit + integration tests
npm run lint    # ESLint
npm run format  # Prettier
```

PRs are welcome. Please include tests for any new behaviour.

---

## License

MIT — see [LICENSE](LICENSE).
