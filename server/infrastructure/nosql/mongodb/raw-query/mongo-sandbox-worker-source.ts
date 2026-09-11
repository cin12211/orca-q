export function createMongoSandboxWorkerSource() {
  return `
    const { parentPort, workerData } = require('node:worker_threads');
    require('ses');
    const lockdown = globalThis.lockdown;
    const Compartment = globalThis.Compartment;
    lockdown({ errorTaming: 'unsafe', stackFiltering: 'concise' });
    const harden = globalThis.harden || (value => Object.freeze(value));
    const send = message => parentPort.postMessage(message);
    const pending = new Map();
    let sequence = 0;
    const rpc = (request) => new Promise((resolve, reject) => {
      const id = 'rpc-' + (++sequence);
      pending.set(id, { resolve, reject });
      send({ type: 'rpc', request: { ...request, id } });
    });
    parentPort.on('message', message => {
      if (message.type !== 'rpc-response') return;
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      if (message.response && message.response.ok === false) item.reject(new Error(message.response.error));
      else item.resolve(message.response);
    });
    const cursorFacade = descriptor => {
      const modifiers = [];
      const cursor = { __mongoCursor: true, descriptor, modifiers };
      for (const method of ['sort','project','skip','limit','batchSize','hint','collation','maxTimeMS','comment','allowDiskUse']) {
        cursor[method] = (...args) => { modifiers.push({ method, args }); return cursor; };
      }
      return cursor;
    };
    const collectionFacade = collection => {
      const value = { collection };
      for (const method of [
        'find','aggregate','listIndexes','findOne','countDocuments','estimatedDocumentCount','distinct','options','isCapped','indexExists','indexInformation',
        'insertOne','insertMany','replaceOne','updateOne','updateMany','deleteOne','deleteMany','findOneAndUpdate','findOneAndReplace','findOneAndDelete','bulkWrite','createIndex','createIndexes','dropIndex','dropIndexes','rename','drop'
      ]) {
        value[method] = (...args) => {
          if (['find','aggregate','listIndexes'].includes(method)) return cursorFacade({ source: { target: 'collection', collection, method, args }, modifiers: [] });
          return rpc({ kind: 'collection-call', collection, method, args });
        };
      }
      return harden(value);
    };
    const db = harden({
      collection: name => collectionFacade(name),
      listCollections: (...args) => cursorFacade({ source: { target: 'database', method: 'listCollections', args }, modifiers: [] }),
      command: (...args) => rpc({ kind: 'database-call', method: 'command', args }),
    });
    const consoleFacade = {};
    for (const level of ['log','info','warn','error']) consoleFacade[level] = (...args) => send({ type: 'log', entry: { level, args } });
    const endowments = harden({ db, params: workerData.params || {}, console: harden(consoleFacade), ObjectId: undefined, Decimal128: undefined, Binary: undefined, UUID: undefined, BSON: undefined, EJSON: undefined });
    (async () => {
      try {
        const compartment = new Compartment(endowments);
        const run = compartment.evaluate(workerData.compiledCode);
        const value = await run(endowments);
        if (value && value.__mongoCursor) send({ type: 'result', result: { kind: 'cursor', descriptor: value.descriptor, modifiers: value.modifiers } });
        else send({ type: 'result', result: { kind: 'value', value } });
      } catch (error) {
        send({ type: 'error', error: { message: error && error.message || String(error), stack: error && error.stack || '' } });
      }
    })();
  `;
}
