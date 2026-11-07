# Keep plans healthy

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

A query regresses after a large batch changes the data distribution.

The goal is to separate ANALYZE, VACUUM, and index maintenance responsibilities.

## Before you start

Prerequisites: Statistics, MVCC, and vacuum.

Runtime: the browser database, subject to verification of the required PGlite features when this lesson is implemented.

## Planned investigation

Load a skewed batch, inspect stale estimates, analyze selected columns, and retest the plan.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Estimated versus actual rows, statistics targets, and maintenance effects.

## A successful explanation

Choose a maintenance action based on evidence instead of rebuilding everything.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/routine-vacuuming.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
