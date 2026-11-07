# Pay for your indexes

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

A faster support query coincides with slower order imports.

The goal is to compare full, partial, expression, and covering indexes against the reads they support and the writes they maintain.

## Before you start

Prerequisites: Design for the query.

Runtime: the browser database, subject to verification of the required PGlite features when this lesson is implemented.

## Planned investigation

Create an index for pending orders, test predicate implication, then update indexed and non-indexed values. Compare storage after each change.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Index definitions, access conditions, heap fetches, index size, and update behavior.

## A successful explanation

Recommend the smallest useful index set and explain which query patterns each index serves.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/indexes.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
