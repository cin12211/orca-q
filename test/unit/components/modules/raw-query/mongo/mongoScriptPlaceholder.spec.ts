import { describe, expect, it } from 'vitest';
import {
  MONGO_SCRIPT_PLACEHOLDER,
  getMongoScriptPlaceholder,
} from '~/components/modules/raw-query/mongo/constants/mongoScriptCatalog';

describe('MONGO_SCRIPT_PLACEHOLDER', () => {
  it('explains the injected db variable and shows an executable database and collection example', () => {
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain(
      'db is initialized for the selected database.'
    );
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain(
      "const database = db.getSiblingDB('<databaseName>');"
    );
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain(
      "const collection = database.collection('<collectionName>');"
    );
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain('return result;');
  });

  it('documents the injected helpers, note and shortcut comment', () => {
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain('BSON helpers');
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain('console.log/info/warn/error()');
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain(
      "Shortcut: 'mquery' -> quickly generate query template."
    );
  });

  it('substitutes databaseName and collectionName in getMongoScriptPlaceholder', () => {
    const result = getMongoScriptPlaceholder('myDb', 'myColl');
    expect(result).toContain("const database = db.getSiblingDB('myDb');");
    expect(result).toContain(
      "const collection = database.collection('myColl');"
    );
  });

  it('substitutes only databaseName when collectionName is omitted', () => {
    const result = getMongoScriptPlaceholder('myDb');
    expect(result).toContain("const database = db.getSiblingDB('myDb');");
    expect(result).toContain(
      "const collection = database.collection('<collectionName>');"
    );
  });

  it('substitutes only collectionName when databaseName is omitted', () => {
    const result = getMongoScriptPlaceholder(undefined, 'myColl');
    expect(result).toContain(
      "const database = db.getSiblingDB('<databaseName>');"
    );
    expect(result).toContain(
      "const collection = database.collection('myColl');"
    );
  });

  it('preserves default placeholders when both are omitted', () => {
    const result = getMongoScriptPlaceholder();
    expect(result).toContain(
      "const database = db.getSiblingDB('<databaseName>');"
    );
    expect(result).toContain(
      "const collection = database.collection('<collectionName>');"
    );
  });
});
