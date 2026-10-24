export interface SqlServerBatch {
  sql: string;
  /** `GO 5` runs the preceding batch five times. */
  repeat: number;
}

const GO_LINE = /^\s*GO(?:\s+(\d+))?\s*(?:--.*)?$/i;

/**
 * Splits a T-SQL script on `GO` batch separators, the way sqlcmd/SSMS do.
 *
 * `GO` is a client-side command, not T-SQL, so the server rejects it. A line
 * counts as a separator only when it holds nothing but `GO` (optionally with a
 * repeat count and a trailing `--` comment) and is not inside a string literal,
 * quoted identifier, or block comment.
 */
export function splitSqlServerBatches(script: string): SqlServerBatch[] {
  const batches: SqlServerBatch[] = [];
  const lines = script.split(/\r?\n/);
  let current: string[] = [];
  let inBlockComment = false;
  let inString = false;
  let inBracket = false;

  const flush = (repeat: number) => {
    const sql = current.join('\n');
    if (sql.trim()) {
      batches.push({ sql, repeat: Math.max(1, repeat) });
    }
    current = [];
  };

  for (const line of lines) {
    const isSeparator =
      !inBlockComment && !inString && !inBracket && GO_LINE.test(line);

    if (isSeparator) {
      const match = GO_LINE.exec(line);
      flush(match?.[1] ? Number(match[1]) : 1);
      continue;
    }

    current.push(line);

    // Track multi-line constructs so a `GO` inside them is left alone.
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (inBlockComment) {
        if (char === '*' && next === '/') {
          inBlockComment = false;
          index += 1;
        }
        continue;
      }

      if (inString) {
        if (char === "'") {
          if (next === "'") {
            index += 1;
          } else {
            inString = false;
          }
        }
        continue;
      }

      if (inBracket) {
        if (char === ']') {
          if (next === ']') {
            index += 1;
          } else {
            inBracket = false;
          }
        }
        continue;
      }

      if (char === '-' && next === '-') {
        break;
      }

      if (char === '/' && next === '*') {
        inBlockComment = true;
        index += 1;
      } else if (char === "'") {
        inString = true;
      } else if (char === '[') {
        inBracket = true;
      }
    }
  }

  flush(1);

  return batches;
}
