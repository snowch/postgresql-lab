# Understand replication lag

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

A user writes an order and cannot see it on the read replica.

The goal is to connect WAL generation, transport, replay, and read consistency.

## Before you start

Prerequisites: WAL and recovery.

Runtime: a real PostgreSQL server with independent sessions. The single-connection browser runtime cannot reproduce this investigation.

## Planned investigation

Use a primary and standby to observe asynchronous replication, delayed replay, and controlled promotion.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

LSNs, replay state, replica query results, and acknowledged-write durability assumptions.

## A successful explanation

Explain stale reads and choose a consistency policy; distinguish replication from backup.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/warm-standby.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
