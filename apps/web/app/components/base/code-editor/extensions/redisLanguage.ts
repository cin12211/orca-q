/**
 * Redis Language Extension for CodeMirror 6
 *
 * Provides syntax highlighting and autocompletion for Redis commands
 */
import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';
import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import redisCommandDocs from './redisCommands.json';

interface RedisCommandDoc {
  summary?: string;
  tokens: string[];
}

const REDIS_COMMAND_DOCS = redisCommandDocs as Record<string, RedisCommandDoc>;

interface RedisState {
  inString: boolean;
  stringDelim: string | null;
  commandName: string | null;
  commandWordCount: number;
  commandTokens: Set<string>;
  wordPosition: number;
  hasContentOnLine: boolean;
}

function findCommand(text: string): string | null {
  const tokens = text.trim().toLowerCase().split(/\s+/).filter(Boolean);

  while (tokens.length > 0) {
    const candidate = tokens.join(' ');

    if (candidate in REDIS_COMMAND_DOCS) {
      return candidate;
    }

    tokens.pop();
  }

  return null;
}

export const redisStreamParser = StreamLanguage.define<RedisState>({
  name: 'redis',

  startState(): RedisState {
    return {
      inString: false,
      stringDelim: null,
      commandName: null,
      commandWordCount: 0,
      commandTokens: new Set(),
      wordPosition: 0,
      hasContentOnLine: false,
    };
  },

  token(stream, state) {
    if (stream.sol()) {
      state.commandName = null;
      state.commandWordCount = 0;
      state.commandTokens = new Set();
      state.wordPosition = 0;
      state.hasContentOnLine = false;
    }

    if (stream.eatSpace()) return null;

    if (!state.hasContentOnLine && stream.match(/^#.*/)) return 'comment';

    if (state.inString) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === '\\') {
          stream.next();
        } else if (ch === state.stringDelim) {
          state.inString = false;
          state.stringDelim = null;
          break;
        }
      }
      return 'string';
    }

    if (stream.match(/^["']/)) {
      state.inString = true;
      state.stringDelim = stream.current();
      state.hasContentOnLine = true;
      return 'string';
    }

    if (stream.match(/^-?\d+(\.\d+)?/)) {
      state.hasContentOnLine = true;
      return 'number';
    }

    if (stream.match(/^[^\s"']+/)) {
      const word = stream.current();
      const wordLower = word.toLowerCase();
      state.hasContentOnLine = true;

      if (!state.commandName) {
        const command = findCommand(stream.string);
        if (command) {
          state.commandName = command;
          state.commandWordCount = command.split(' ').length;
          state.commandTokens = new Set(
            REDIS_COMMAND_DOCS[command].tokens.map(token => token.toLowerCase())
          );
        }
      }

      const isCommandWord = state.wordPosition < state.commandWordCount;
      const isKeyword = state.commandTokens.has(wordLower);

      state.wordPosition++;

      return isCommandWord || isKeyword ? 'keyword' : 'atom';
    }

    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: '#' },
    closeBrackets: { brackets: ['(', '[', '{', "'", '"'] },
  },
});

export function redisCompletion(
  context: CompletionContext
): CompletionResult | null {
  const currentWord = context.matchBefore(/\S*/);
  const currentLine = context.state.doc.lineAt(context.pos);
  const textBeforeCursor = currentLine.text.slice(
    0,
    context.pos - currentLine.from
  );

  if (!currentWord) {
    return null;
  }

  const completedWords = [...textBeforeCursor.matchAll(/\S+\s+/g)].length;
  const trimmedLine = textBeforeCursor.trim();
  const trimmedLineLower = trimmedLine.toLowerCase();
  const visited = new Set<string>();
  const options: Completion[] = [];

  for (const [key, info] of Object.entries(REDIS_COMMAND_DOCS)) {
    if (!key.startsWith(trimmedLineLower)) {
      continue;
    }

    const parts = key.split(' ').slice(completedWords, completedWords + 1);
    const label = parts.join(' ');

    if (!parts.length || visited.has(label)) {
      continue;
    }

    visited.add(label);
    options.push({
      label,
      type: completedWords > 0 ? 'method' : 'function',
      info: info.summary ?? '',
    });
  }

  const matchedCommand = findCommand(trimmedLine);

  if (matchedCommand) {
    const info = REDIS_COMMAND_DOCS[matchedCommand];
    for (const token of info.tokens) {
      if (visited.has(token)) {
        continue;
      }

      visited.add(token);
      options.push({
        label: token,
        type: 'keyword',
      });
    }
  }

  return { options, from: currentWord.from };
}

export function redis() {
  return new LanguageSupport(redisStreamParser, [
    redisStreamParser.data.of({
      autocomplete: redisCompletion,
    }),
  ]);
}
