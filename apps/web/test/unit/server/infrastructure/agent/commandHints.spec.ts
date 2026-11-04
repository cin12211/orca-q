import { describe, expect, it } from 'vitest';
// Test the buildMessageWithCommandHints function logic
// Since it's a module-private function, we test the logic directly
import {
  getAgentCommandOptionsByIds,
  type AgentCommandOptionId,
} from '~/components/modules/agent/constants/command-options';

function buildMessageWithCommandHints(
  text: string,
  commandOptionIds: AgentCommandOptionId[]
): string {
  if (commandOptionIds.length === 0) return text;

  const options = getAgentCommandOptionsByIds(commandOptionIds);
  const hints = options.map(o => `- ${o.label}: ${o.promptHint}`).join('\n');

  return `[Tool hints]\n${hints}\n\n${text}`;
}

describe('buildMessageWithCommandHints', () => {
  it('returns original text when no options selected', () => {
    const result = buildMessageWithCommandHints('Show me users', []);
    expect(result).toBe('Show me users');
  });

  it('prepends tool hints for a single option', () => {
    const result = buildMessageWithCommandHints('Show me users', [
      'generate-query',
    ]);
    expect(result).toContain('[Tool hints]');
    expect(result).toContain('Generate Query');
    expect(result).toContain('Show me users');
  });

  it('prepends hints for multiple options', () => {
    const result = buildMessageWithCommandHints('Describe the users table', [
      'generate-query',
      'describe-table',
    ]);
    expect(result).toContain('[Tool hints]');
    expect(result).toContain('Generate Query');
    expect(result).toContain('Describe Table');
    expect(result).toContain('Describe the users table');
  });

  it('includes promptHint in the output', () => {
    const result = buildMessageWithCommandHints('test', ['generate-query']);
    expect(result).toContain('Prefer generate_query first');
  });

  it('places user text after the tool hints', () => {
    const result = buildMessageWithCommandHints('my question', [
      'generate-query',
    ]);
    const hintEnd = result.indexOf('\n\n');
    const textStart = result.indexOf('my question');
    expect(textStart).toBeGreaterThan(hintEnd);
  });
});
