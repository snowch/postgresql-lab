import {test,expect} from '@playwright/test';
import {pages} from '../../scripts/catalog.mjs';
for(const [slug,,file,,runtime] of pages.filter(([s,,f,,r])=>r!=='server' && (s==='getting-started'||f.startsWith('chapters/')))){
  test(`${slug}: genuine browser WASM executes every experiment`,async({page})=>{
    const failures=[];page.on('pageerror',e=>failures.push(e.message));
    await page.goto(`${slug}.html`);
    await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
    const experiments=await page.locator('.sql-cell').all();
    for(const [i,cell] of experiments.entries()){
      if(slug==='backup-recovery' && i===1) {
        await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();
        await expect(page.locator('#checkpoint-status')).toContainText('Checkpoint saved',{timeout:60000});
        const download=page.waitForEvent('download');
        await page.getByRole('button',{name:'Download checkpoint',exact:true}).click();
        expect((await download).suggestedFilename()).toBe('postgresql-lab-checkpoint.tar.gz');
      }
      if(slug==='backup-recovery' && i===2) {
        await expect(experiments[1].locator('.result')).toContainText('after checkpoint');
        await page.getByRole('button',{name:'Restore checkpoint',exact:true}).click();
        await expect(page.locator('#db-status')).toContainText('checkpoint restored',{timeout:60000});
      }
      await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
      await expect(cell.locator('.result')).not.toHaveText('Running…',{timeout:45000});
      await expect(cell.locator('.result')).not.toContainText('SQL error');
      await expect(cell.locator('.result')).not.toBeEmpty();
    }
    expect(failures).toEqual([]);
    if(slug==='backup-recovery') {
      await expect(experiments[2].locator('.result')).toContainText('60000');
      await expect(experiments[2].locator('.result')).toContainText('before checkpoint');
      await expect(experiments[2].locator('.result')).not.toContainText('after checkpoint');
      await page.screenshot({path:'test-results/browser-recovery.png',fullPage:true});
      await page.locator('.snapshot-controls').evaluate(el=>el.scrollIntoView({block:'center'}));
      await page.screenshot({path:'test-results/recovery-controls-desktop.png'});
      await page.setViewportSize({width:390,height:844});
      await page.locator('.snapshot-controls').evaluate(el=>el.scrollIntoView({block:'center'}));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:'test-results/recovery-controls-mobile.png'});
    }
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
test('hybrid lessons keep server commands optional and separate from the browser database',async({page})=>{
  await page.goto('transactions.html');
  await expect(page.locator('.eyebrow')).toContainText('optional server extension');
  await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
  await expect(page.locator('.run').first()).toBeVisible();
  const extension=page.locator('.server-extension');
  await expect(extension).not.toHaveAttribute('open');
  await expect(extension.locator('.terminal-cell').first()).not.toBeVisible();
  await extension.locator('summary').first().click();
  await expect(extension.locator('.terminal-cell').first()).toBeVisible();
  await expect(extension.locator('.run')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'server setup',exact:true}).first()).toBeVisible();
  await page.goto('locks.html#find-the-blocker');
  await expect(page.locator('.server-extension')).toHaveAttribute('open','');
});
test('recovery controls reject open transactions and reset clears the checkpoint',async({page})=>{
  await page.goto('backup-recovery.html');
  await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
  const cell=page.locator('.sql-cell').first();
  await cell.locator('textarea').fill('BEGIN;');
  await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cell.locator('.result')).toContainText('Statement complete');
  await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();
  await expect(page.locator('#checkpoint-status')).toContainText('Commit or roll back',{timeout:60000});
  await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();
  await expect(page.locator('#checkpoint-status')).toContainText('Checkpoint saved',{timeout:60000});
  await page.getByRole('button',{name:'Reset database',exact:true}).click();
  await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
  await expect(page.getByRole('button',{name:'Restore checkpoint',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Download checkpoint',exact:true})).toBeDisabled();
  await expect(page.locator('#checkpoint-status')).toHaveText('No checkpoint saved.');
});
