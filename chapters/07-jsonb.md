# Give JSONB a job

Order metadata gains a sales channel, and a flexible document becomes a frequent reporting filter. Choose the operator and index together.

**You will learn to** distinguish JSON containment from text extraction, compare GIN and expression
indexes, and account for validation and updates. Prerequisite: index conditions and SQL constraints.

## Give documents a predictable shape

JSONB stores JSON in a form PostgreSQL can search and index. The first editor builds one document
per order. Inspect `metadata` for the `channel`, `priority`, and `tags` keys.

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
even when extracting them as text produces similar-looking output. Compare `json_type`
with `text_type` after running SQL 02.

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

The existence operator `?` checks a top-level key. This example checks that `channel` exists and contains a JSON string.

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

Which plan uses the index on document contents? Which uses the index on extracted channel text?
Use the displayed index names to support your answer.

<details><summary>A hint for explaining the results</summary>

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

After the original experiments, replace [SQL 05](#sql-5) with the following and select
**Run SQL** to classify documents with a missing, null, or zero priority.

```text
SELECT label, doc ? 'priority' AS has_key,
       (doc -> 'priority') = 'null'::jsonb AS json_null,
       (doc -> 'priority') = '0'::jsonb AS numeric_zero
FROM (VALUES ('missing', '{}'::jsonb),
             ('null', '{"priority": null}'::jsonb),
             ('zero', '{"priority": 0}'::jsonb)) AS examples(label, doc);
```

Inspect `has_key`, `json_null`, and `numeric_zero`. Why is `json_null` SQL NULL for the
missing key and true for an explicit JSON null?

Next: [divide a growing table](./partitioning.html).

Primary source: [JSON types and indexing](https://www.postgresql.org/docs/current/datatype-json.html).
