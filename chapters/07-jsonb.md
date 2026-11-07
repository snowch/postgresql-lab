# Give JSONB a job

Order metadata gains a sales channel, and a flexible document becomes a frequent reporting filter. Choose the operator and index together.

**You will learn to** distinguish JSON containment from text extraction, compare GIN and expression
indexes, and account for validation and updates. Prerequisite: index conditions and SQL constraints.

## Give documents a predictable shape

JSONB stores a decomposed binary representation of JSON. It supports structured operators and indexes;
it does not remove the need to decide which properties an application requires.

```sql
CREATE TABLE order_metadata AS
SELECT id, jsonb_build_object(
  'channel', CASE WHEN id % 10 = 0 THEN 'partner' ELSE 'web' END,
  'priority', id % 3,
  'tags', jsonb_build_array('order', country)
) AS metadata FROM orders;
ANALYZE order_metadata;
SELECT id, metadata FROM order_metadata ORDER BY id LIMIT 3;
```

Predict the type returned by `->` and `->>`. A JSON number and a JSON string are different values,
even when extracting them as text can produce similar-looking output.

```sql
SELECT metadata -> 'priority' AS json_value,
       metadata ->> 'priority' AS text_value,
       pg_typeof(metadata -> 'priority') AS json_type,
       pg_typeof(metadata ->> 'priority') AS text_type
FROM order_metadata WHERE id = 1;
```

## Search by containment

The `@>` operator tests whether a document contains a JSONB structure. Predict the match count for
partner orders, then inspect the plan before indexing.

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id FROM order_metadata WHERE metadata @> '{"channel":"partner"}'::jsonb;
CREATE INDEX metadata_gin ON order_metadata USING gin (metadata);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id FROM order_metadata WHERE metadata @> '{"channel":"partner"}'::jsonb;
```

A **GIN index** maps components such as keys and values to matching rows. It can support containment
without storing one B-tree key for every complete document. Inspect the actual index condition,
bitmap operations, and rechecks. A GIN recheck verifies candidate rows; its presence does not imply
incorrect results. A broad predicate can still favor a scan.

## Search an extracted value

Predict whether the existing GIN index supplies the same access path for this text comparison.
Then create a B-tree for that particular expression.

```sql
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id FROM order_metadata WHERE metadata ->> 'channel' = 'partner';
CREATE INDEX metadata_channel ON order_metadata ((metadata ->> 'channel'));
ANALYZE order_metadata;
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id FROM order_metadata WHERE metadata ->> 'channel' = 'partner';
```

An index supports particular operators on particular expressions. Similar business meaning does not
make two SQL forms interchangeable for index selection. A GIN operator class also changes supported
operations: `jsonb_path_ops` is useful for certain containment/path searches but does not support all
the key-existence operations of the default class.

## Validate and update deliberately

The existence operator `?` checks a top-level key. A type check can distinguish an integer-like JSON
number from an arbitrary string, although a full business range constraint needs more detail.

```sql
ALTER TABLE order_metadata ADD CONSTRAINT channel_shape
CHECK (metadata ? 'channel' AND jsonb_typeof(metadata -> 'channel') = 'string');
UPDATE order_metadata
SET metadata = jsonb_set(metadata, '{channel}', '"direct"'::jsonb)
WHERE id = 10;
SELECT metadata FROM order_metadata WHERE id = 10;
SELECT indexrelid::regclass AS name, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_index WHERE indrelid = 'order_metadata'::regclass;
```

`jsonb_set` returns an updated document; it is not an in-place patch to a few stored bytes. An UPDATE
still follows PostgreSQL row-version rules and can maintain both indexes. Large values may use TOAST,
PostgreSQL's out-of-line/compressed value storage. The fixture does not measure its production write cost.
A missing document can evade a CHECK through NULL, so add NOT NULL if the document itself is required.

## Explain the design

<details><summary>Hint</summary>

Start with the stable invariants and frequent predicates. Flexible metadata and core business columns
have different validation and indexing needs.

</details>

<details><summary>Worked explanation</summary>

GIN fits containment over document components. The expression B-tree fits equality on extracted
channel text. Neither index automatically supports every operator on the document. If channel is
required, frequently joined, and central to constraints, a typed relational column may be clearer.
JSONB can remain useful for optional metadata with a deliberately limited query contract.

</details>

## Transfer the idea

Write filters for a missing priority, JSON null priority, and numeric zero priority. Inspect their
results using a small VALUES relation before proposing an index. Explain why SQL NULL and JSON null
must not be treated as one category.

**Takeaway:** Choose a data representation, predicate semantics, and index as one design decision.
Next: [divide a growing table](./partitioning.html).

Primary source: [JSON types and indexing](https://www.postgresql.org/docs/current/datatype-json.html).
