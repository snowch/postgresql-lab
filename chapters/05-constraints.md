# Make invalid data impossible

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

Two code paths disagree about whether an order total may be negative.

The goal is to move invariants into CHECK, UNIQUE, foreign-key, and exclusion constraints.

## Before you start

Prerequisites: Basic SQL and table definitions.

Runtime: the browser database, subject to verification of the required PGlite features when this lesson is implemented.

## Planned investigation

Insert invalid rows, compare NULL behavior in checks and uniqueness, and attempt to break a relationship during a transaction.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Constraint errors, accepted rows, and transaction outcomes.

## A successful explanation

Express the invariant precisely, including NULL and transaction boundaries.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/ddl-constraints.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
