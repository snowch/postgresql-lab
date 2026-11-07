# Follow a row version

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

An update changes a value without immediately removing the old row version.

The goal is to connect tuple versions and transaction visibility to storage and index behavior.

## Before you start

Prerequisites: Transactions at the SQL level.

Runtime: the browser database, subject to verification of the required PGlite features when this lesson is implemented.

## Planned investigation

Inspect row identity around updates, compare HOT-eligible and indexed-column updates, and observe visibility in a controlled transaction.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Tuple identifiers, visible values, and visibility-map effects; document introspection support before using extensions.

## A successful explanation

Explain why one logical row can have multiple physical versions.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/mvcc.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
