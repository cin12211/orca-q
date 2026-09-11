const BSON_LITERAL_PREFIX = '__orcaq_bson_literal__:';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function formatDate(value: unknown): string | undefined {
  if (typeof value === 'string') return `ISODate(${quote(value)})`;
  if (isRecord(value) && typeof value.$numberLong === 'string') {
    const date = new Date(Number(value.$numberLong));
    return Number.isNaN(date.getTime())
      ? `ISODate(Long(${quote(value.$numberLong)}))`
      : `ISODate(${quote(date.toISOString())})`;
  }
  return undefined;
}

export function formatMongoEjsonValue(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  if (typeof value.$oid === 'string') return `ObjectId(${quote(value.$oid)})`;
  if ('$date' in value) return formatDate(value.$date);
  if (typeof value.$numberInt === 'string') return `Int32(${value.$numberInt})`;
  if (typeof value.$numberLong === 'string')
    return `Long(${quote(value.$numberLong)})`;
  if (typeof value.$numberDouble === 'string')
    return `Double(${value.$numberDouble})`;
  if (typeof value.$numberDecimal === 'string') {
    return `Decimal128(${quote(value.$numberDecimal)})`;
  }
  if (typeof value.$uuid === 'string') return `UUID(${quote(value.$uuid)})`;
  if (isRecord(value.$binary)) {
    const { base64, subType } = value.$binary;
    if (typeof base64 === 'string' && typeof subType === 'string') {
      return `BinData(${Number.parseInt(subType, 16)}, ${quote(base64)})`;
    }
  }
  if (isRecord(value.$timestamp)) {
    const { t, i } = value.$timestamp;
    if (typeof t === 'number' && typeof i === 'number') {
      return `Timestamp({ t: ${t}, i: ${i} })`;
    }
  }
  if (isRecord(value.$regularExpression)) {
    const { pattern, options } = value.$regularExpression;
    if (typeof pattern === 'string' && typeof options === 'string') {
      return `RegExp(${quote(pattern)}, ${quote(options)})`;
    }
  }
  if (typeof value.$code === 'string') {
    return '$scope' in value
      ? `Code(${quote(value.$code)}, ${JSON.stringify(value.$scope)})`
      : `Code(${quote(value.$code)})`;
  }
  if (typeof value.$ref === 'string' && '$id' in value) {
    const database =
      typeof value.$db === 'string' ? `, ${quote(value.$db)}` : '';
    return `DBRef(${quote(value.$ref)}, ${JSON.stringify(value.$id)}${database})`;
  }
  if (value.$minKey === 1) return 'MinKey()';
  if (value.$maxKey === 1) return 'MaxKey()';

  return undefined;
}

export function toMongoDisplayDocument(value: unknown): unknown {
  const formatted = formatMongoEjsonValue(value);
  if (formatted) return `${BSON_LITERAL_PREFIX}${formatted}`;
  if (Array.isArray(value)) return value.map(toMongoDisplayDocument);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      toMongoDisplayDocument(nestedValue),
    ])
  );
}

export function isMongoDisplayLiteral(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(BSON_LITERAL_PREFIX);
}

export function unwrapMongoDisplayLiteral(value: string): string {
  return value.slice(BSON_LITERAL_PREFIX.length);
}

export function getMongoDocumentKey(id: unknown): string {
  return typeof id === 'string' ? id : JSON.stringify(id);
}

export function formatMongoDisplayJson(value: unknown, space = 2): string {
  const json = JSON.stringify(toMongoDisplayDocument(value), null, space);
  const literalPattern = new RegExp(
    `"${BSON_LITERAL_PREFIX}((?:\\\\.|[^"\\\\])*)"`,
    'g'
  );

  return json.replace(literalPattern, (_, escapedLiteral: string) => {
    return JSON.parse(`"${escapedLiteral}"`);
  });
}

export function parseMongoRawFilter(rawText: string): Record<string, unknown> {
  let output = '';
  let index = 0;
  let quoteCharacter: string | undefined;

  while (index < rawText.length) {
    const character = rawText[index];
    if (quoteCharacter) {
      output += character;
      if (character === '\\') {
        output += rawText[index + 1] ?? '';
        index += 2;
        continue;
      }
      if (character === quoteCharacter) quoteCharacter = undefined;
      index += 1;
      continue;
    }

    if (character === '"') {
      quoteCharacter = character;
      output += character;
      index += 1;
      continue;
    }

    const literalMatch = rawText
      .slice(index)
      .match(/^(ObjectId|ISODate)\(\s*(['"])(.*?)\2\s*\)/);
    if (literalMatch) {
      const [, kind, , literalValue] = literalMatch;
      if (kind === 'ObjectId' && !/^[0-9a-fA-F]{24}$/.test(literalValue)) {
        throw new Error(
          'ObjectId must contain exactly 24 hexadecimal characters'
        );
      }
      output += JSON.stringify(
        kind === 'ObjectId' ? { $oid: literalValue } : { $date: literalValue }
      );
      index += literalMatch[0].length;
      continue;
    }

    output += character;
    index += 1;
  }

  const parsed = JSON.parse(output);
  if (!isRecord(parsed)) {
    throw new Error('Filter must be a JSON object e.g. { "status": "active" }');
  }
  return parsed;
}

export function parseMongoDocumentInput(rawText: string): Record<string, unknown> {
  if (!rawText || !rawText.trim()) {
    throw new Error('Document content cannot be empty');
  }

  // Replace ObjectId(...) and ISODate(...) with EJSON equivalents
  const withEjsonLiterals = rawText
    .replace(
      /ObjectId\(\s*(['"])([0-9a-fA-F]{24})\1\s*\)/g,
      '{"$oid": "$2"}'
    )
    .replace(
      /ISODate\(\s*(['"])(.*?)\1\s*\)/g,
      '{"$date": "$2"}'
    );

  // Quote unquoted keys
  const withQuotedKeys = withEjsonLiterals.replace(
    /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
    '$1"$2":'
  );

  const parsed = JSON.parse(withQuotedKeys);
  if (!isRecord(parsed)) {
    throw new Error('Document must be a valid JSON object');
  }
  return parsed;
}
