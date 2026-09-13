export const MONGO_RAW_QUERY_LIMITS = {
  maxDocuments: 10_000,
  maxValueBytes: 20 * 1024 * 1024,
  maxScriptBytes: 1024 * 1024,
  maxParamsBytes: 2 * 1024 * 1024,
  maxOperations: 100,
  maxOperationSummaryChars: 2_000,
} as const;

export const MONGO_RAW_QUERY_RESULT_DEFAULTS = {
  batchSize: 100,
} as const;
