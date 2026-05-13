import * as fs from 'fs';
import * as path from 'path';
import * as jsoncParser from 'jsonc-parser';
import { log, logError } from './logger';

export interface PluginEntry {
  name: string;
  [key: string]: unknown;
}

export interface TsConfigEditResult {
  modified: boolean;
  alreadyPresent: boolean;
  error?: string;
}

/**
 * Reads the workspace tsconfig.json (JSONC-aware) and returns the parsed value.
 * Returns null when the file cannot be read or parsed.
 */
export function readTsConfig(tsconfigPath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(tsconfigPath, 'utf8');
    const errors: jsoncParser.ParseError[] = [];
    const parsed = jsoncParser.parse(content, errors) as unknown;
    if (errors.length > 0) {
      logError(`JSONC parse errors in ${tsconfigPath}`, errors);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      logError(`${tsconfigPath} does not contain a JSON object`);
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    logError(`Failed to read ${tsconfigPath}`, err);
    return null;
  }
}

/**
 * Checks whether the plugin named `pluginName` already exists in the
 * compilerOptions.plugins array of the given tsconfig.
 */
export function hasPlugin(config: Record<string, unknown>, pluginName: string): boolean {
  const compilerOptions = config['compilerOptions'];
  if (typeof compilerOptions !== 'object' || compilerOptions === null) {
    return false;
  }
  const opts = compilerOptions as Record<string, unknown>;
  const plugins = opts['plugins'];
  if (!Array.isArray(plugins)) {
    return false;
  }
  return plugins.some(
    (p) => typeof p === 'object' && p !== null && (p as Record<string, unknown>)['name'] === pluginName,
  );
}

/**
 * Adds a plugin entry to compilerOptions.plugins in the tsconfig.json file.
 * Uses jsonc-parser edit operations to preserve comments and formatting.
 * Returns a result indicating what happened.
 */
export function addPlugin(tsconfigPath: string, pluginName: string, distPath: string): TsConfigEditResult {
  try {
    const content = fs.readFileSync(tsconfigPath, 'utf8');
    const errors: jsoncParser.ParseError[] = [];
    const config = jsoncParser.parse(content, errors) as unknown;

    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      return { modified: false, alreadyPresent: false, error: 'tsconfig.json is not a valid JSON object' };
    }

    const cfg = config as Record<string, unknown>;

    if (hasPlugin(cfg, pluginName)) {
      log(`Plugin '${pluginName}' already present in ${tsconfigPath}`);
      return { modified: false, alreadyPresent: true };
    }

    const pluginEntry: PluginEntry = { name: pluginName, location: distPath };

    // Build the path into the document for jsonc-parser edits
    const compilerOptions = cfg['compilerOptions'];
    const hasCompilerOptions =
      typeof compilerOptions === 'object' && compilerOptions !== null && !Array.isArray(compilerOptions);

    const existingPlugins = hasCompilerOptions
      ? ((compilerOptions as Record<string, unknown>)['plugins'] ?? null)
      : null;
    const hasPluginsArray = Array.isArray(existingPlugins);

    let edits: jsoncParser.Edit[];

    if (!hasCompilerOptions) {
      // Create compilerOptions with plugins
      edits = jsoncParser.modify(content, ['compilerOptions'], { plugins: [pluginEntry] }, {});
    } else if (!hasPluginsArray) {
      // compilerOptions exists, but no plugins array
      edits = jsoncParser.modify(content, ['compilerOptions', 'plugins'], [pluginEntry], {});
    } else {
      // Append to existing plugins array
      const pluginsLength = (existingPlugins as unknown[]).length;
      edits = jsoncParser.modify(content, ['compilerOptions', 'plugins', pluginsLength], pluginEntry, {});
    }

    const newContent = jsoncParser.applyEdits(content, edits);
    fs.writeFileSync(tsconfigPath, newContent, 'utf8');
    log(`Plugin '${pluginName}' added to ${tsconfigPath}`);
    return { modified: true, alreadyPresent: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Failed to add plugin to ${tsconfigPath}`, err);
    return { modified: false, alreadyPresent: false, error: msg };
  }
}

/**
 * Removes the plugin entry with `pluginName` from compilerOptions.plugins.
 * Preserves comments and formatting via jsonc-parser.
 */
export function removePlugin(tsconfigPath: string, pluginName: string): TsConfigEditResult {
  try {
    const content = fs.readFileSync(tsconfigPath, 'utf8');
    const errors: jsoncParser.ParseError[] = [];
    const config = jsoncParser.parse(content, errors) as unknown;

    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      return { modified: false, alreadyPresent: false, error: 'tsconfig.json is not a valid JSON object' };
    }

    const cfg = config as Record<string, unknown>;
    if (!hasPlugin(cfg, pluginName)) {
      log(`Plugin '${pluginName}' not found in ${tsconfigPath}`);
      return { modified: false, alreadyPresent: false };
    }

    const compilerOptions = cfg['compilerOptions'] as Record<string, unknown>;
    const plugins = compilerOptions['plugins'] as unknown[];
    const idx = plugins.findIndex(
      (p) => typeof p === 'object' && p !== null && (p as Record<string, unknown>)['name'] === pluginName,
    );

    if (idx === -1) {
      return { modified: false, alreadyPresent: false };
    }

    const edits = jsoncParser.modify(content, ['compilerOptions', 'plugins', idx], undefined, {});
    const newContent = jsoncParser.applyEdits(content, edits);
    fs.writeFileSync(tsconfigPath, newContent, 'utf8');
    log(`Plugin '${pluginName}' removed from ${tsconfigPath}`);
    return { modified: true, alreadyPresent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Failed to remove plugin from ${tsconfigPath}`, err);
    return { modified: false, alreadyPresent: false, error: msg };
  }
}

/**
 * Resolves the absolute path to the workspace's tsconfig.json, or null when
 * no workspace folder is open.
 */
export function resolveTsConfigPath(workspaceFolderUri: string): string {
  return path.join(workspaceFolderUri, 'tsconfig.json');
}

/**
 * Returns true when a file exists at the given path.
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
