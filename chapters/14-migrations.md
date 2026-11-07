# Change a busy database

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

A schema deployment blocks order creation.

The goal is to plan schema changes around lock duration, validation, and recovery.

## Before you start

Prerequisites: Locks, constraints, and indexes.

Runtime: a real PostgreSQL server with independent sessions. The single-connection browser runtime cannot reproduce this investigation.

## Planned investigation

Compare index builds on a busy table, stage constraint validation, and bound waits with timeouts.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Lock modes, waiting sessions, invalid indexes, and rollback or retry states.

## A successful explanation

Write a staged migration and recovery plan grounded in observed blocking.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/sql-altertable.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
