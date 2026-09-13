import { describe, expect, it } from 'vitest';
import { MONGO_SCRIPT_PLACEHOLDER } from '~/components/modules/raw-query/mongo/constants/mongoScriptCatalog';

describe('MONGO_SCRIPT_PLACEHOLDER', () => {
  it('explains the injected db variable and shows an executable database and collection example', () => {
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain(
      'db is initialized with the active MongoDB database.'
    );
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain(
      "const database = db.getSiblingDB('DATABASE');"
    );
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain(
      "const collection = database.collection('COLLECTION');"
    );
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain('return collection.find({});');
  });

  it('documents the injected helpers and official MongoDB references', () => {
    for (const helper of [
      'db',
      'database',
      'collection',
      'console',
      'ObjectId',
      'Long',
      'Int32',
      'Double',
      'Decimal128',
      'Binary',
      'UUID',
      'Timestamp',
      'BSON',
      'EJSON',
    ]) {
      expect(MONGO_SCRIPT_PLACEHOLDER).toContain(helper);
    }

    expect(MONGO_SCRIPT_PLACEHOLDER).toContain(
      'https://www.mongodb.com/docs/drivers/node/current/databases-collections/'
    );
    expect(MONGO_SCRIPT_PLACEHOLDER).toContain(
      'https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/'
    );
  });
});
