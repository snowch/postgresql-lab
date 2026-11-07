# Resolve a production incident

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

A release adds a new query and the order service degrades under load.

The goal is to combine plan, statistics, locks, and workload evidence into one diagnosis.

## Before you start

Prerequisites: The preceding investigations.

Runtime: a real PostgreSQL server with independent sessions. The single-connection browser runtime cannot reproduce this investigation.

## Planned investigation

Investigate an isolated multi-session incident, propose competing hypotheses, apply a reversible intervention, and verify recovery.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

A timeline of observations, query plans, blockers, and workload outcomes.

## A successful explanation

Produce an evidence-backed diagnosis, recovery steps, and a prevention plan.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/performance-tips.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
