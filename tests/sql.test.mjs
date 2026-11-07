import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pages} from '../scripts/catalog.mjs';
const seed=await readFile('web/seed.sql','utf8');
for(const [slug,,file] of pages){
  const blocks=[...(await readFile(file,'utf8')).matchAll(/```sql\n([\s\S]*?)```/g)].map(m=>m[1]);
  if(!blocks.length)continue;
  test(`${slug}: all published SQL runs in order`,async()=>{
    const db=await PGlite.create();
    try{
      await db.exec(seed);
      const {rows}=await db.query('SELECT count(*)::int AS n, count(DISTINCT tenant_id)::int AS tenants FROM orders');
      assert.deepEqual(rows,[{n:60000,tenants:100}]);
      for(const sql of blocks)await db.exec(sql);
      const scalar=async query=>Object.values((await db.query(query)).rows[0])[0];
      if(slug==='constraints') {
        assert.equal(await scalar('SELECT count(*)::int FROM payments'),3);
        assert.equal(await scalar('SELECT count(*)::int FROM payments WHERE amount IS NULL OR amount<0'),0);
        assert.equal(await scalar('SELECT count(*)::int FROM billing_accounts WHERE id=9'),1);
      }
      if(slug==='advanced-sql') {
        assert.equal(await scalar('SELECT sum(amount)::int FROM demo_orders'),800);
        assert.equal(await scalar('SELECT sum(amount)::int FROM demo_orders o WHERE EXISTS(SELECT 1 FROM demo_events e WHERE e.order_id=o.id)'),300);
      }
      if(slug==='jsonb') assert.equal(await scalar("SELECT count(*)::int FROM order_metadata WHERE metadata->>'channel'='direct'"),1);
      if(slug==='partitioning') {
        const kept=await scalar('SELECT count(*)::int FROM orders_by_month');
        const detached=await scalar('SELECT count(*)::int FROM orders_jan');
        assert.equal(kept+detached,60000);
        assert.equal(kept,await scalar("SELECT count(*)::int FROM orders WHERE created_at >= timestamp '2025-02-01'"));
      }
      if(slug==='mvcc') assert.equal(await scalar('SELECT sum(balance)::int FROM version_demo'),50150);
      if(slug==='vacuum') assert.equal(await scalar('SELECT count(*)::int FROM vacuum_demo'),10000);
      if(slug==='maintenance') assert.equal(await scalar('SELECT count(*)::int FROM orders_growth WHERE tenant_id=999'),15000);
    }finally{await db.close();}
  });
}
test('index access preserves results; correlated estimates improve without changing data',async()=>{
  const db=await PGlite.create();
  try{
    await db.exec(seed);
    const sql='SELECT id, created_at, total_cents FROM orders WHERE tenant_id=42 ORDER BY created_at DESC LIMIT 20';
    const before=await db.query(sql);
    assert.equal(before.rows.length,20);
    await db.exec('CREATE INDEX test_cover ON orders(tenant_id,created_at DESC) INCLUDE(id,total_cents);');
    await db.exec('VACUUM (ANALYZE) orders;');
    assert.deepEqual((await db.query(sql)).rows,before.rows);
    const explain=async query=>(await db.query('EXPLAIN (ANALYZE, FORMAT JSON, TIMING OFF) '+query)).rows[0]['QUERY PLAN'][0].Plan;
    const filtered="SELECT id FROM orders WHERE country='GB' AND currency='GBP'";
    const initial=await explain(filtered);
    assert.equal(initial['Actual Rows'],6000);
    assert.ok(initial['Plan Rows']<initial['Actual Rows']/3);
    await db.exec('CREATE STATISTICS test_dep(dependencies) ON country,currency FROM orders; ANALYZE orders;');
    const improved=await explain(filtered);
    assert.equal(improved['Actual Rows'],initial['Actual Rows']);
    assert.ok(Math.abs(improved['Plan Rows']-6000)<Math.abs(initial['Plan Rows']-6000)/2);
    await db.exec('DROP STATISTICS test_dep; CREATE STATISTICS test_mcv(mcv) ON country,currency FROM orders; ANALYZE orders;');
    const contradictory=await explain("SELECT id FROM orders WHERE country='GB' AND currency='USD'");
    assert.equal(contradictory['Actual Rows'],0);
    assert.ok(contradictory['Plan Rows']<100);
  }finally{await db.close();}
});
