import { z } from 'zod';
import {
  ComposeOperator,
  EExtendedField,
  OperatorSet,
  operatorSets,
} from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';
import type { SqlDialect } from '~/core/sql-dialect';

export enum SqlFilterValueType {
  POSTGRES_ARRAY = 'postgres-array',
}

export type FilterSearchPrimitive = string | number | boolean | null;
export type FilterSearchValue = FilterSearchPrimitive | FilterSearchPrimitive[];
export type FilterValueType = SqlFilterValueType;

const filterSearchPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const filterSearchValueSchema = z.union([
  filterSearchPrimitiveSchema,
  z.array(filterSearchPrimitiveSchema),
]);

export const normalizeFilterSearchValue = (
  value: unknown,
  options: { preserveArray?: boolean } = {}
): FilterSearchValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value) && options.preserveArray) {
    return value.map(item => {
      if (
        item === null ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
      ) {
        return item;
      }

      if (typeof item === 'bigint') {
        return item.toString();
      }

      return JSON.stringify(item);
    });
  }

  return JSON.stringify(value);
};

export const filterSchema = z.preprocess(
  value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }

    const filter = value as {
      search?: unknown;
      valueType?: FilterValueType;
    };

    return {
      ...filter,
      search: normalizeFilterSearchValue(filter.search, {
        preserveArray: filter.valueType === SqlFilterValueType.POSTGRES_ARRAY,
      }),
    };
  },
  z.object({
    isSelect: z.boolean().optional(),
    fieldName: z.string(),
    operator: z.string().optional(),
    valueType: z.nativeEnum(SqlFilterValueType).optional(),
    search: filterSearchValueSchema.optional(),
  })
);

export type FilterSchema = z.infer<typeof filterSchema>;

export interface WhereResult<P extends unknown[] = FilterSearchValue[]> {
  where: string;
  params: P;
}

interface HandleArgs {
  col: string;
  op: string;
  search: FilterSearchValue;
  dialect: SqlDialect;
  nextPlaceholder: () => string;
}

type Handler = (a: HandleArgs) => WhereResult;

const getFilterSearchText = (value: FilterSearchValue): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const wrapFactory = (dialect: SqlDialect) => (columnName: string) =>
  dialect.quoteIdentifier(columnName);

const nullHandler: Handler = ({ col, op }) => ({
  where: `${col} ${op}`,
  params: [],
});

const inHandler: Handler = ({ col, op, search, nextPlaceholder }) => {
  const list = getFilterSearchText(search)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  if (!list.length) {
    return { where: '', params: [] };
  }

  const placeholders = list.map(() => nextPlaceholder()).join(', ');
  return { where: `${col} ${op} (${placeholders})`, params: list };
};

const betweenHandler: Handler = ({ col, op, search }) => ({
  where: `${col} ${op} ${getFilterSearchText(search)}`,
  params: [],
});

const likeHandler: Handler = ({
  col,
  op,
  search,
  dialect,
  nextPlaceholder,
}) => {
  const normalizedOp = op.toUpperCase();
  const includeNegative = normalizedOp.startsWith('NOT');
  const ilike = normalizedOp.includes('ILIKE');
  const syntax = dialect.likeOperator(ilike);
  let value = getFilterSearchText(search);

  if (op.endsWith('%VALUE%')) value = `%${search}%`;
  else if (op.endsWith('%VALUE')) value = `%${search}`;
  else if (op.endsWith('VALUE%')) value = `${search}%`;

  const castCol = dialect.castForLike(col);
  return {
    where: `${castCol} ${includeNegative ? ' NOT ' : ' '}${syntax} ${nextPlaceholder()}`,
    params: [value],
  };
};

const compareHandler: Handler = ({ col, op, search, nextPlaceholder }) => ({
  where: `${col} ${op} ${nextPlaceholder()}`,
  params: [search],
});

const handlerMap: Record<OperatorSet, Handler> = {
  [OperatorSet.IS_NULL]: nullHandler,
  [OperatorSet.IS_NOT_NULL]: nullHandler,
  [OperatorSet.IN]: inHandler,
  [OperatorSet.NOT_IN]: inHandler,
  [OperatorSet.BETWEEN]: betweenHandler,
  [OperatorSet.NOT_BETWEEN]: betweenHandler,
  [OperatorSet.LIKE]: likeHandler,
  [OperatorSet.ILIKE]: likeHandler,
  [OperatorSet.LIKE_CONTAINS]: likeHandler,
  [OperatorSet.LIKE_PREFIX]: likeHandler,
  [OperatorSet.LIKE_SUFFIX]: likeHandler,
  [OperatorSet.ILIKE_CONTAINS]: likeHandler,
  [OperatorSet.ILIKE_PREFIX]: likeHandler,
  [OperatorSet.ILIKE_SUFFIX]: likeHandler,
  [OperatorSet.NOT_LIKE_CONTAINS]: likeHandler,
  [OperatorSet.NOT_LIKE_PREFIX]: likeHandler,
  [OperatorSet.NOT_LIKE_SUFFIX]: likeHandler,
  [OperatorSet.NOT_ILIKE_CONTAINS]: likeHandler,
  [OperatorSet.NOT_ILIKE_PREFIX]: likeHandler,
  [OperatorSet.NOT_ILIKE_SUFFIX]: likeHandler,
  [OperatorSet.EQUAL]: compareHandler,
  [OperatorSet.NOT_EQUAL]: compareHandler,
  [OperatorSet.LESS]: compareHandler,
  [OperatorSet.GREATER]: compareHandler,
  [OperatorSet.LESS_EQUAL]: compareHandler,
  [OperatorSet.GREATER_EQUAL]: compareHandler,
};

const postgresFilterOperators = [
  OperatorSet.EQUAL,
  OperatorSet.NOT_EQUAL,
  OperatorSet.LESS,
  OperatorSet.GREATER,
  OperatorSet.LESS_EQUAL,
  OperatorSet.GREATER_EQUAL,
  OperatorSet.IN,
  OperatorSet.NOT_IN,
  OperatorSet.IS_NULL,
  OperatorSet.IS_NOT_NULL,
  OperatorSet.BETWEEN,
  OperatorSet.NOT_BETWEEN,
  OperatorSet.LIKE,
  OperatorSet.ILIKE,
  OperatorSet.LIKE_CONTAINS,
  OperatorSet.LIKE_PREFIX,
  OperatorSet.LIKE_SUFFIX,
  OperatorSet.ILIKE_CONTAINS,
  OperatorSet.ILIKE_PREFIX,
  OperatorSet.ILIKE_SUFFIX,
  OperatorSet.NOT_ILIKE_CONTAINS,
  OperatorSet.NOT_ILIKE_PREFIX,
  OperatorSet.NOT_ILIKE_SUFFIX,
];

const resolveOperator = (
  rawOp: OperatorSet,
  allowedOps: Set<string>
): OperatorSet => {
  if (allowedOps.has(rawOp)) {
    return rawOp;
  }

  if (rawOp.startsWith('NOT LIKE')) {
    const caseInsensitiveOp = rawOp.replace(
      'NOT LIKE',
      'NOT ILIKE'
    ) as OperatorSet;

    if (allowedOps.has(caseInsensitiveOp)) {
      return caseInsensitiveOp;
    }
  }

  return OperatorSet.LIKE_CONTAINS;
};

function buildAnyFieldClause({
  search,
  columns,
  dialect,
  op,
  nextPlaceholder,
}: {
  search: FilterSearchValue;
  columns: readonly string[];
  dialect: SqlDialect;
  op: OperatorSet;
  nextPlaceholder: () => string;
}): WhereResult {
  const wrapCol = wrapFactory(dialect);
  const handler = handlerMap[op];
  const ors: string[] = [];
  const params: FilterSearchValue[] = [];

  columns.forEach(columnName => {
    const col = wrapCol(columnName);
    const result = handler({
      col,
      op,
      search,
      dialect,
      nextPlaceholder,
    });

    if (result.where) {
      ors.push(result.where);
      params.push(...result.params);
    }
  });

  return {
    where: ors.length ? `(${ors.join(' OR ')})` : '',
    params,
  };
}

export function buildWhereClause<F extends readonly FilterSchema[]>({
  filters,
  db,
  columns = [],
  composeWith = ComposeOperator.AND,
}: {
  filters: F;
  db: DatabaseClientType;
  columns: readonly string[];
  composeWith?: ComposeOperator;
}): WhereResult {
  const dialect = getSqlDialect(db);
  const pieces: string[] = [];
  const params: FilterSearchValue[] = [];

  let placeholderCount = 1;

  const nextPlaceholder = () => dialect.makePlaceholder(placeholderCount++);
  const wrapCol = wrapFactory(dialect);
  const push = ({ where, params: p }: WhereResult) => {
    if (!where) return;
    pieces.push(where);
    params.push(...p);
  };

  const allowedOps = new Set(
    (db === DatabaseClientType.POSTGRES
      ? postgresFilterOperators
      : (
          operatorSets[db as keyof typeof operatorSets] ??
          operatorSets[DatabaseClientType.MYSQL] ??
          []
        ).map(o => o.value)
    ).map(value => value.toUpperCase())
  );

  filters.forEach(raw => {
    if (!raw?.isSelect) return;

    const filter = filterSchema.parse(raw);

    if (filter.fieldName === EExtendedField.AnyField) {
      const result = buildAnyFieldClause({
        search: filter.search ?? '',
        columns,
        dialect,
        op: filter.operator as OperatorSet,
        nextPlaceholder,
      });

      if (result.where) {
        pieces.push(result.where);
        params.push(...result.params);
      }

      return;
    }

    if (filter.fieldName === EExtendedField.RawQuery) {
      if (!filter.search) {
        return;
      }

      pieces.push(`(${filter.search})`);
      return;
    }

    const col = wrapCol(filter.fieldName);
    const rawOp = (filter.operator ?? OperatorSet.LIKE_CONTAINS)
      .trim()
      .toUpperCase() as OperatorSet;
    const op = resolveOperator(rawOp, allowedOps);

    push(
      handlerMap[op]({
        col,
        op,
        search: filter.search ?? '',
        dialect,
        nextPlaceholder,
      })
    );
  });

  return {
    where: pieces.length ? `WHERE ${pieces.join(` ${composeWith} `)}` : '',
    params,
  };
}

export function formatWhereClause<F extends readonly FilterSchema[]>({
  filters,
  db,
  columns = [],
  composeWith,
}: {
  filters: F;
  db: DatabaseClientType;
  columns: readonly string[];
  composeWith?: ComposeOperator;
}): string {
  const { where, params } = buildWhereClause({
    filters,
    db,
    columns,
    composeWith,
  });

  if (!where) {
    return '';
  }

  const dialect = getSqlDialect(db);

  const toLiteral = (value: FilterSearchValue): string => {
    if (Array.isArray(value)) {
      return dialect.toLiteral(value);
    }

    return value === null
      ? 'NULL'
      : typeof value === 'boolean'
        ? value
          ? 'TRUE'
          : 'FALSE'
        : typeof value === 'number'
          ? String(value)
          : `'${String(value).replace(/'/g, "''")}'`;
  };

  if (db === DatabaseClientType.POSTGRES) {
    let output = where;
    params.forEach((value, index) => {
      output = output.replace(
        new RegExp(`\\$${index + 1}\\b`, 'g'),
        toLiteral(value)
      );
    });
    return output;
  }

  let parameterIndex = 0;
  return where.replace(/\?/g, () => toLiteral(params[parameterIndex++]));
}

export function getPlaceholderSearchByOperator(raw: string): string {
  const op = raw.toUpperCase().trim();

  if (op === 'IS NULL' || op === 'IS NOT NULL') return '';
  if (op === 'IN' || op === 'NOT IN') return 'value1,value2,value3';
  if (op === 'BETWEEN' || op === 'NOT BETWEEN') return 'value1 AND value2';

  if (op.includes('LIKE')) {
    if (op.endsWith('%VALUE%')) return 'contains';
    if (op.endsWith('VALUE%')) return 'prefix*';
    if (op.endsWith('%VALUE')) return '*suffix';
    return 'pattern';
  }

  return 'value';
}
