import { DatabaseClientType } from '~/core/constants/database-client-type';

interface ParameterExtractor {
  extract(sql: string): string[];
}

class StandardColonExtractor implements ParameterExtractor {
  extract(sql: string): string[] {
    const params: string[] = [];
    let index = 0;

    while (index < sql.length) {
      const current = sql[index];
      const next = sql[index + 1];

      // Skip single quoted string
      if (current === "'") {
        index += 1;
        while (index < sql.length) {
          if (sql[index] === "'" && sql[index + 1] === "'") {
            index += 2;
            continue;
          }
          if (sql[index] === "'") {
            index += 1;
            break;
          }
          index += 1;
        }
        continue;
      }

      // Skip double quoted identifier
      if (current === '"') {
        index += 1;
        while (index < sql.length) {
          if (sql[index] === '"' && sql[index + 1] === '"') {
            index += 2;
            continue;
          }
          if (sql[index] === '"') {
            index += 1;
            break;
          }
          index += 1;
        }
        continue;
      }

      // Skip single-line comment
      if (current === '-' && next === '-') {
        index += 2;
        while (index < sql.length && sql[index] !== '\n') {
          index += 1;
        }
        continue;
      }

      // Skip multi-line comment
      if (current === '/' && next === '*') {
        index += 2;
        while (index < sql.length) {
          if (sql[index] === '*' && sql[index + 1] === '/') {
            index += 2;
            break;
          }
          index += 1;
        }
        continue;
      }

      // Match parameter starting with ':'
      if (current === ':') {
        // Check if it's '::' (typecast)
        if (next === ':') {
          index += 2;
          continue;
        }
        // Check preceding character
        const prevChar = index > 0 ? sql[index - 1] : '';
        if (/[a-zA-Z0-9_]/.test(prevChar)) {
          index += 1;
          continue;
        }

        if (next && /[a-zA-Z_]/.test(next)) {
          // Find the full identifier
          let paramName = '';
          index += 1; // skip ':'
          while (index < sql.length && /[a-zA-Z0-9_]/.test(sql[index])) {
            paramName += sql[index];
            index += 1;
          }
          if (paramName && !params.includes(paramName)) {
            params.push(paramName);
          }
          continue;
        }
      }

      index += 1;
    }

    return params;
  }
}

class MssqlExtractor implements ParameterExtractor {
  extract(sql: string): string[] {
    const params: string[] = [];
    let index = 0;

    while (index < sql.length) {
      const current = sql[index];
      const next = sql[index + 1];

      // Skip single quoted string
      if (current === "'") {
        index += 1;
        while (index < sql.length) {
          if (sql[index] === "'" && sql[index + 1] === "'") {
            index += 2;
            continue;
          }
          if (sql[index] === "'") {
            index += 1;
            break;
          }
          index += 1;
        }
        continue;
      }

      // Skip double quoted identifier
      if (current === '"') {
        index += 1;
        while (index < sql.length) {
          if (sql[index] === '"' && sql[index + 1] === '"') {
            index += 2;
            continue;
          }
          if (sql[index] === '"') {
            index += 1;
            break;
          }
          index += 1;
        }
        continue;
      }

      // Skip single-line comment
      if (current === '-' && next === '-') {
        index += 2;
        while (index < sql.length && sql[index] !== '\n') {
          index += 1;
        }
        continue;
      }

      // Skip multi-line comment
      if (current === '/' && next === '*') {
        index += 2;
        while (index < sql.length) {
          if (sql[index] === '*' && sql[index + 1] === '/') {
            index += 2;
            break;
          }
          index += 1;
        }
        continue;
      }

      // Match parameter starting with '@'
      if (current === '@') {
        // Check preceding character
        const prevChar = index > 0 ? sql[index - 1] : '';
        if (/[a-zA-Z0-9_]/.test(prevChar)) {
          index += 1;
          continue;
        }

        if (next && /[a-zA-Z_]/.test(next)) {
          // Find the full identifier
          let paramName = '';
          index += 1; // skip '@'
          while (index < sql.length && /[a-zA-Z0-9_]/.test(sql[index])) {
            paramName += sql[index];
            index += 1;
          }
          if (paramName && !params.includes(paramName)) {
            params.push(paramName);
          }
          continue;
        }
      }

      index += 1;
    }

    return params;
  }
}

export class ParameterExtractorFactory {
  static getExtractor(dbType?: string): ParameterExtractor {
    if (dbType === DatabaseClientType.MSSQL) {
      return new MssqlExtractor();
    }
    return new StandardColonExtractor();
  }
}

export function extractParamsFromSql(sql: string, dbType?: string): string[] {
  const extractor = ParameterExtractorFactory.getExtractor(dbType);
  return extractor.extract(sql);
}
