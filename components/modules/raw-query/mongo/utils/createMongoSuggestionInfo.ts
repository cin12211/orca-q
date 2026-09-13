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

const createContainer = (title: string, subtitle?: string) => {
  const container = document.createElement('div');
  container.className = 'flex min-w-[16rem] flex-col gap-1 text-sm';

  const heading = document.createElement('div');
  heading.className = 'mb-0.5 font-medium text-sm';
  heading.textContent = title;
  container.appendChild(heading);

  if (subtitle) appendLine(container, 'Type', subtitle);
  return container;
};

export function createMongoDatabaseSuggestionInfo(databaseName: string) {
  const container = createContainer(databaseName, 'MongoDB database');
  appendLine(container, 'Usage', "db.getSiblingDB('name')");
  appendDocsLink(container, DOCS.database);
  return container;
}

export function createMongoCollectionSuggestionInfo(
  collectionName: string,
  databaseName: string | undefined,
  fields: string[]
) {
  const container = createContainer(collectionName, 'MongoDB collection');
  if (databaseName) appendLine(container, 'Database', databaseName);
  appendLine(container, 'Fields', String(fields.length));

  if (fields.length) {
    const fieldsList = document.createElement('div');
    fieldsList.className = 'mt-1 max-h-[8rem] overflow-auto text-xs';
    fieldsList.textContent = fields.join(', ');
    container.appendChild(fieldsList);
  }

  appendDocsLink(container, DOCS.collection);
  return container;
}

export function createMongoCatalogSuggestionInfo(
  entry: MongoScriptCatalogEntry
) {
  const container = createContainer(entry.label, entry.type);
  appendLine(container, 'Signature', entry.detail);

  if (entry.requiresConfirmation) {
    const warning = document.createElement('div');
    warning.className = 'mt-1 text-xs text-amber-600 dark:text-amber-400';
    warning.textContent = 'Requires confirmation before execution';
    container.appendChild(warning);
  }

  appendDocsLink(
    container,
    entry.type === 'class' ? DOCS.bson : DOCS.collection
  );
  return container;
}
