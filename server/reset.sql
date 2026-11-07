\set ON_ERROR_STOP on
DROP SCHEMA IF EXISTS lab CASCADE;
CREATE SCHEMA lab;
SET search_path = lab, public;
\i /lab/web/seed.sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
