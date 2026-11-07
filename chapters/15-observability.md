# Find the expensive workload

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

A fleet becomes slow while individual test queries look healthy.

The goal is to distinguish query latency, call volume, resource use, and waiting.

## Before you start

Prerequisites: Plans and lock diagnosis.

Runtime: a real PostgreSQL server with independent sessions. The single-connection browser runtime cannot reproduce this investigation.

## Planned investigation

Run a mixed workload and use server statistics to locate cumulative cost and inspect representative plans.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

pg_stat_statements where installed, activity, wait events, and repeated workload measurements.

## A successful explanation

Explain the dominant workload and propose a measurable intervention.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/monitoring-stats.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
