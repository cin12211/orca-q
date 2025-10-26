/*
  Converted to TypeScript.
  Original: Luiz Estácio (json-format v1.1)
  https://github.com/phoboslab/json-format
  Released under MIT license.
*/

type JSONIndentType = 'tab' | 'space';

interface JSONIndentConfig {
  char: string;
  size: number;
}

interface JSONFormatConfig {
  type: JSONIndentType;
  size?: number;
}

const indentConfig: Record<JSONIndentType, JSONIndentConfig> = {
  tab: { char: '\t', size: 1 },
  space: { char: ' ', size: 4 },
};

const configDefault: JSONFormatConfig = {
  type: 'tab',
};

// temporary array for extracted strings/backslashes
let p: string[] = [];

const push = (m: string): string => `\\${p.push(m)}\\`;

const pop = (_: string, i: number): string => p[i - 1];

const tabs = (count: number, indentType: string): string =>
  new Array(count + 1).join(indentType);

function JSONFormat(json: string, indentType: string): string {
  p = [];
  let out = '';
  let indent = 0;

  // Extract backslashes and strings
  json = json
    .replace(/\\./g, push)
    .replace(/(".*?"|'.*?')/g, push)
    .replace(/\s+/, '');

  // Indent and insert newlines
  for (let i = 0; i < json.length; i++) {
    const c = json.charAt(i);

    switch (c) {
      case '{':
      case '[':
        out += c + '\n' + tabs(++indent, indentType);
        break;
      case '}':
      case ']':
        out += '\n' + tabs(--indent, indentType) + c;
        break;
      case ',':
        out += ',\n' + tabs(indent, indentType);
        break;
      case ':':
        out += ': ';
        break;
      default:
        out += c;
        break;
    }
  }

  // Strip whitespace from numeric arrays and put backslashes/strings back in
  out = out
    .replace(/\[[\d,\s]+?\]/g, m => m.replace(/\s/g, ''))
    .replace(/\\(\d+)\\/g, pop) // strings
    .replace(/\\(\d+)\\/g, pop); // backslashes in strings

  return out;
}

/**
 * Format a JSON string into pretty JSON.
 */
export function jsonFormat(json: string, config?: JSONFormatConfig): string {
  const cfg: JSONFormatConfig = config || configDefault;
  const indent = indentConfig[cfg.type];

  if (!indent) {
    throw new Error(`Unrecognized indent type: "${cfg.type}"`);
  }

  const indentType = new Array((cfg.size ?? indent.size) + 1).join(indent.char);

  // ✅ Parse + re-stringify ensures input is valid JSON
  const parsed = JSON.parse(json);
  const normalized = JSON.stringify(parsed); // compact valid JSON string

  return JSONFormat(normalized, indentType);
}

export function toRawJSON<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
