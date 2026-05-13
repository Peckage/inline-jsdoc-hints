/**
 * TypeScript Language Service Plugin
 *
 * This module is loaded by tsserver in-process. It wraps getCompletionsAtPosition
 * to inject JSDoc summary text into CompletionEntry.labelDetails.description,
 * making it visible inline in the VS Code completion list row.
 *
 * Constraints:
 *   - Must be a CJS module (tsserver requires it)
 *   - Must never throw — errors must be caught so tsserver is never destabilised
 *   - Must be zero-copy: reuse already-computed TS analysis, no second pass
 */

import type * as ts from 'typescript/lib/tsserverlibrary';

interface PluginConfig {
  enabled?: boolean;
  maxLength?: number;
  extractionStrategy?: 'firstSentence' | 'firstLine' | 'full';
  showInDetail?: boolean;
  ignoredSymbolPrefixes?: string[];
}

const DEFAULT_MAX_LENGTH = 72;
const DEFAULT_STRATEGY: NonNullable<PluginConfig['extractionStrategy']> = 'firstSentence';

function init(modules: { typescript: typeof ts }): ts.server.PluginModule {
  const typescript = modules.typescript;

  function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    const config: PluginConfig = (info.config as PluginConfig | undefined) ?? {};
    const proxy = createProxy(info.languageService);

    proxy.getCompletionsAtPosition = (
      fileName: string,
      position: number,
      options: ts.GetCompletionsAtPositionOptions | undefined,
    ): ts.WithMetadata<ts.CompletionInfo> | undefined => {
      try {
        return getCompletionsAtPosition(info, config, fileName, position, options);
      } catch {
        return info.languageService.getCompletionsAtPosition(fileName, position, options);
      }
    };

    return proxy;
  }

  function getCompletionsAtPosition(
    info: ts.server.PluginCreateInfo,
    config: PluginConfig,
    fileName: string,
    position: number,
    options: ts.GetCompletionsAtPositionOptions | undefined,
  ): ts.WithMetadata<ts.CompletionInfo> | undefined {
    const enabled = config.enabled ?? true;
    if (!enabled) {
      return info.languageService.getCompletionsAtPosition(fileName, position, options);
    }

    const original = info.languageService.getCompletionsAtPosition(fileName, position, options);
    if (!original) {
      return original;
    }

    const maxLength = config.maxLength ?? DEFAULT_MAX_LENGTH;
    const strategy = config.extractionStrategy ?? DEFAULT_STRATEGY;
    const ignoredPrefixes = config.ignoredSymbolPrefixes ?? [];
    const showInDetail = config.showInDetail ?? false;

    const enhanced = original.entries.map((entry) => {
      try {
        return enhanceEntry(info, config, fileName, position, entry, {
          maxLength,
          strategy,
          ignoredPrefixes,
          showInDetail,
        });
      } catch {
        return entry;
      }
    });

    return { ...original, entries: enhanced };
  }

  interface EnhanceOptions {
    maxLength: number;
    strategy: NonNullable<PluginConfig['extractionStrategy']>;
    ignoredPrefixes: string[];
    showInDetail: boolean;
  }

  function enhanceEntry(
    info: ts.server.PluginCreateInfo,
    _config: PluginConfig,
    fileName: string,
    position: number,
    entry: ts.CompletionEntry,
    opts: EnhanceOptions,
  ): ts.CompletionEntry {
    if (opts.ignoredPrefixes.some((prefix) => entry.name.startsWith(prefix))) {
      return entry;
    }

    // Skip entries that already have labelDetails populated by tsserver
    if (entry.labelDetails?.description) {
      return entry;
    }

    const details = info.languageService.getCompletionEntryDetails(
      fileName,
      position,
      entry.name,
      undefined,
      entry.source,
      undefined,
      entry.data,
    );

    if (!details?.documentation?.length) {
      return entry;
    }

    const rawDoc = displayPartsToText(details.documentation);
    if (!rawDoc) {
      return entry;
    }

    const description = extractDescriptionInPlugin(rawDoc, opts.strategy, opts.maxLength);
    if (!description) {
      return entry;
    }

    if (opts.showInDetail) {
      return {
        ...entry,
        kindModifiers: entry.kindModifiers,
      };
    }

    return {
      ...entry,
      labelDetails: {
        ...(entry.labelDetails ?? {}),
        description,
      },
    };
  }

  function displayPartsToText(parts: ts.SymbolDisplayPart[]): string {
    return parts.map((p) => p.text).join('');
  }

  function extractDescriptionInPlugin(
    raw: string,
    strategy: NonNullable<PluginConfig['extractionStrategy']>,
    maxLength: number,
  ): string {
    // Strip @param / @returns / @throws lines
    let text = raw.replace(/^\s*@\w+.*$/gm, '');
    // Strip HTML tags
    text = text.replace(/<[^>]+>/g, '');
    // Strip markdown fenced code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    // Strip inline code — keep content
    text = text.replace(/`([^`]*)`/g, '$1');
    // Collapse blank lines
    text = text.replace(/\n{2,}/g, '\n').trim();

    if (!text) {
      return '';
    }

    let extracted: string;
    switch (strategy) {
      case 'firstSentence': {
        const match = text.match(/^(.*?\.)\s/s);
        if (match?.[1]) {
          extracted = match[1].replace(/\.$/, '').trim();
        } else {
          const nl = text.indexOf('\n');
          extracted = (nl === -1 ? text : text.slice(0, nl)).replace(/\.$/, '').trim();
        }
        break;
      }
      case 'firstLine': {
        const nl = text.indexOf('\n');
        extracted = (nl === -1 ? text : text.slice(0, nl)).trim();
        break;
      }
      case 'full':
        extracted = text;
        break;
    }

    if (extracted.length <= maxLength) {
      return extracted;
    }
    return `${extracted.slice(0, maxLength - 1)}…`;
  }

  function createProxy(languageService: ts.LanguageService): ts.LanguageService {
    const proxy = Object.create(null) as ts.LanguageService;
    const svc = languageService as unknown as Record<string, unknown>;
    for (const key of Object.keys(svc)) {
      const original = svc[key];
      if (typeof original === 'function') {
        (proxy as unknown as Record<string, unknown>)[key] = (...args: unknown[]): unknown =>
          (original as (...a: unknown[]) => unknown).apply(languageService, args);
      }
    }
    return proxy;
  }

  function getExternalFiles(_project: ts.server.Project): string[] {
    return [];
  }

  return { create, getExternalFiles };
}

export { init as default };
