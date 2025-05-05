import type { EDatabaseType } from '~/components/modules/management-connection/constants';

export enum EExtendedField {
  AnyField = 'Any field',
  RowQuery = 'Row query',
}

export enum OperatorSet {
  // Null
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',

  // In
  IN = 'IN',
  NOT_IN = 'NOT IN',

  // Between
  BETWEEN = 'BETWEEN',
  NOT_BETWEEN = 'NOT BETWEEN',

  // Like & ILike (all variants)
  LIKE = 'LIKE',
  ILIKE = 'ILIKE',
  LIKE_CONTAINS = 'LIKE %VALUE%',
  LIKE_PREFIX = 'LIKE VALUE%',
  LIKE_SUFFIX = 'LIKE %VALUE',
  ILIKE_CONTAINS = 'ILIKE %VALUE%',
  ILIKE_PREFIX = 'ILIKE VALUE%',
  ILIKE_SUFFIX = 'ILIKE %VALUE',
  NOT_LIKE_CONTAINS = 'NOT LIKE %VALUE%',
  NOT_LIKE_PREFIX = 'NOT LIKE VALUE%',
  NOT_LIKE_SUFFIX = 'NOT LIKE %VALUE',
  NOT_ILIKE_CONTAINS = 'NOT ILIKE %VALUE%',
  NOT_ILIKE_PREFIX = 'NOT ILIKE VALUE%',
  NOT_ILIKE_SUFFIX = 'NOT ILIKE %VALUE',

  // Comparisons
  EQUAL = '=',
  NOT_EQUAL = '<>',
  LESS = '<',
  GREATER = '>',
  LESS_EQUAL = '<=',
  GREATER_EQUAL = '>=',
}

export const separatorRow = { value: 'SEPARATOR_ROW' as const, label: '' };

export const operatorSets: Record<
  Partial<EDatabaseType>,
  ({ value: OperatorSet; label: string } | typeof separatorRow)[]
> = {
  mysql: [
    { value: OperatorSet.EQUAL, label: '=' },
    { value: OperatorSet.NOT_EQUAL, label: '<>' },
    { value: OperatorSet.LESS, label: '<' },
    { value: OperatorSet.GREATER, label: '>' },
    { value: OperatorSet.LESS_EQUAL, label: '<=' },
    { value: OperatorSet.GREATER_EQUAL, label: '>=' },

    separatorRow,

    { value: OperatorSet.IN, label: 'IN' },
    { value: OperatorSet.NOT_IN, label: 'NOT IN' },

    separatorRow,

    { value: OperatorSet.IS_NULL, label: 'IS NULL' },
    { value: OperatorSet.IS_NOT_NULL, label: 'IS NOT NULL' },

    separatorRow,

    { value: OperatorSet.BETWEEN, label: 'Between' },
    { value: OperatorSet.NOT_BETWEEN, label: 'Not between' },

    separatorRow,

    { value: OperatorSet.LIKE, label: 'LIKE' },
    { value: OperatorSet.LIKE_CONTAINS, label: 'Contains' },
    { value: OperatorSet.NOT_LIKE_CONTAINS, label: 'Not contains' },
    { value: OperatorSet.LIKE_PREFIX, label: 'Has prefix' },
    { value: OperatorSet.LIKE_SUFFIX, label: 'Has suffix' },
  ],
  postgres: [
    { value: OperatorSet.EQUAL, label: '=' },
    { value: OperatorSet.NOT_EQUAL, label: '<>' },
    { value: OperatorSet.LESS, label: '<' },
    { value: OperatorSet.GREATER, label: '>' },
    { value: OperatorSet.LESS_EQUAL, label: '<=' },
    { value: OperatorSet.GREATER_EQUAL, label: '>=' },

    separatorRow,

    { value: OperatorSet.IN, label: 'IN' },
    { value: OperatorSet.NOT_IN, label: 'NOT IN' },

    separatorRow,

    { value: OperatorSet.IS_NULL, label: 'IS NULL' },
    { value: OperatorSet.IS_NOT_NULL, label: 'IS NOT NULL' },

    separatorRow,

    { value: OperatorSet.BETWEEN, label: 'Between' },
    { value: OperatorSet.NOT_BETWEEN, label: 'Not between' },

    separatorRow,

    { value: OperatorSet.LIKE, label: 'LIKE' },
    { value: OperatorSet.ILIKE, label: 'ILIKE' },

    separatorRow,

    { value: OperatorSet.LIKE_CONTAINS, label: 'Contains' },
    { value: OperatorSet.NOT_LIKE_CONTAINS, label: 'Not contains' },

    { value: OperatorSet.ILIKE_CONTAINS, label: 'Contains - Case insensitive' },
    {
      value: OperatorSet.NOT_ILIKE_CONTAINS,
      label: 'Not contains - Case insensitive',
    },

    separatorRow,

    { value: OperatorSet.LIKE_PREFIX, label: 'Has prefix' },
    { value: OperatorSet.LIKE_SUFFIX, label: 'Has suffix' },
    { value: OperatorSet.ILIKE_PREFIX, label: 'Has prefix - Case insensitive' },
    { value: OperatorSet.ILIKE_SUFFIX, label: 'Has suffix - Case insensitive' },
  ],
};

export const extendedFields = [
  {
    label: 'Any field',
    value: EExtendedField.AnyField,
  },
  {
    label: 'Row SQL',
    value: EExtendedField.RowQuery,
  },
];
