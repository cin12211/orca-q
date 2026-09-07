import { MongoFilterMode } from '../types';
import type {
  MongoDocument,
  MongoFilterOperator,
  MongoFilterRow,
} from '../types';

export const mongoOperatorSeparatorRow = {
  value: 'SEPARATOR_ROW' as const,
  label: '',
};

type MongoFilterOperatorItem = {
  value: MongoFilterOperator;
  label: string;
  placeholder: string;
};

export const MONGO_FILTER_OPERATORS: MongoFilterOperatorItem[] = [
  { value: '$eq', label: '= (Equals)', placeholder: 'Value...' },
  { value: '$ne', label: '!= (Not equals)', placeholder: 'Value...' },
  { value: '$gt', label: '> (Greater than)', placeholder: 'Number...' },
  {
    value: '$gte',
    label: '>= (Greater than or equal)',
    placeholder: 'Number...',
  },
  { value: '$lt', label: '< (Less than)', placeholder: 'Number...' },
  { value: '$lte', label: '<= (Less than or equal)', placeholder: 'Number...' },
  {
    value: '$in',
    label: 'In (Array)',
    placeholder: 'val1, val2 or ["a", "b"]',
  },
  {
    value: '$nin',
    label: 'Not in (Array)',
    placeholder: 'val1, val2 or ["a", "b"]',
  },
  {
    value: '$regex',
    label: 'Regex (Contains)',
    placeholder: 'Pattern (e.g. ^john)',
  },
  { value: '$mod', label: 'Mod (Divisor, Remainder)', placeholder: '4, 0' },
  { value: '$exists', label: 'Exists', placeholder: 'true or false' },
  {
    value: '$type',
    label: 'Type',
    placeholder: 'string, number, bool, date, array, object, null, objectId',
  },
  {
    value: '$all',
    label: 'All (Array contains all)',
    placeholder: 'val1, val2 or ["a", "b"]',
  },
  { value: '$size', label: 'Size (Array length)', placeholder: 'Number...' },
];

// Grouped presentation for the operator dropdown: comparison, membership,
// evaluation, and array/element checks, mirroring the SQL OperatorSelector's
// separatorRow grouping so Mongo's operator surface reads the same way.
export const MONGO_FILTER_OPERATOR_GROUPS: (
  | MongoFilterOperatorItem
  | typeof mongoOperatorSeparatorRow
)[] = [
  ...MONGO_FILTER_OPERATORS.slice(0, 6),
  mongoOperatorSeparatorRow,
  ...MONGO_FILTER_OPERATORS.slice(6, 8),
  mongoOperatorSeparatorRow,
  ...MONGO_FILTER_OPERATORS.slice(8, 10),
  mongoOperatorSeparatorRow,
  ...MONGO_FILTER_OPERATORS.slice(10, 14),
];

function parseCommaSeparatedArray(trimmed: string): unknown[] {
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fallback to comma separation
    }
  }
  return trimmed.split(',').map(item => {
    const itemTrimmed = item.trim();
    if (!isNaN(Number(itemTrimmed)) && itemTrimmed !== '') {
      return Number(itemTrimmed);
    }
    return itemTrimmed;
  });
}

function parseValue(value: string, operator: MongoFilterOperator): unknown {
  const trimmed = value.trim();
  if (trimmed === '') return '';

  if (operator === '$exists') {
    return trimmed.toLowerCase() !== 'false' && trimmed !== '0';
  }

  if (operator === '$in' || operator === '$nin' || operator === '$all') {
    return parseCommaSeparatedArray(trimmed);
  }

  if (operator === '$size') {
    const size = Number(trimmed);
    return isNaN(size) ? trimmed : size;
  }

  if (operator === '$mod') {
    return parseCommaSeparatedArray(trimmed);
  }

  if (operator === '$type') {
    const numeric = Number(trimmed);
    return !isNaN(numeric) && trimmed !== '' ? numeric : trimmed;
  }

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;

  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export function buildMongoFilterPayload(
  rows: MongoFilterRow[],
  rawQueryText: string = '',
  mode: MongoFilterMode = MongoFilterMode.Visual
): Record<string, unknown> | undefined {
  if (mode === MongoFilterMode.Raw) {
    const trimmed = rawQueryText.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
      throw new Error(
        'Filter must be a JSON object e.g. { "status": "active" }'
      );
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error('Invalid JSON filter format');
    }
  }

  const activeRows = rows.filter(r => r.isSelect && r.field.trim() !== '');
  if (activeRows.length === 0) return undefined;

  const result: Record<string, unknown> = {};

  for (const row of activeRows) {
    const field = row.field.trim();
    const parsedVal = parseValue(row.value, row.operator);

    if (row.operator === '$eq') {
      result[field] = parsedVal;
    } else {
      const existing = result[field];
      if (
        existing &&
        typeof existing === 'object' &&
        !Array.isArray(existing)
      ) {
        (existing as Record<string, unknown>)[row.operator] = parsedVal;
      } else {
        result[field] = { [row.operator]: parsedVal };
      }
    }
  }

  return result;
}

export function formatMongoFilterToRaw(rows: MongoFilterRow[]): string {
  const payload = buildMongoFilterPayload(rows, '', MongoFilterMode.Visual);
  if (!payload || Object.keys(payload).length === 0) return '';
  return JSON.stringify(payload, null, 2);
}

export function extractFieldsFromDocuments(
  documents: MongoDocument[]
): string[] {
  const fieldSet = new Set<string>();
  for (const doc of documents) {
    if (doc && typeof doc === 'object') {
      for (const [key, val] of Object.entries(doc)) {
        fieldSet.add(key);

        if (val !== null && typeof val === 'object') {
          if (Array.isArray(val)) {
            for (const item of val) {
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                for (const subKey of Object.keys(item)) {
                  if (subKey && !subKey.startsWith('$')) {
                    fieldSet.add(`${key}.${subKey}`);
                  }
                }
              }
            }
          } else {
            for (const subKey of Object.keys(val)) {
              if (subKey && !subKey.startsWith('$')) {
                fieldSet.add(`${key}.${subKey}`);
              }
            }
          }
        }
      }
    }
  }
  return Array.from(fieldSet).sort((a, b) => {
    if (a === '_id') return -1;
    if (b === '_id') return 1;
    return a.localeCompare(b);
  });
}
