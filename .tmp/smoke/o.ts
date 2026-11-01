import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDatabaseAdapter } from '~/server/infrastructure/driver/factory';

const a = createDatabaseAdapter(
  DatabaseClientType.ORACLE,
  'oracledb://orcaq:orcaq@127.0.0.1:1521/FREEPDB1'
);
console.log(
  await a.rawQuery(
    `SELECT version FROM product_component_version WHERE product LIKE 'Oracle%' AND ROWNUM = 1`
  )
);
console.log(await a.rawQuery(`SELECT 1 AS x FROM dual`));
process.exit(0);
