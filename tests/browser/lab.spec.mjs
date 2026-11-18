import {test,expect} from '@playwright/test';
import {pages} from '../../scripts/catalog.mjs';
import {verifyTransfer} from './transfer.mjs';
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
      await expect(cell.getByRole('button',{name:'Run SQL',exact:true})).toBeEnabled({timeout:45000});
      await expect(cell.locator('.query-error')).toBeHidden();
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
      await expect(experiments[3].locator('.result-note')).toHaveText('Query plan');
      await page.screenshot({path:'test-results/desktop-plans.png',fullPage:true});
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:'test-results/desktop-viewport.png'});
      const cell=page.locator('.sql-cell').first();
      const previous=await cell.locator('.result').innerHTML();
      const original=await cell.locator('textarea').inputValue();
      await cell.locator('textarea').fill('SELECT broken_column FROM orders;');
      await expect(cell.locator('.execution-note')).toContainText('SQL edited');
      await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
      await expect(cell.locator('.query-error')).toContainText('SQL error');
      expect(await cell.locator('.result').innerHTML()).toBe(previous);
      await expect(cell.locator('.execution-note')).toContainText('last successful SQL');
      await cell.locator('textarea').fill('SELECT 42 AS recovered;');
      await cell.getByRole('button',{name:'Restore SQL',exact:true}).click();
      await expect(cell.locator('textarea')).toHaveValue(original);
      await cell.getByRole('button',{name:'Recover edit',exact:true}).click();
      await expect(cell.locator('textarea')).toHaveValue('SELECT 42 AS recovered;');
      await expect(cell.locator('textarea')).toBeFocused();
      await cell.locator('textarea').press('Control+Enter');
      await expect(cell.locator('.result')).toContainText('recovered');
      await expect(cell.locator('.query-error')).toBeHidden();
      await cell.locator('textarea').fill('DELETE FROM orders;');
      await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
      await expect(cell.locator('.result')).toContainText('60000 rows affected');
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
    if(slug==='reading-plans')await page.reload();
    await verifyTransfer(page,slug);
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
  expect(await page.locator('#runtime-bar').evaluate(el=>el.nextElementSibling.classList.contains('sql-cell'))).toBe(true);
  await expect(cell.locator('.cell-status')).toBeHidden();
  await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cell.locator('.result')).toContainText('orders_pkey');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/mobile-plans.png',fullPage:true});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/mobile-viewport.png'});
});

test('a running SQL cell keeps local feedback and restores keyboard focus',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('reading-plans.html');
  const cell=page.locator('.sql-cell').first();
  const run=cell.getByRole('button',{name:'Run SQL',exact:true});
  await expect(run).toBeEnabled({timeout:60000});
  await cell.locator('textarea').fill('SELECT 1 AS before;');
  await run.click();
  await expect(cell.locator('.result')).toContainText('before');
  await cell.locator('textarea').fill('SELECT 2 AS after FROM pg_sleep(1);');
  await run.press('Enter');
  await expect(cell.locator('.cell-status')).toHaveText('Executing SQL…');
  await expect(cell.locator('.cell-status')).toBeFocused();
  await expect(cell.locator('.result')).toContainText('before');
  await expect(cell.locator('.result')).toContainText('after');
  await expect(run).toBeFocused();
});

test('a same-source SQL failure marks the earlier successful result',async({page})=>{
  await page.goto('getting-started.html');
  const cell=page.locator('.sql-cell').first();
  const run=cell.getByRole('button',{name:'Run SQL',exact:true});
  await expect(run).toBeEnabled({timeout:60000});
  await cell.locator('textarea').fill('CREATE TEMP TABLE retry_duplicate AS SELECT 1 AS prior_value; SELECT * FROM retry_duplicate;');
  await run.click();
  await expect(cell.locator('.result table')).toContainText('prior_value');
  await run.click();
  await expect(cell.locator('.query-error')).toContainText('already exists');
  await expect(cell.locator('.execution-note')).toContainText('The latest attempt failed. The previous result is shown below.');
  await expect(cell.locator('.result table')).toContainText('prior_value');
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
test('a blocked checkpoint preserves the transaction and saved checkpoint, and reset clears the checkpoint',async({page})=>{
  await page.goto('backup-recovery.html');
  await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
  const cell=page.locator('.sql-cell').first();
  await cell.locator('textarea').fill('CREATE TABLE recovery_check (id int); INSERT INTO recovery_check VALUES (1);');
  await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cell.locator('.result')).toContainText('Statement complete');
  await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();
  await expect(page.locator('#checkpoint-status')).toContainText('Checkpoint saved',{timeout:60000});
  await cell.locator('textarea').fill('BEGIN; INSERT INTO recovery_check VALUES (2); SELECT id FROM recovery_check ORDER BY id;');
  await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cell.locator('.result tbody td')).toHaveText(['1','2']);
  await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();
  await expect(page.locator('#checkpoint-status')).toContainText('The transaction is still open');
  await cell.locator('textarea').fill('SELECT id FROM recovery_check ORDER BY id;');
  await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cell.locator('.result tbody td')).toHaveText(['1','2']);
  await cell.locator('textarea').fill('COMMIT;');
  await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cell.locator('.result table')).toHaveCount(0);
  await page.getByRole('button',{name:'Restore checkpoint',exact:true}).click();
  await expect(page.locator('#checkpoint-status')).toContainText('Checkpoint restored',{timeout:60000});
  await cell.locator('textarea').fill('SELECT id FROM recovery_check ORDER BY id;');
  await cell.getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cell.locator('.result tbody td')).toHaveText(['1']);
  await page.getByRole('button',{name:'Reset database',exact:true}).click();
  await expect(page.locator('#db-status')).toContainText('Ready',{timeout:60000});
  await expect(page.getByRole('button',{name:'Restore checkpoint',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Download checkpoint',exact:true})).toBeDisabled();
  await expect(page.locator('#checkpoint-status')).toHaveText('No checkpoint saved.');
});

for (const colorScheme of ['light','dark']) {
  test(`optional contents and browser actions are usable on a narrow ${colorScheme} viewport`, async ({page})=>{
    await page.emulateMedia({colorScheme});
    await page.setViewportSize({width:320,height:800});
    await page.goto('locks.html');
    const contents=page.locator('.chapter-contents');
    const summary=contents.locator('summary');
    await expect(contents).not.toHaveAttribute('open');
    await expect(page.locator('.experiment-setup')).toBeVisible();
    await summary.press('Enter');
    await expect(contents.getByRole('link',{name:'Transfer the idea'})).toBeVisible();
    await summary.press('Space');
    await expect(contents).not.toHaveAttribute('open');
    const editor=page.locator('#sql-1');
    await expect(page.locator('.run').first()).toBeEnabled({timeout:60000});
    await editor.press('Control+Enter');
    await expect(page.locator('.result').first()).toContainText('1 row affected');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const menu = await page.getByRole('button',{name:'Chapters',exact:true}).boundingBox();
    expect(menu.x + menu.width).toBeLessThanOrEqual(310);
    await editor.scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/locks-320-${colorScheme}.png`});
  });
}
