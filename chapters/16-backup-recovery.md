# Prove you can recover

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

An accidental delete is discovered after new orders have arrived.

The goal is to separate logical export, physical backup, WAL archiving, and point-in-time recovery.

## Before you start

Prerequisites: Server access and transaction basics.

Runtime: a real PostgreSQL server with independent sessions. The single-connection browser runtime cannot reproduce this investigation.

## Planned investigation

Back up an isolated server, make controlled changes, and restore into a separate instance to a chosen point.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Restore logs, recovered rows, consistency checks, and measured recovery time.

## A successful explanation

Demonstrate a tested restore and describe its recovery point and data loss boundary.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/backup.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
