# Divide a growing table

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

A date-bounded report still inspects years of historical data.

The goal is to distinguish partition pruning from index access and plan a retention boundary.

## Before you start

Prerequisites: Plans, indexes, and constraints.

Runtime: the browser database, subject to verification of the required PGlite features when this lesson is implemented.

## Planned investigation

Build monthly range partitions, compare prunable and non-prunable filters, and detach an old partition.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Partitions visited, local indexes, planning overhead, and uniqueness restrictions.

## A successful explanation

Explain what partitioning removes from the plan and what work still remains.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/ddl-partitioning.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
