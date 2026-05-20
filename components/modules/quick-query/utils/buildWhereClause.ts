// ~/utils/query-generator.ts
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

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type FilterSearchPrimitive = string | number | boolean | null;
export type FilterSearchValue = FilterSearchPrimitive | FilterSearchPrimitive[];
export type FilterValueType = 'postgres-array';

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
        preserveArray: filter.valueType === 'postgres-array',
      }),
    };
  },
  z.object({
    isSelect: z.boolean().optional(),
    fieldName: z.string(),
    operator: z.string().optional(),
    valueType: z.enum(['postgres-array']).optional(),
    search: filterSearchValueSchema.optional(),
  })
);

export type FilterSchema = z.infer<typeof filterSchema>;

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

export interface WhereResult<P extends unknown[] = FilterSearchValue[]> {
  where: string;
  params: P;
}

/* -------------------------------------------------------------------------- */
/*                             Helper utilities                               */
/* -------------------------------------------------------------------------- */

// khung chung cho handler
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

// bọc tên cột — now delegated to dialect
const wrapFactory = (dialect: SqlDialect) => (c: string) =>
  dialect.quoteIdentifier(c);

/* -------------------------------------------------------------------------- */
/*                           Handler implement‑ations                         */
/* -------------------------------------------------------------------------- */

const nullHandler: Handler = ({ col, op }) => ({
  where: `${col} ${op}`,
  params: [],
});

const inHandler: Handler = ({ col, op, search, nextPlaceholder }) => {
  const list = getFilterSearchText(search)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  if (!list.length) return { where: '', params: [] };
  const place = list.map(() => nextPlaceholder()).join(', ');

  return { where: `${col} ${op} (${place})`, params: list };
};

const betweenHandler: Handler = ({ col, op, search }) => {
  return {
    where: `${col} ${op} ${getFilterSearchText(search)}`,
    params: [],
  };
};

const likeHandler: Handler = ({
  col,
  op,
  search,
  dialect,
  nextPlaceholder,
}) => {
  const includeNegative = op.toUpperCase().startsWith('NOT');

  const ilike = op.toUpperCase().startsWith('ILIKE');
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

/* -------------------------------------------------------------------------- */
/*                          Handler resolver table                            */
/* -------------------------------------------------------------------------- */

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

  columns.forEach(colName => {
    const col = wrapCol(colName);
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

/* -------------------------------------------------------------------------- */
/*                       Main builder – public API (strict)                   */
/* -------------------------------------------------------------------------- */

export function buildWhereClause<
  F extends readonly FilterSchema[], // giữ nguyên literal type của mảng filters
>({
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

  // helper để push fragment + param
  const push = ({ where, params: p }: WhereResult) => {
    if (!where) return;
    pieces.push(where);
    params.push(...p);
  };

  // allowed operators theo DB — fall back to MySQL set when DB type not in map
  const allowedOps = new Set(
    (
      operatorSets[db as keyof typeof operatorSets] ??
      operatorSets[DatabaseClientType.MYSQL] ??
      []
    ).map(o => o.value.toUpperCase())
  );

  filters.forEach(raw => {
    if (!raw?.isSelect) return;
    const f = filterSchema.parse(raw); // bảo đảm đúng shape

    /* Any field → OR qua mọi cột */
    if (f.fieldName === EExtendedField.AnyField) {
      const result = buildAnyFieldClause({
        search: f.search ?? '',
        columns,
        dialect,
        op: f.operator as OperatorSet,
        nextPlaceholder,
      });
      if (result.where) {
        pieces.push(result.where);
        params.push(...result.params);
      }
      return;
    }

    /* Row query → raw fragment */
    if (f.fieldName === EExtendedField.RawQuery) {
      if (!f.search) {
        return;
      }

      pieces.push(`(${f.search})`);
      return;
    }

    /* Normal column */
    const col = wrapCol(f.fieldName);
    const rawOp = (
      f.operator ?? OperatorSet.LIKE_CONTAINS
    ).toUpperCase() as OperatorSet;
    const op = allowedOps.has(rawOp) ? rawOp : OperatorSet.LIKE_CONTAINS;

    push(
      handlerMap[op]({
        col,
        op,
        search: f.search ?? '',
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

/**
 * Return a WHERE‑clause string with **place‑holders already substituted**
 * (handy for logging / debugging, NOT for running against DB!)
 *
 * @example
 * const sqlWhere = formatWhereClause(values.filters, 'postgres', tableFields)
 * // →  WHERE "name" ILIKE '%john%' AND "age" >= 18
 */
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

  if (!where) return '';

  const dialect = getSqlDialect(db);

  // simple literal encoder - delegates to dialect for arrays
  const lit = (v: FilterSearchValue): string => {
    if (Array.isArray(v)) {
      return dialect.toLiteral(v);
    }

    return v === null
      ? 'NULL'
      : typeof v === 'boolean'
        ? v
          ? 'TRUE'
          : 'FALSE'
        : typeof v === 'number'
          ? String(v)
          : `'${String(v).replace(/'/g, "''")}'`;
  };

  /** Replace placeholders with literal values */
  if (db === DatabaseClientType.POSTGRES) {
    let out = where;
    params.forEach((p, i) => {
      out = out.replace(new RegExp(`\\$${i + 1}\\b`, 'g'), lit(p));
    });
    return out;
  } else {
    let idx = 0;
    return where.replace(/\?/g, () => lit(params[idx++]));
  }
}

export function getPlaceholderSearchByOperator(raw: string): string {
  const op = raw.toUpperCase().trim();

  /* 1. no‑value operators ----------------------------------------------- */
  if (op === 'IS NULL' || op === 'IS NOT NULL') return '';

  /* 2. list‑style operators --------------------------------------------- */
  if (op === 'IN' || op === 'NOT IN') return 'value1,value2,value3';
  if (op === 'BETWEEN' || op === 'NOT BETWEEN') return 'value1 AND value2';

  /* 3. LIKE / ILIKE variants -------------------------------------------- */
  if (op.includes('LIKE')) {
    if (op.endsWith('%VALUE%')) return 'contains';
    if (op.endsWith('VALUE%')) return 'prefix*';
    if (op.endsWith('%VALUE')) return '*suffix';
    return 'pattern';
  }

  /* 4. default comparison (=, <>, <, >, <=, >=) ------------------------- */
  return 'value';
}
