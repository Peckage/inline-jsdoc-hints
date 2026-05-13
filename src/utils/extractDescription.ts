import type { ExtractionStrategy } from '../constants';

export interface ExtractOptions {
  strategy: ExtractionStrategy;
  maxLength: number;
}

/**
 * Extracts a human-readable inline hint from a raw JSDoc/documentation string.
 * Returns an empty string when nothing useful can be extracted.
 */
export function extractDescription(raw: string, options: ExtractOptions): string {
  const cleaned = clean(raw);
  if (!cleaned) {
    return '';
  }

  const extracted = applyStrategy(cleaned, options.strategy);
  return truncate(extracted, options.maxLength);
}

function clean(raw: string): string {
  let text = raw;

  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Strip markdown fenced code blocks
  text = text.replace(/```[\s\S]*?```/g, '');

  // Strip inline code (backticks) — keep the content
  text = text.replace(/`([^`]*)`/g, '$1');

  // Strip @param, @returns, @throws, and other tag lines
  text = text.replace(/^\s*@\w+.*$/gm, '');

  // Collapse multiple blank lines into one
  text = text.replace(/\n{2,}/g, '\n');

  // Trim leading/trailing whitespace
  text = text.trim();

  return text;
}

function applyStrategy(text: string, strategy: ExtractionStrategy): string {
  switch (strategy) {
    case 'firstSentence':
      return extractFirstSentence(text);
    case 'firstLine':
      return extractFirstLine(text);
    case 'full':
      return text;
  }
}

function extractFirstSentence(text: string): string {
  // Match up to and including the first ". " (period followed by whitespace).
  const match = text.match(/^(.*?\.)\s/s);
  if (match?.[1]) {
    // Drop the trailing period for cleaner display
    return match[1].replace(/\.$/, '').trim();
  }

  // No ". " found — use the entire first line, stripping any trailing period
  return extractFirstLine(text).replace(/\.$/, '').trim();
}

function extractFirstLine(text: string): string {
  const newlineIdx = text.indexOf('\n');
  const line = newlineIdx === -1 ? text : text.slice(0, newlineIdx);
  return line.trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}
