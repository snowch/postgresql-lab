import {expect} from '@playwright/test';

function experiment(page, number) {
  return page.locator('.sql-cell').nth(number - 1);
}

async function run(cell, {error} = {}) {
  const button = cell.getByRole('button', {name:'Run SQL', exact:true});
  await button.click();
  await expect(button).toBeEnabled({timeout:45000});
  if (error) {
    await expect(cell.locator('.query-error')).toContainText(error);
  } else {
    await expect(cell.locator('.query-error')).toBeHidden();
    await expect(cell.locator('.result')).not.toBeEmpty();
  }
  return cell.locator('.result');
}

async function edit(cell, oldText, newText) {
  const editor = cell.locator('textarea');
  const source = await editor.inputValue();
  expect(source).toContain(oldText);
  await editor.fill(source.replace(oldText, newText));
}

const replacementTransfers = {
  'index-tradeoffs': [5, ['orders_pending_tenant_time', 'orders_pending']],
  constraints: [5, ['reservation_demo_check', 'null value in column "starts_at"']],
  jsonb: [5, []],
  partitioning: [4, ['orders_mar']],
  mvcc: [3, ['changed without an indexed key', 'changed with a note index']],
  'production-incident': [2, ['actual rows=15000']],
};

export async function verifyTransfer(page, slug) {
  if (slug in replacementTransfers) {
    const [number, needles] = replacementTransfers[slug];
    const cell = experiment(page,number);
    const code = await page.locator('pre code.language-text').innerText();
    await cell.locator('textarea').fill(code);
    const result = await run(cell);
    for (const needle of needles) await expect(result).toContainText(needle);
    if (slug === 'jsonb') {
      const rows = result.locator('tbody tr');
      for (const fields of [['missing','false','NULL','NULL'],['null','true','true','false'],['zero','true','false','true']]) {
        const matchingRow = rows.filter({has:page.getByRole('cell',{name:fields[0], exact:true})});
        await expect(matchingRow.locator('td')).toHaveText(fields);
      }
    }
    if (slug === 'partitioning') await expect(result.locator('pre')).not.toContainText('orders_feb');
    if (slug === 'mvcc') {
      const tupleLocations = await result.locator('tbody td:nth-child(3)').allTextContents();
      expect(tupleLocations).toHaveLength(2);
      expect(tupleLocations[0]).not.toBe(tupleLocations[1]);
    }
    return;
  }

  switch (slug) {
    case 'getting-started': {
      const cell = experiment(page,2);
      await edit(cell,'tenant_id = 42','tenant_id = 43');
      await expect((await run(cell)).locator('tbody td')).toHaveText(['43','600']);
      await edit(cell,'tenant_id = 43','tenant_id = 101');
      await expect(await run(cell)).toContainText('0 rows returned.');
      break;
    }
    case 'reading-plans': {
      const cell = experiment(page,4);
      const result = await run(cell);
      await expect(result).toContainText('Seq Scan');
      await expect(result).toContainText('Rows Removed by Filter: 59400');
      await edit(cell,'ORDER BY created_at DESC','ORDER BY id DESC');
      await run(cell);
      await expect(result).toContainText('orders_pkey');
      await expect(result).toContainText('Rows Removed by Filter:');
      break;
    }
    case 'designing-indexes': {
      const cell = experiment(page,1);
      await edit(cell,'tenant_id = 42', "status = 'pending'");
      const result = await run(cell);
      await expect(result).toContainText('Sort');
      const statement = await page.locator('pre code.language-text').innerText();
      await edit(cell,'EXPLAIN', `${statement.trim()}\nEXPLAIN`);
      await run(cell);
      await expect(result).toContainText('orders_pending_time');
      await expect(result).not.toContainText('Sort');
      break;
    }
    case 'advanced-sql': {
      const cell = experiment(page,2);
      const editor = cell.locator('textarea');
      const original = await editor.inputValue();
      await editor.fill(`INSERT INTO demo_orders VALUES (5, 100);\n${original}`);
      const result = await run(cell);
      await expect(result.locator('table').first().locator('tbody td')).toHaveText(['300']);
      await expect(result.locator('table').last().locator('tbody tr').last().locator('td')).toHaveText(['5','100','0']);
      break;
    }
    case 'vacuum': {
      const bytes = experiment(page,3).locator('.result tbody td').last();
      const original = Number(await bytes.innerText());
      await page.getByRole('button',{name:'Reset database',exact:true}).click();
      const first = experiment(page,1);
      await expect(first.locator('.run')).toBeEnabled({timeout:60000});
      await edit(first,'id <= 50000','id > 10000');
      for (const number of [1,2,3]) await run(experiment(page,number));
      await expect(experiment(page,3).locator('.result tbody td').first()).toHaveText('10000');
      expect(Number(await bytes.innerText())).toBeLessThan(original);
      break;
    }
    case 'transactions': {
      const cell = experiment(page,2);
      await edit(cell,'balance - 30','balance - 101');
      const result = await run(cell,{error:'transfer_accounts_balance_check'});
      await expect(result).toContainText('70');
      await cell.locator('textarea').fill('SELECT id, balance FROM transfer_accounts ORDER BY id;');
      await run(cell);
      await expect(result.locator('tbody td')).toHaveText(['1','80','2','120']);
      break;
    }
    case 'locks': {
      const cell = experiment(page,2);
      await edit(cell,'ACCESS EXCLUSIVE','ACCESS SHARE');
      await expect((await run(cell)).locator('tbody td')).toHaveText(['relation','AccessShareLock','true']);
      await expect(await run(experiment(page,3))).toContainText('0 rows returned.');
      break;
    }
    case 'observability': {
      const cell = experiment(page,2);
      const result = cell.locator('.result');
      await expect(result).toContainText('external merge');
      await edit(cell,'ORDER BY total_cents, id;', 'ORDER BY total_cents, id LIMIT 20;');
      await run(cell);
      await expect(result).toContainText('top-N heapsort');
      await expect(result).toContainText('actual rows=60000');
      break;
    }
    case 'backup-recovery': {
      const query = experiment(page,3);
      const editor = query.locator('textarea');
      const original = await editor.inputValue();
      const markers = query.locator('.result table').nth(1).locator('tbody tr td:first-child');
      await editor.fill(`INSERT INTO browser_recovery_marker VALUES (3, 'new checkpoint');\n${original}`);
      await run(query);
      await expect(markers).toHaveText(['1','3']);
      await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();
      await expect(page.locator('#checkpoint-status')).toContainText('Checkpoint saved');
      await editor.fill(original);
      await run(experiment(page,2));
      await page.getByRole('button',{name:'Restore checkpoint',exact:true}).click();
      await expect(page.locator('#checkpoint-status')).toContainText('Checkpoint restored',{timeout:60000});
      await run(query);
      await expect(markers).toHaveText(['1','3']);
      break;
    }
  }
}
