import type { Completion } from '@codemirror/autocomplete';
import type { SQLDialect } from '@codemirror/lang-sql';

/**
 * Statement language the editor and the statement splitter operate in.
 *
 * 'mongo' exists only so a descriptor's `language` field is honest for
 * MongoDB in the shared driver registry (`resolveRawQueryDescriptor`). No
 * core code branches on it: MongoDB's own raw-query pipeline does not read
 * `RawQueryCapabilities` at all — it composes its own editor, execution, and
 * variable handling (see `components/modules/driver/mongodb/raw-query/`).
 */
export type RawQueryLanguage = 'sql' | 'redis' | 'mongo';

/** Named-parameter syntax the engine accepts. */
export type ParameterStyle = 'colon' | 'at';

export interface RawQueryCapabilities {
  language: RawQueryLanguage;
  /**
   * Dialect used for statement detection and block parsing.
   * PostgreSQL needs a different dialect here than for highlighting because of
   * dollar quoting. Absent when `language` is not 'sql'.
   */
  parserDialect?: SQLDialect;
  /** Dialect used for highlighting and suggestions. Absent when not 'sql'. */
  highlightDialect?: SQLDialect;
  /** Engine-specific keyword completion. Only PostgreSQL ships one today. */
  keywordCompletion?: (label: string, type: string) => Completion;
  supportsVariables: boolean;
  supportsFormat: boolean;
  parameterStyle: ParameterStyle;
}
