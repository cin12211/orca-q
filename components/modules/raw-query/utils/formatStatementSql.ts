import { format, type FormatOptions } from 'sql-formatter';

export const formatStatementSql = (
  fileContent: string,
  params?: FormatOptions['params']
) => {
  try {
    const formatted = format(fileContent, {
      language: 'postgresql',
      keywordCase: 'upper',
      linesBetweenQueries: 1,
      functionCase: 'upper',
      newlineBeforeSemicolon: true,
      paramTypes: {
        named: [':'],
      },
      params: params,
    });
    return formatted;
  } catch (error) {
    console.error('🚀 ~ onFormatCode ~ error:', error);
    return fileContent;
  }
};
