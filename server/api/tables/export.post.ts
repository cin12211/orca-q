import dayjs from 'dayjs';
import { defineEventHandler, readBody, setResponseHeaders } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~/core/types';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

interface RequestBody extends DatabaseMetadataRequestParams {
  schemaName: string;
  tableName: string;
  format: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);
  const { schemaName, tableName, format } = body;

  const adapter = await createTableAdapter(
    body.type,
    body
  );

  const contentTypes: Record<string, string> = {
    sql: 'application/sql',
    json: 'application/json',
    csv: 'text/csv',
  };

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm');

  setResponseHeaders(event, {
    'Content-Type': contentTypes[format as string],
    'Content-Disposition': `attachment; filename="${tableName}_${timestamp}.${format}"`,
    'Transfer-Encoding': 'chunked',
  });

  return await adapter.exportTableData(schemaName, tableName, format);
});
