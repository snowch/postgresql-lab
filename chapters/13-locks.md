# Investigate a blocked checkout

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

Checkout waits behind a transaction that appears idle.

The goal is to connect blocking statements to lock ownership and transaction lifetime.

## Before you start

Prerequisites: Transactions and isolation.

Runtime: a real PostgreSQL server with independent sessions. The single-connection browser runtime cannot reproduce this investigation.

## Planned investigation

Hold locks in one session, block another, inspect blockers, then reproduce and resolve a deadlock.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

pg_locks, pg_stat_activity, pg_blocking_pids, wait events, and deadlock errors.

## A successful explanation

Trace the blocking chain and choose a remedy with a stated impact.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/explicit-locking.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
