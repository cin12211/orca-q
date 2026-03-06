import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseDriverError as RawDatabaseDriverError } from '~/core/types';

export interface NormalizationError {
  position?: number;
  hint?: string;
  message: string;
}

export class DatabaseDriverNormalizerError {
  constructor(public rawError?: RawDatabaseDriverError | any) {}

  get nomaltliztionErrror(): NormalizationError {
    const fallbackMessage =
      this.rawError?.message || 'Error parsing SQL execution.';

    if (!this.rawError) {
      return { message: fallbackMessage };
    }

    switch (this.rawError.dbType) {
      case DatabaseClientType.POSTGRES:
        return this.normalizePostgresError(fallbackMessage);
      case DatabaseClientType.MYSQL:
        return this.normalizeMysqlError(fallbackMessage);
      case DatabaseClientType.SQLITE3:
        return this.normalizeSqliteError(fallbackMessage);
      default:
        return { message: fallbackMessage };
    }
  }

  private normalizePostgresError(fallbackMessage: string): NormalizationError {
    let position: number | undefined;

    if (this.rawError.position) {
      position =
        typeof this.rawError.position === 'string'
          ? Number(this.rawError.position)
          : this.rawError.position;

      if (Number.isNaN(position)) {
        position = undefined;
      }
    }

    return {
      message: this.rawError.message || fallbackMessage,
      position,
      hint: this.rawError.hint,
    };
  }

  private normalizeMysqlError(fallbackMessage: string): NormalizationError {
    return {
      message:
        this.rawError.sqlMessage || this.rawError.message || fallbackMessage,
      hint: this.rawError.code
        ? `Error Code: ${this.rawError.code}`
        : undefined,
    };
  }

  private normalizeSqliteError(fallbackMessage: string): NormalizationError {
    return {
      message: this.rawError.message || fallbackMessage,
      hint: this.rawError.code
        ? `Error Code: ${this.rawError.code}`
        : undefined,
    };
  }
}
