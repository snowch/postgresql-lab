CREATE TABLE orders (
  id integer PRIMARY KEY,
  tenant_id integer NOT NULL,
  status text NOT NULL,
  country text NOT NULL,
  currency text NOT NULL,
  created_at timestamp NOT NULL,
  total_cents integer NOT NULL,
  payload text NOT NULL
);
INSERT INTO orders
SELECT g, 1 + (g - 1) % 100,
       CASE WHEN (g / 100) % 10 = 0 THEN 'pending' ELSE 'shipped' END,
       CASE WHEN g % 10 = 0 THEN 'GB' ELSE 'US' END,
       CASE WHEN g % 10 = 0 THEN 'GBP' ELSE 'USD' END,
       timestamp '2025-01-01' + g * interval '1 minute',
       1000 + (g * 7919) % 20000,
       repeat(md5(g::text), 4)
FROM generate_series(1, 60000) AS g;
SET jit = off;
SET max_parallel_workers_per_gather = 0;
ANALYZE orders;
