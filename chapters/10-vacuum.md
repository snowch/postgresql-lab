# Reclaim space with vacuum

> **Outline.** This chapter is planned. The full explanation, fixture, executable examples, and worked solution are not available yet.

## The question

A write-heavy table grows even though its live row count stays stable.

The goal is to distinguish reusable space from filesystem shrinkage and explain vacuum eligibility.

## Before you start

Prerequisites: Follow a row version.

Runtime: the browser database, subject to verification of the required PGlite features when this lesson is implemented.

## Planned investigation

Update and delete rows, run manual vacuum, then compare relation size with a rewrite in an isolated fixture.

The finished lesson will ask you to predict the outcome, run and edit the examples, inspect the evidence,
and test a competing explanation. It will include a fresh fixture and explicit recovery steps.

## Evidence to inspect

Live and dead tuple estimates, relation size, visibility, and reusable space.

## A successful explanation

Explain what ordinary VACUUM reclaims and why it may not shrink a relation. Autovacuum scheduling requires server validation.

The finished exercises will include hints, a worked explanation, and a transfer task. Plan choices and
execution times will be treated as observations, not fixed answers.

## Read ahead

[PostgreSQL documentation](https://www.postgresql.org/docs/current/routine-vacuuming.html).
Return to the [complete browser investigations](./reading-plans.html) to run SQL today.
