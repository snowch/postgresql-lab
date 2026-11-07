# Work with sets and windows

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

A dashboard double-counts revenue after a join.

The goal is to reason about row multiplicity, window frames, LATERAL queries, and CTE behavior.

## Before you start

Prerequisites: Filtering, grouping, and joins.

Runtime: the browser database, subject to verification of the required PGlite features when this lesson is implemented.

## Planned investigation

Repair a fan-out aggregate, compute running totals with explicit frames, then compare alternative query shapes.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Result cardinality, duplicate keys, window peer behavior, and execution plans.

## A successful explanation

Produce correct totals and explain why each intermediate relation has its observed row count.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/queries.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
