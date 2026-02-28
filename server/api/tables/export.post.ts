import dayjs from 'dayjs';
import { defineEventHandler, readBody, setResponseHeaders } from 'h3';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

export default defineEventHandler(async event => {
  const body = await readBody(event);
  const { dbConnectionString, schemaName, tableName, format } = body;

  const adapter = await createTableAdapter('postgres', {
    dbConnectionString,
  });

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
