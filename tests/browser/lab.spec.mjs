import {test,expect} from '@playwright/test';
import {pages} from '../../scripts/catalog.mjs';
for(const [slug,,file,,runtime] of pages.filter(([s,,f,,r])=>r!=='server' && (s==='getting-started'||f.startsWith('chapters/')))){
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

for(const width of [820,1024,1280]) {
  test(`navigation preserves reading width at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('index.html');
    const menu=page.getByRole('button',{name:'Chapters',exact:true});
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded',width<1200?'false':'true');
    const before=await page.locator('main').boundingBox();
    if(width<1200){
      expect(before.width).toBeGreaterThan(width*.85);
      await menu.click();
      await expect(page.locator('#sidebar')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
    }else{
      const rail=await page.locator('#sidebar').boundingBox();
      expect(rail.width).toBeLessThanOrEqual(224);
      await menu.click();
    }
    await expect(menu).toHaveAttribute('aria-expanded','false');
    await expect(page.locator('#sidebar')).not.toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/navigation-${width}.png`});
  });
}
test('server lessons label copy-only sessions and do not start a browser database',async({page})=>{
  await page.goto('transactions.html');
  await expect(page.locator('.eyebrow')).toContainText('Server investigation');
  await expect(page.locator('.terminal-cell').first()).toContainText('Session observer');
  await expect(page.locator('.run')).toHaveCount(0);
  await expect(page.locator('#db-status')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'server setup',exact:true})).toBeVisible();
});
