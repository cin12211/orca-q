# MongoDB EJSON Fidelity Design

## Goal

Preserve BSON values through the Mongo quick-query API and render them in a
Compass-style representation without relying on JavaScript evaluation.

## Contract

The API transports documents, filters, mutation selectors, and mutation bodies
as Canonical Extended JSON (EJSON). `EJSON.serialize(value, { relaxed: false
})` produces JSON-safe data at the server boundary; `EJSON.deserialize` restores
the BSON values before the MongoDB driver receives them. This preserves ObjectId,
Date, Int32, Long, Decimal128, Binary/UUID, Timestamp, BSON regular expressions,
Code, DBRef, MinKey, and MaxKey.

This follows MongoDB's mongosh EJSON reference: EJSON is the JSON-compatible
representation of BSON, `serialize()` exports BSON to Extended JSON objects,
`deserialize()` restores BSON, and `parse()` transforms JSON text input. See
https://www.mongodb.com/docs/mongodb-shell/reference/ejson/.

`_id` remains part of the EJSON document. UI-only identity is derived from the
canonical EJSON form of `_id`; mutations submit the original EJSON `_id` rather
than coercing it to a string, so non-ObjectId keys remain addressable.

## UI

Read-only document views transform recognized EJSON values to Compass-style
literal strings such as `ObjectId('...')`, `ISODate('...')`, `Long('...')`, and
`Decimal128('...')`. The existing JSON tree renderer suppresses quotes only for
these generated display literals. Editors remain strict JSON and expose canonical
EJSON, which is lossless and valid for all BSON types.

Raw filters accept canonical EJSON directly. A safe token conversion also accepts
the common Compass/mongosh conveniences `ObjectId('...')` and `ISODate('...')`,
converting them to EJSON before parsing; it never evaluates arbitrary input.

## Validation

Unit tests cover EJSON round-tripping, raw filter shorthand, nested display
formatting, and EJSON selector normalization. Nuxt tests cover mutation payloads
with a non-string `_id`. Existing API tests continue to verify the endpoint
contract against the Mongo fixture.
