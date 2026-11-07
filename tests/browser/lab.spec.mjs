import {test,expect} from '@playwright/test';
for(const slug of ['getting-started','reading-plans','designing-indexes','planner-estimates']){
  test(`${slug}: genuine browser WASM executes every experiment`,async({page})=>{
    const failures=[];page.on('pageerror',e=>failures.push(e.message));
    await page.goto(`${slug}.html`);
    await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
    for(const cell of await page.locator('.sql-cell').all()){
      await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
      await expect(cell.locator('.result')).not.toHaveText('Running…',{timeout:45000});
      await expect(cell.locator('.result')).not.toContainText('SQL error');
      await expect(cell.locator('.result')).not.toBeEmpty();
    }
    expect(failures).toEqual([]);
    if(slug==='reading-plans'){
      await page.screenshot({path:'test-results/desktop-plans.png',fullPage:true});
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:'test-results/desktop-viewport.png'});
      const cell=page.locator('.sql-cell').first();
      await cell.locator('textarea').fill('SELECT broken_column FROM orders;');
      await expect(cell.locator('.execution-note')).toContainText('SQL edited');
      await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
      await expect(cell.locator('.result')).toContainText('SQL error');
      await cell.locator('textarea').fill('SELECT 42 AS recovered;');
      await cell.locator('textarea').press('Control+Enter');
      await expect(cell.locator('.result')).toContainText('recovered');
      await cell.locator('textarea').fill('DELETE FROM orders;');
      await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
      await expect(cell.locator('.result')).toContainText('60000 affected');
      await page.getByRole('button',{name:'Reset database',exact:true}).click();
      await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
      await cell.locator('textarea').fill('SELECT count(*) FROM orders;');
      await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
      await expect(cell.locator('.result')).toContainText('60000');
      const downloadPromise=page.waitForEvent('download');
      await page.getByRole('button',{name:'Download SQL',exact:true}).click();
      expect((await downloadPromise).suggestedFilename()).toBe('reading-plans.sql');
      await cell.locator('textarea').fill('SELECT pg_sleep(10);');
      await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
      await expect(page.locator('#db-status')).toContainText('Executing');
      await page.getByRole('button',{name:'Reset database',exact:true}).click();
      await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
    }
  });
}
test('mobile navigation and SQL stay within viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('index.html');
  await page.getByRole('button',{name:'Chapters',exact:true}).click();
  await expect(page.locator('#menu')).toHaveAttribute('aria-expanded','true');
  await page.locator('#sidebar').getByRole('link',{name:'01 · Read a query plan',exact:true}).click();
  await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
  const cell=page.locator('.sql-cell').first();
  await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cell.locator('.result')).toContainText('orders_pkey');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/mobile-plans.png',fullPage:true});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/mobile-viewport.png'});
});
