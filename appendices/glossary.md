# Plan vocabulary

Use this page as a reference after reading a plan in context.

| Term | Meaning |
| --- | --- |
| Access path | A method for obtaining rows, such as a sequential or index scan. |
| Cardinality | Number of rows at a point in query execution. |
| Cost | Planner estimate in relative units, not elapsed milliseconds. |
| Selectivity | Fraction of rows a condition matches. |
| Sequential scan | Reads through the table and applies its filter. |
| Index condition | Condition used to constrain access through an index. |
| Filter | Test applied to candidate rows after they are obtained. |
| Bitmap heap scan | Fetches table pages using row positions assembled through bitmap access. |
| Index-only scan | Uses index values and visibility information to avoid heap access where possible. |
| Heap | PostgreSQL table storage containing row versions. |
| Visibility map | Per-page information including whether all tuples are visible to all relevant transactions. |
| Buffer hit | A requested block was already in PostgreSQL's shared buffer cache. |
| Buffer read | A block was loaded into that cache; this is not necessarily physical device I/O. |
| Loop | One execution of a plan node; actual rows is reported per loop. |
| Covering index | Index containing all column values a particular query needs. |
| Extended statistics | Statistics describing relationships between columns or expressions. |
| Dependencies | Statistics about how strongly columns determine one another. |
| MCV | Most-common-values list, which can include combinations across columns. |
| MVCC | Multiversion concurrency control: row versions support transaction visibility. |
| HOT | Heap-only tuple update: an optimization that can avoid new index entries when its conditions hold. |

See [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) for the full reference.
