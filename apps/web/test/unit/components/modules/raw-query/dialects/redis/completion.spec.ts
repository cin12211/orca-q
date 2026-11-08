/**
 * @vitest-environment happy-dom
 */
import { ensureSyntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, it, expect } from 'vitest';
import {
  redis,
  redisCompletion,
} from '~/components/base/code-editor/extensions/redisLanguage';
import {
  getCompletionResult,
  hasOption,
} from '../../helpers/test-editor-setup';

function createRedisTestState(contentWithCursor: string) {
  const cursor = contentWithCursor.indexOf('!');
  const content =
    cursor > -1
      ? contentWithCursor.slice(0, cursor) + contentWithCursor.slice(cursor + 1)
      : contentWithCursor;
  const pos = cursor > -1 ? cursor : content.length;

  const state = EditorState.create({
    doc: content,
    extensions: [redis()],
    selection: { anchor: pos },
  });

  ensureSyntaxTree(state, content.length, 5000);
  return { state, pos };
}

describe('Redis Completion', () => {
  it('1. should suggest basic commands when typing', async () => {
    const sqlText = `ge!`;
    const { state, pos } = createRedisTestState(sqlText);

    // Test the internal completion logic
    const result = await getCompletionResult(state, pos, redisCompletion);

    // redisCommands.json should contain get
    expect(hasOption(result, 'get')).toBe(true);
    expect(hasOption(result, 'getset')).toBe(true);
    // Should not contain non-matching commands
    expect(hasOption(result, 'set')).toBe(false);
  });

  it('2. should suggest keywords/tokens after a valid command', async () => {
    const sqlText = `bitcount !`;
    const { state, pos } = createRedisTestState(sqlText);

    const result = await getCompletionResult(state, pos, redisCompletion);

    expect(hasOption(result, 'byte')).toBe(true);
  });

  it('3. should complete case-insensitive typed commands', async () => {
    const sqlText = `se!`;
    const { state, pos } = createRedisTestState(sqlText);

    const result = await getCompletionResult(state, pos, redisCompletion);

    // It matches "SET" even if typed lowercase
    expect(hasOption(result, 'set')).toBe(true);
    expect(hasOption(result, 'select')).toBe(true);
  });

  it('4. should not suggest if word is fully typed and space follows without cursor adjacent', async () => {
    const sqlText = `bitcount  !`;
    const { state, pos } = createRedisTestState(sqlText);

    const result = await getCompletionResult(state, pos, redisCompletion);
    // It should suggest the next argument tokens (e.g. "byte"), not standard commands
    expect(hasOption(result, 'bitcount')).toBe(false);
    expect(hasOption(result, 'byte')).toBe(true);
  });

  it('5. should handle multi-word commands', async () => {
    const sqlText = `client s!`;
    const { state, pos } = createRedisTestState(sqlText);

    const result = await getCompletionResult(state, pos, redisCompletion);
    // e.g. CLIENT SETNAME -> client setname
    expect(hasOption(result, 'setname')).toBe(true);
  });
});
