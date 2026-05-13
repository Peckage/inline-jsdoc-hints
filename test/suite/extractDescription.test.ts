import * as assert from 'assert';
import { extractDescription } from '../../src/utils/extractDescription';

suite('extractDescription', () => {
  // --- firstSentence strategy ---

  suite('firstSentence strategy', () => {
    test('extracts first sentence ending with period-space', () => {
      const result = extractDescription('Renders the component. Additional info.', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, 'Renders the component');
    });

    test('returns whole text when no period-space found', () => {
      const result = extractDescription('No period here', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, 'No period here');
    });

    test('returns empty string for empty input', () => {
      const result = extractDescription('', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, '');
    });

    test('truncates with ellipsis when longer than maxLength', () => {
      const long = 'A'.repeat(100);
      const result = extractDescription(long, {
        strategy: 'firstSentence',
        maxLength: 20,
      });
      assert.strictEqual(result.length, 20);
      assert.ok(result.endsWith('…'));
    });

    test('strips HTML tags', () => {
      const result = extractDescription('<p>Hello world</p>', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, 'Hello world');
    });

    test('strips markdown fenced code blocks', () => {
      const result = extractDescription('Does things.\n\n```ts\nconst x = 1;\n```\n\nMore.', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, 'Does things');
    });

    test('preserves inline code content (strips backticks)', () => {
      const result = extractDescription('Calls the `render` method', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, 'Calls the render method');
    });

    test('strips @param lines', () => {
      const result = extractDescription(
        'Creates a user.\n@param name The user name\n@returns The created user',
        {
          strategy: 'firstSentence',
          maxLength: 80,
        },
      );
      assert.strictEqual(result, 'Creates a user');
    });

    test('handles multi-line text', () => {
      const result = extractDescription('Line one\nLine two\nLine three', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, 'Line one');
    });

    test('handles text with only @param lines', () => {
      const result = extractDescription('@param foo The foo\n@returns bar', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, '');
    });
  });

  // --- firstLine strategy ---

  suite('firstLine strategy', () => {
    test('extracts first line', () => {
      const result = extractDescription('First line\nSecond line', {
        strategy: 'firstLine',
        maxLength: 80,
      });
      assert.strictEqual(result, 'First line');
    });

    test('returns whole text when no newline', () => {
      const result = extractDescription('Only one line', {
        strategy: 'firstLine',
        maxLength: 80,
      });
      assert.strictEqual(result, 'Only one line');
    });

    test('returns empty string for empty input', () => {
      const result = extractDescription('', {
        strategy: 'firstLine',
        maxLength: 80,
      });
      assert.strictEqual(result, '');
    });

    test('truncates long first line', () => {
      const result = extractDescription('A'.repeat(50), {
        strategy: 'firstLine',
        maxLength: 20,
      });
      assert.strictEqual(result.length, 20);
      assert.ok(result.endsWith('…'));
    });
  });

  // --- full strategy ---

  suite('full strategy', () => {
    test('returns full cleaned text', () => {
      const input = 'First sentence. Second sentence.\n\nThird paragraph.';
      const result = extractDescription(input, {
        strategy: 'full',
        maxLength: 200,
      });
      assert.ok(result.includes('First sentence'));
      assert.ok(result.includes('Second sentence'));
    });

    test('respects maxLength even in full mode', () => {
      const result = extractDescription('A'.repeat(200), {
        strategy: 'full',
        maxLength: 50,
      });
      assert.strictEqual(result.length, 50);
      assert.ok(result.endsWith('…'));
    });
  });

  // --- edge cases ---

  suite('edge cases', () => {
    test('handles whitespace-only input', () => {
      const result = extractDescription('   \n   \n   ', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, '');
    });

    test('handles text that is exactly maxLength', () => {
      const text = 'A'.repeat(20);
      const result = extractDescription(text, {
        strategy: 'firstSentence',
        maxLength: 20,
      });
      assert.strictEqual(result, text);
      assert.strictEqual(result.length, 20);
    });

    test('handles complex HTML with attributes', () => {
      const result = extractDescription('<a href="https://example.com">link</a>', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, 'link');
    });

    test('handles nested HTML tags', () => {
      const result = extractDescription('<strong><em>Important</em></strong> note', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.strictEqual(result, 'Important note');
    });

    test('sentence extraction does not include the trailing period', () => {
      const result = extractDescription('Short desc. More stuff.', {
        strategy: 'firstSentence',
        maxLength: 80,
      });
      assert.ok(!result.endsWith('.'));
      assert.strictEqual(result, 'Short desc');
    });
  });
});
