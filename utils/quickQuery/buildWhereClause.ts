// ~/utils/query-generator.ts
import { z } from 'zod';
import type { EDatabaseType } from '~/components/modules/management-connection/constants';
import {
  ComposeOperator,
  EExtendedField,
  OperatorSet,
  operatorSets,
} from '~/utils/constants';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export const filterSchema = z.object({
  isSelect: z.boolean().optional(),
  fieldName: z.string(),
  operator: z.string().optional(),
  search: z.string().optional(),
});

export type FilterSchema = z.infer<typeof filterSchema>;

export interface WhereResult<P extends unknown[] = (string | number | null)[]> {
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
  search: string;
  db: EDatabaseType;
  nextPlaceholder: () => string;
}
type Handler = (a: HandleArgs) => WhereResult;

// trợ giúp build placeholder
const makePlaceholder = (db: EDatabaseType) => (i: number) =>
  db === 'postgres' ? `$${i}` : '?';

// bọc tên cột
const wrap = (db: EDatabaseType) => (c: string) =>
  db === 'postgres' ? `"${c}"` : `\`${c}\``;

/* -------------------------------------------------------------------------- */
/*                           Handler implement‑ations                         */
/* -------------------------------------------------------------------------- */

const nullHandler: Handler = ({ col, op }) => ({
  where: `${col} ${op}`,
  params: [],
});

const inHandler: Handler = ({ col, op, search, nextPlaceholder }) => {
  const list = search
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  if (!list.length) return { where: '', params: [] };
  const place = list.map(() => nextPlaceholder()).join(', ');

  return { where: `${col} ${op} (${place})`, params: list };
};

const betweenHandler: Handler = ({ col, op, search }) => {
  return {
    where: `${col} ${op} ${search}`,
    params: [],
  };
};

const likeHandler: Handler = ({ col, op, search, db, nextPlaceholder }) => {
  const includeNegative = op.toUpperCase().startsWith('NOT');

  const ilike = op.toUpperCase().startsWith('ILIKE');
  const syntax = db === 'postgres' && ilike ? 'ILIKE' : 'LIKE';
  let value = search;

  if (op.endsWith('%VALUE%')) value = `%${search}%`;
  else if (op.endsWith('%VALUE')) value = `%${search}`;
  else if (op.endsWith('VALUE%')) value = `${search}%`;

  // TODO: fix this for all database
  return {
    where: `${col}::TEXT ${includeNegative ? ' NOT ' : ' '}${syntax} ${nextPlaceholder()}`,
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
  db,
  op,
  nextPlaceholder,
}: {
  search: string;
  columns: readonly string[];
  db: EDatabaseType;
  op: OperatorSet;
  nextPlaceholder: () => string;
}): WhereResult {
  const wrapCol = wrap(db);
  const handler = handlerMap[op];

  const ors: string[] = [];
  const params: (string | number | null)[] = [];

  columns.forEach(colName => {
    const col = wrapCol(colName);
    const result = handler({
      col,
      op,
      search,
      db,
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
  db: EDatabaseType;
  columns: readonly string[];
  composeWith?: ComposeOperator;
}): WhereResult {
  const pieces: string[] = [];
  const params: (string | number | null)[] = [];

  let placeholderCount = 1;

  const placeholder = makePlaceholder(db);
  const nextPlaceholder = () => placeholder(placeholderCount++);
  const wrapCol = wrap(db);

  // helper để push fragment + param
  const push = ({ where, params: p }: WhereResult) => {
    if (!where) return;
    pieces.push(where);
    params.push(...p);
  };

  // allowed operators theo DB (compile‑time)
  const allowedOps = new Set(
    operatorSets[db as keyof typeof operatorSets].map(o =>
      o.value.toUpperCase()
    )
  );

  filters.forEach(raw => {
    if (!raw?.isSelect) return;
    const f = filterSchema.parse(raw); // bảo đảm đúng shape

    /* Any field → OR qua mọi cột */
    if (f.fieldName === EExtendedField.AnyField) {
      const result = buildAnyFieldClause({
        search: f.search || '',
        columns,
        db,
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
        db,
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
  db: EDatabaseType;
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

  // simple literal‑encoder – good enough for logs
  const lit = (v: string | number | null) =>
    v === null
      ? 'NULL'
      : typeof v === 'number'
        ? String(v)
        : `'${String(v).replace(/'/g, "''")}'`;

  /** Postgres: $1, $2 … ・ MySQL: ? */
  if (db === 'postgres') {
    let out = where;
    params.forEach((p, i) => {
      // \b = word‑boundary → “$1 ”, “$1)” ...
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
