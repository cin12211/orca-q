import { mysqlCommandResult } from '~/components/modules/driver/shared/raw-query/services';

/** MariaDB shares MySQL's result semantics; the shared handler avoids a mysql import. */
export const mariadbCommandResult = mysqlCommandResult;
