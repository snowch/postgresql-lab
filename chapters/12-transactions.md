# Choose an isolation level

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

Two requests each see enough inventory and together oversell it.

The goal is to reproduce isolation anomalies and design retryable transactions.

## Before you start

Prerequisites: SQL transactions and row versions.

Runtime: a real PostgreSQL server with independent sessions. The single-connection browser runtime cannot reproduce this investigation.

## Planned investigation

Use two independent server sessions to interleave inventory reads and writes under multiple isolation levels.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Session schedules, snapshots, final invariants, and serialization errors.

## A successful explanation

Identify the anomaly, preserve the invariant, and define the retry boundary.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/transaction-iso.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
