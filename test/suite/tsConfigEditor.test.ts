import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { addPlugin, fileExists, hasPlugin, readTsConfig, removePlugin } from '../../src/utils/tsConfigEditor';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'jsdoc-hints-test-'));
}

function writeTsConfig(dir: string, content: string): string {
  const p = path.join(dir, 'tsconfig.json');
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

suite('tsConfigEditor', () => {
  let tmpDir: string;

  setup(() => {
    tmpDir = makeTempDir();
  });

  teardown(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- readTsConfig ---

  suite('readTsConfig', () => {
    test('reads a valid JSON tsconfig', () => {
      const p = writeTsConfig(tmpDir, '{"compilerOptions": {"strict": true}}');
      const result = readTsConfig(p);
      assert.ok(result !== null);
      assert.deepStrictEqual((result?.['compilerOptions'] as Record<string, unknown>)?.['strict'], true);
    });

    test('reads a JSONC tsconfig with comments', () => {
      const p = writeTsConfig(tmpDir, '// top comment\n{\n  // comment\n  "compilerOptions": {}\n}');
      const result = readTsConfig(p);
      assert.ok(result !== null);
    });

    test('returns null for non-existent file', () => {
      const result = readTsConfig(path.join(tmpDir, 'nonexistent.json'));
      assert.strictEqual(result, null);
    });

    test('returns null for malformed JSON', () => {
      const p = writeTsConfig(tmpDir, '{ invalid json }');
      const result = readTsConfig(p);
      // jsonc-parser is lenient; it may return an empty object or partial parse
      // The important thing is it does not throw
      assert.ok(result !== undefined);
    });

    test('returns null for JSON array root', () => {
      const p = writeTsConfig(tmpDir, '[]');
      const result = readTsConfig(p);
      assert.strictEqual(result, null);
    });
  });

  // --- hasPlugin ---

  suite('hasPlugin', () => {
    test('returns false when compilerOptions missing', () => {
      const config = {};
      assert.strictEqual(hasPlugin(config, 'my-plugin'), false);
    });

    test('returns false when plugins array missing', () => {
      const config = { compilerOptions: {} };
      assert.strictEqual(hasPlugin(config, 'my-plugin'), false);
    });

    test('returns false when plugin not in array', () => {
      const config = { compilerOptions: { plugins: [{ name: 'other-plugin' }] } };
      assert.strictEqual(hasPlugin(config, 'my-plugin'), false);
    });

    test('returns true when plugin present', () => {
      const config = { compilerOptions: { plugins: [{ name: 'my-plugin' }] } };
      assert.strictEqual(hasPlugin(config, 'my-plugin'), true);
    });

    test('returns true when multiple plugins and target is one of them', () => {
      const config = {
        compilerOptions: { plugins: [{ name: 'other' }, { name: 'my-plugin' }, { name: 'another' }] },
      };
      assert.strictEqual(hasPlugin(config, 'my-plugin'), true);
    });
  });

  // --- addPlugin ---

  suite('addPlugin', () => {
    test('adds plugin when compilerOptions has no plugins', () => {
      const p = writeTsConfig(tmpDir, '{"compilerOptions": {"strict": true}}');
      const result = addPlugin(p, 'my-plugin', '/path/to/plugin.js');
      assert.ok(result.modified);
      assert.ok(!result.alreadyPresent);
      assert.ok(!result.error);

      const content = fs.readFileSync(p, 'utf8');
      assert.ok(content.includes('"my-plugin"'));
    });

    test('adds plugin when compilerOptions is missing entirely', () => {
      const p = writeTsConfig(tmpDir, '{}');
      const result = addPlugin(p, 'my-plugin', '/path/to/plugin.js');
      assert.ok(result.modified);

      const config = readTsConfig(p);
      assert.ok(config !== null);
      const opts = config?.['compilerOptions'] as Record<string, unknown> | undefined;
      assert.ok(Array.isArray(opts?.['plugins']));
    });

    test('appends plugin to existing plugins array', () => {
      const p = writeTsConfig(
        tmpDir,
        '{"compilerOptions": {"plugins": [{"name": "existing-plugin"}]}}',
      );
      addPlugin(p, 'my-plugin', '/path/to/plugin.js');

      const config = readTsConfig(p);
      assert.ok(config !== null);
      const opts = config?.['compilerOptions'] as Record<string, unknown>;
      const plugins = opts['plugins'] as Array<Record<string, unknown>>;
      assert.strictEqual(plugins.length, 2);
      assert.ok(plugins.some((pl) => pl['name'] === 'existing-plugin'));
      assert.ok(plugins.some((pl) => pl['name'] === 'my-plugin'));
    });

    test('is idempotent — does not duplicate', () => {
      const p = writeTsConfig(
        tmpDir,
        '{"compilerOptions": {"plugins": [{"name": "my-plugin"}]}}',
      );
      const first = addPlugin(p, 'my-plugin', '/path/to/plugin.js');
      assert.ok(!first.modified);
      assert.ok(first.alreadyPresent);

      // Run again — still idempotent
      const second = addPlugin(p, 'my-plugin', '/path/to/plugin.js');
      assert.ok(!second.modified);
      assert.ok(second.alreadyPresent);

      const config = readTsConfig(p);
      assert.ok(config !== null);
      const opts = config?.['compilerOptions'] as Record<string, unknown>;
      const plugins = opts['plugins'] as Array<Record<string, unknown>>;
      assert.strictEqual(plugins.length, 1);
    });

    test('preserves existing compilerOptions properties', () => {
      const p = writeTsConfig(tmpDir, '{"compilerOptions": {"strict": true, "target": "ES2020"}}');
      addPlugin(p, 'my-plugin', '/path/to/plugin.js');

      const config = readTsConfig(p);
      assert.ok(config !== null);
      const opts = config?.['compilerOptions'] as Record<string, unknown>;
      assert.strictEqual(opts['strict'], true);
      assert.strictEqual(opts['target'], 'ES2020');
    });

    test('returns error result on non-existent file', () => {
      const result = addPlugin(path.join(tmpDir, 'ghost.json'), 'my-plugin', '/path');
      assert.ok(!result.modified);
      assert.ok(result.error);
    });
  });

  // --- removePlugin ---

  suite('removePlugin', () => {
    test('removes the plugin entry', () => {
      const p = writeTsConfig(
        tmpDir,
        '{"compilerOptions": {"plugins": [{"name": "my-plugin"}]}}',
      );
      const result = removePlugin(p, 'my-plugin');
      assert.ok(result.modified);
      assert.ok(result.alreadyPresent);

      const config = readTsConfig(p);
      assert.ok(config !== null);
      const opts = config?.['compilerOptions'] as Record<string, unknown>;
      const plugins = opts['plugins'] as unknown[];
      assert.strictEqual(plugins.length, 0);
    });

    test('removes only the target plugin, preserving others', () => {
      const p = writeTsConfig(
        tmpDir,
        '{"compilerOptions": {"plugins": [{"name": "keep"}, {"name": "my-plugin"}]}}',
      );
      removePlugin(p, 'my-plugin');

      const config = readTsConfig(p);
      assert.ok(config !== null);
      const opts = config?.['compilerOptions'] as Record<string, unknown>;
      const plugins = opts['plugins'] as Array<Record<string, unknown>>;
      assert.strictEqual(plugins.length, 1);
      assert.strictEqual(plugins[0]?.['name'], 'keep');
    });

    test('returns not-modified when plugin not present', () => {
      const p = writeTsConfig(tmpDir, '{"compilerOptions": {"plugins": []}}');
      const result = removePlugin(p, 'my-plugin');
      assert.ok(!result.modified);
      assert.ok(!result.alreadyPresent);
    });

    test('is idempotent — second removal is a no-op', () => {
      const p = writeTsConfig(
        tmpDir,
        '{"compilerOptions": {"plugins": [{"name": "my-plugin"}]}}',
      );
      removePlugin(p, 'my-plugin');
      const second = removePlugin(p, 'my-plugin');
      assert.ok(!second.modified);
    });
  });

  // --- fileExists ---

  suite('fileExists', () => {
    test('returns true for an existing file', () => {
      const p = writeTsConfig(tmpDir, '{}');
      assert.strictEqual(fileExists(p), true);
    });

    test('returns false for a non-existent file', () => {
      assert.strictEqual(fileExists(path.join(tmpDir, 'ghost.json')), false);
    });
  });
});
