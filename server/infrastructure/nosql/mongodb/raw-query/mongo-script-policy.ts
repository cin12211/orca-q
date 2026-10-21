import type * as TypeScript from 'typescript';
import { MONGO_RAW_QUERY_LIMITS } from '~/core/constants/mongodb-raw-query';
import type {
  MongoRawQueryAnalysis,
  MongoRawQueryDiagnostic,
  MongoRawQueryOperation,
} from '~/core/types/mongodb-raw-query.types';
import { typeScriptCompiler as ts } from '~/server/utils/load-typescript';
import {
  isMongoWriteCommand,
  isMongoWriteMethod,
  MONGO_DESTRUCTIVE_COLLECTION_METHODS,
  MONGO_DESTRUCTIVE_COMMANDS,
} from './mongo-operation-catalog';

export interface MongoScriptAnalysis extends MongoRawQueryAnalysis {
  sourceFile: TypeScript.SourceFile;
}

export interface CompiledMongoScript {
  code: string;
  analysis: MongoScriptAnalysis;
}

const WRAPPER_PREFIX =
  'async ({ db, params, ObjectId, Decimal128, Binary, UUID, BSON, EJSON, console }) => {\n';
const WRAPPER_SUFFIX = '\n}';
const FORBIDDEN_IDENTIFIERS = new Set([
  'require',
  'process',
  'global',
  'globalThis',
  'module',
  'exports',
  'fetch',
  'WebSocket',
  'setTimeout',
  'setInterval',
  'queueMicrotask',
]);
const SECRET_KEY =
  /(pass(word)?|token|secret|api[-_]?key|credential|authorization)/i;

const sourcePosition = (
  sourceFile: TypeScript.SourceFile,
  node: TypeScript.Node
) => {
  const start = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile)
  );
  return { line: start.line + 1, column: start.character + 1 };
};

const diagnostic = (
  sourceFile: TypeScript.SourceFile,
  node: TypeScript.Node,
  message: string,
  code?: number
): MongoRawQueryDiagnostic => ({
  ...sourcePosition(sourceFile, node),
  message,
  code,
});

function literalString(
  node: TypeScript.Expression | undefined
): string | undefined {
  return node && ts.isStringLiteral(node) ? node.text : undefined;
}

function expressionText(node: TypeScript.Node): string {
  return ts
    .createPrinter()
    .printNode(ts.EmitHint.Unspecified, node, node.getSourceFile());
}

function redactedExpressionText(node: TypeScript.Node): string {
  return expressionText(node)
    .replace(
      /(pass(?:word)?|token|secret|api[-_]?key|credential|authorization)\s*:\s*(['"])(?:\\.|(?!\2).)*\2/gi,
      '$1: [REDACTED]'
    )
    .slice(0, MONGO_RAW_QUERY_LIMITS.maxOperationSummaryChars);
}

function classifyMethod(method: string): MongoRawQueryOperation['risk'] {
  return MONGO_DESTRUCTIVE_COLLECTION_METHODS.has(method)
    ? 'destructive'
    : 'write';
}

interface MongoDatabaseReference {
  database?: string;
  dynamicDatabase: boolean;
}

interface MongoCollectionReference extends MongoDatabaseReference {
  collection?: string;
}

function findDatabaseReference(
  expression: TypeScript.Expression,
  aliases?: ReadonlyMap<string, MongoDatabaseReference>
): MongoDatabaseReference | undefined {
  if (ts.isIdentifier(expression) && expression.text === 'db') {
    return { dynamicDatabase: false };
  }
  if (ts.isIdentifier(expression)) return aliases?.get(expression.text);
  if (
    !ts.isCallExpression(expression) ||
    !ts.isPropertyAccessExpression(expression.expression) ||
    expression.expression.name.text !== 'getSiblingDB'
  ) {
    return undefined;
  }
  const parent = findDatabaseReference(
    expression.expression.expression,
    aliases
  );
  if (!parent) return undefined;
  const database = literalString(expression.arguments[0]);
  return { database, dynamicDatabase: !database };
}

function isGetSiblingDbCall(node: TypeScript.CallExpression) {
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'getSiblingDB'
  );
}

function findCallChain(
  node: TypeScript.CallExpression,
  databaseAliases: ReadonlyMap<string, MongoDatabaseReference>
):
  | (MongoCollectionReference & {
      method: string;
      args: readonly TypeScript.Expression[];
    })
  | undefined {
  const expression = node.expression;
  if (!ts.isPropertyAccessExpression(expression)) return undefined;
  const method = expression.name.text;
  const receiver = expression.expression;
  if (!ts.isCallExpression(receiver)) return undefined;
  if (!ts.isPropertyAccessExpression(receiver.expression)) return undefined;
  const collectionAccess = receiver.expression;
  if (collectionAccess.name.text !== 'collection') return undefined;
  const databaseReference = findDatabaseReference(
    collectionAccess.expression,
    databaseAliases
  );
  if (!databaseReference) return undefined;
  const collection = literalString(receiver.arguments[0]);
  return { ...databaseReference, method, collection, args: node.arguments };
}

function findCollectionReference(
  node: TypeScript.CallExpression,
  databaseAliases: ReadonlyMap<string, MongoDatabaseReference>
): MongoCollectionReference | undefined {
  if (!ts.isPropertyAccessExpression(node.expression)) return undefined;
  if (node.expression.name.text !== 'collection') return undefined;
  const databaseReference = findDatabaseReference(
    node.expression.expression,
    databaseAliases
  );
  if (!databaseReference) return undefined;
  return {
    ...databaseReference,
    collection: literalString(node.arguments[0]),
  };
}

function normalizeId(
  target: MongoRawQueryOperation['target'],
  method: string,
  database?: string,
  collection?: string
) {
  return `${target}:${method}:${database ?? '*'}:${collection ?? '*'}`;
}

export function analyzeMongoScript(source: string): MongoScriptAnalysis {
  if (
    Buffer.byteLength(source, 'utf8') > MONGO_RAW_QUERY_LIMITS.maxScriptBytes
  ) {
    throw new Error(
      `Mongo script exceeds ${MONGO_RAW_QUERY_LIMITS.maxScriptBytes} bytes`
    );
  }

  const wrappedSource = `${WRAPPER_PREFIX}${source}${WRAPPER_SUFFIX}`;
  const sourceFile = ts.createSourceFile(
    'mongo-raw-query.ts',
    wrappedSource,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );
  const diagnostics: MongoRawQueryDiagnostic[] = [];
  if (diagnostics.length) throw new Error(diagnostics[0]?.message);

  const operations = new Map<string, MongoRawQueryOperation>();
  const databaseAliases = new Map<string, MongoDatabaseReference>();
  const aliases = new Map<string, MongoCollectionReference>();
  let hasReturn = false;
  const visit = (node: TypeScript.Node) => {
    if (ts.isReturnStatement(node)) hasReturn = true;
    if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) {
      throw new Error(
        diagnostic(
          sourceFile,
          node,
          `Forbidden identifier: ${node.text}`
        ).message
      );
    }
    if (
      ts.isImportDeclaration(node) ||
      ts.isImportEqualsDeclaration(node) ||
      (ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword)
    ) {
      throw new Error(
        diagnostic(
          sourceFile,
          node,
          'Module loading is not available in Mongo scripts'
        ).message
      );
    }
    if (ts.isElementAccessExpression(node)) {
      throw new Error(
        diagnostic(
          sourceFile,
          node,
          'Computed Mongo method access is not allowed'
        ).message
      );
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ['eval', 'Function'].includes(node.expression.text)
    ) {
      throw new Error(
        diagnostic(
          sourceFile,
          node,
          `${node.expression.text} is not allowed`
        ).message
      );
    }
    if (ts.isCallExpression(node)) {
      let chain = findCallChain(node, databaseAliases);
      if (
        !chain &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression)
      ) {
        const alias = aliases.get(node.expression.expression.text);
        if (alias) {
          chain = {
            ...alias,
            method: node.expression.name.text,
            args: node.arguments,
          };
        }
      }
      if (
        chain &&
        (isMongoWriteMethod(chain.method) || chain.method === 'aggregate')
      ) {
        let method = chain.method;
        let risk: MongoRawQueryOperation['risk'] = isMongoWriteMethod(method)
          ? classifyMethod(method)
          : 'write';
        const firstArg = chain.args[0];
        if (
          method === 'aggregate' &&
          firstArg &&
          ts.isArrayLiteralExpression(firstArg)
        ) {
          const aggregateWriteStage = firstArg.elements.find(
            element =>
              ts.isObjectLiteralExpression(element) &&
              element.properties.some(
                property =>
                  ts.isPropertyAssignment(property) &&
                  ts.isIdentifier(property.name) &&
                  ['$merge', '$out'].includes(property.name.text)
              )
          );
          if (
            !aggregateWriteStage ||
            !ts.isObjectLiteralExpression(aggregateWriteStage)
          ) {
            ts.forEachChild(node, visit);
            return;
          }
          const stageProperty = aggregateWriteStage.properties.find(
            property =>
              ts.isPropertyAssignment(property) &&
              ts.isIdentifier(property.name) &&
              ['$merge', '$out'].includes(property.name.text)
          );
          if (
            !stageProperty ||
            !ts.isPropertyAssignment(stageProperty) ||
            !ts.isIdentifier(stageProperty.name)
          ) {
            ts.forEachChild(node, visit);
            return;
          }
          method = `aggregate:${stageProperty.name.text}`;
        }
        const operation: MongoRawQueryOperation = {
          id: normalizeId(
            'collection',
            method,
            chain.database,
            chain.collection
          ),
          target: 'collection',
          method,
          database: chain.database,
          dynamicDatabase: chain.dynamicDatabase,
          collection: chain.collection,
          dynamicTarget: !chain.collection,
          risk,
          summary: redactedExpressionText(node),
        };
        operations.set(operation.id, operation);
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'command'
      ) {
        const databaseReference = findDatabaseReference(
          node.expression.expression,
          databaseAliases
        );
        if (!databaseReference) {
          ts.forEachChild(node, visit);
          return;
        }
        const commandArg = node.arguments[0];
        const command =
          commandArg && ts.isObjectLiteralExpression(commandArg)
            ? commandArg.properties.find(
                property =>
                  ts.isPropertyAssignment(property) &&
                  ts.isIdentifier(property.name) &&
                  property.name.text === 'drop'
              )
            : undefined;
        const commandName = command ? 'drop' : 'command';
        if (isMongoWriteCommand(commandName) || commandName === 'command') {
          const operation: MongoRawQueryOperation = {
            id: normalizeId(
              'database',
              commandName,
              databaseReference.database
            ),
            target: 'database',
            method: commandName,
            database: databaseReference.database,
            dynamicDatabase: databaseReference.dynamicDatabase,
            dynamicTarget: commandName === 'command',
            risk: MONGO_DESTRUCTIVE_COMMANDS.has(commandName)
              ? 'destructive'
              : 'write',
            summary: expressionText(node).slice(
              0,
              MONGO_RAW_QUERY_LIMITS.maxOperationSummaryChars
            ),
          };
          operations.set(operation.id, operation);
        }
      }
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const databaseReference = findDatabaseReference(
        node.initializer,
        databaseAliases
      );
      if (databaseReference && isGetSiblingDbCall(node.initializer)) {
        databaseAliases.set(node.name.text, databaseReference);
      }
      const reference = findCollectionReference(
        node.initializer,
        databaseAliases
      );
      if (reference) aliases.set(node.name.text, reference);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (operations.size > MONGO_RAW_QUERY_LIMITS.maxOperations) {
    throw new Error(
      `Mongo script has more than ${MONGO_RAW_QUERY_LIMITS.maxOperations} operations`
    );
  }
  return {
    wrappedSource,
    sourceFile,
    operations: [...operations.values()],
    hasReturn,
    diagnostics,
  };
}

export function compileMongoScript(source: string): CompiledMongoScript {
  const analysis = analyzeMongoScript(source);
  const output = ts.transpileModule(analysis.wrappedSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: 'mongo-raw-query.ts',
    reportDiagnostics: true,
  });
  const compileDiagnostics = output.diagnostics ?? [];
  if (compileDiagnostics.length) {
    const first = compileDiagnostics[0];
    throw new Error(ts.flattenDiagnosticMessageText(first?.messageText, '\n'));
  }
  return {
    code: output.outputText,
    analysis,
  };
}
