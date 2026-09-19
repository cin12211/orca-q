import { CompletionIcon } from '~/components/base/code-editor/constants';
import type { MongoScriptCatalogEntry } from '../constants/mongoScriptCatalog';

const DOCS = {
  database:
    'https://www.mongodb.com/docs/drivers/node/current/databases-collections/',
  collection:
    'https://www.mongodb.com/docs/drivers/node/current/crud/query/retrieve/',
  bson: 'https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/',
} as const;

const appendLine = (container: HTMLElement, label: string, value: string) => {
  const line = document.createElement('div');
  line.className = 'text-xs text-muted-foreground';
  line.textContent = `${label}: ${value}`;
  container.appendChild(line);
};

const appendDocsLink = (container: HTMLElement, href: string) => {
  const link = document.createElement('a');
  link.className =
    'mt-1 inline-flex w-fit text-xs text-primary underline-offset-2 hover:underline';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = 'Open MongoDB docs';
  container.appendChild(link);
};

export function createMongoDatabaseSuggestionInfo(
  databaseName: string
): HTMLElement {
  if (typeof document === 'undefined') return {} as HTMLElement;
  const container = document.createElement('div');
  container.className = 'gap-1 flex flex-col text-sm min-w-[20rem]';

  const title = document.createElement('div');
  title.className = 'font-medium text-sm mb-1';
  title.textContent = `${databaseName} (database)`;
  container.appendChild(title);

  appendLine(container, 'Usage', `db.getSiblingDB('${databaseName}')`);
  appendDocsLink(container, DOCS.database);
  return container;
}

export function createMongoCollectionSuggestionInfo(
  collectionName: string,
  databaseName: string | undefined,
  fields: string[]
): HTMLElement {
  if (typeof document === 'undefined') return {} as HTMLElement;
  const container = document.createElement('div');
  container.className = 'gap-1 flex flex-col text-sm min-w-[20rem]';

  const title = document.createElement('div');
  title.className = 'font-medium text-sm mb-1';
  title.textContent = `${collectionName} (${databaseName || 'collection'})`;
  container.appendChild(title);

  const summary = document.createElement('div');
  summary.className = 'text-xs text-muted-foreground';
  summary.textContent = `Fields: ${fields.length}`;
  container.appendChild(summary);

  if (fields.length > 0) {
    const fieldsList = document.createElement('div');
    fieldsList.className = 'mt-1 text-xs max-h-[12rem] overflow-auto';

    for (const field of fields) {
      const row = document.createElement('div');
      row.className = field === '_id' ? 'py-0.5 font-semibold' : 'py-0.5';
      row.append(document.createTextNode(`${field}: `));

      const type = document.createElement('span');
      type.className = 'text-muted-foreground';
      type.textContent = field === '_id' ? 'ObjectId' : 'field';
      row.appendChild(type);

      fieldsList.appendChild(row);
    }

    container.appendChild(fieldsList);
  }

  appendDocsLink(container, DOCS.collection);
  return container;
}

export function createMongoCatalogSuggestionInfo(
  entry: MongoScriptCatalogEntry
): HTMLElement {
  if (typeof document === 'undefined') return {} as HTMLElement;
  const container = document.createElement('div');
  container.className = 'gap-1 flex flex-col text-sm min-w-[18rem]';

  const title = document.createElement('div');
  title.className = 'font-medium text-sm mb-1';
  title.textContent = `${entry.label} (${entry.type.toLowerCase()})`;
  container.appendChild(title);

  const isKeyword =
    entry.type === CompletionIcon.Keyword ||
    entry.type.toLowerCase() === 'keyword';
  const labelField = isKeyword
    ? 'Syntax'
    : entry.type === CompletionIcon.Type || entry.type.toLowerCase() === 'type'
      ? 'Type'
      : 'Signature';
  appendLine(container, labelField, entry.detail);

  if (entry.requiresConfirmation) {
    const warning = document.createElement('div');
    warning.className =
      'mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium';
    warning.textContent = 'Requires confirmation before execution';
    container.appendChild(warning);
  }

  if (
    !isKeyword &&
    entry.category !== 'console' &&
    entry.category !== 'keyword'
  ) {
    if (entry.category === 'database') {
      appendDocsLink(container, DOCS.database);
    } else if (entry.category === 'bson') {
      appendDocsLink(container, DOCS.bson);
    } else if (entry.category === 'collection' || entry.category === 'cursor') {
      appendDocsLink(container, DOCS.collection);
    } else {
      const isBson =
        entry.type === CompletionIcon.Type ||
        entry.type.toLowerCase() === 'type' ||
        entry.type.toLowerCase() === 'class';
      appendDocsLink(container, isBson ? DOCS.bson : DOCS.collection);
    }
  }
  return container;
}

export function createMongoVariableSuggestionInfo(
  name: string,
  value: unknown
): HTMLElement {
  if (typeof document === 'undefined') return {} as HTMLElement;
  const container = document.createElement('div');
  container.className = 'gap-1 flex flex-col text-sm min-w-[12rem]';

  const title = document.createElement('div');
  title.className = 'font-medium text-sm mb-1';
  title.textContent = `Variable: ${name}`;
  container.appendChild(title);

  const valueTitle = document.createElement('div');
  valueTitle.className = 'text-xs font-semibold mt-1';
  valueTitle.textContent = 'Current Value:';
  container.appendChild(valueTitle);

  const valueContent = document.createElement('pre');
  valueContent.className =
    'text-xs bg-muted p-1.5 rounded-sm mt-0.5 overflow-auto max-w-[20rem]';
  valueContent.textContent =
    typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  container.appendChild(valueContent);

  return container;
}
