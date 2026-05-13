import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME } from '../constants';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  }
  return channel;
}

export function log(message: string): void {
  getOutputChannel().appendLine(`[${timestamp()}] ${message}`);
}

export function logError(message: string, error?: unknown): void {
  const detail = formatError(error);
  getOutputChannel().appendLine(`[${timestamp()}] ERROR: ${message}${detail}`);
}

export function disposeOutputChannel(): void {
  channel?.dispose();
  channel = undefined;
}

function timestamp(): string {
  return new Date().toISOString();
}

function formatError(error: unknown): string {
  if (error === undefined || error === null) {
    return '';
  }
  if (error instanceof Error) {
    return `: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }
  return `: ${String(error)}`;
}
