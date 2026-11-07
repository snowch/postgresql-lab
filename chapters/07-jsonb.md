# Give JSONB a job

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

Flexible order metadata turns a reporting predicate into an expensive scan.

The goal is to choose relational columns or JSONB based on validation and access requirements.

## Before you start

Prerequisites: Constraints and index design.

Runtime: the browser database, subject to verification of the required PGlite features when this lesson is implemented.

## Planned investigation

Compare containment and extracted-value predicates, add GIN and expression indexes, and update large documents.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Operator semantics, index conditions, storage size, and write amplification.

## A successful explanation

Choose a representation and index whose semantics match the workload.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/datatype-json.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
