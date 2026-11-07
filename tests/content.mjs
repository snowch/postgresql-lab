import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pages} from '../scripts/catalog.mjs';
for(const [slug,,file,status] of pages){
  const source=await readFile(file,'utf8');
  assert.equal((source.match(/^# /gm)||[]).length,1,`${file}: one page title`);
  if(status==='outline') for(const text of ['**Outline.**','Prerequisites:','Runtime:','## Planned investigation','## A successful explanation']) assert.ok(source.includes(text),`${file}: ${text}`);
  if(file.startsWith('chapters/') && status==='ready') {
    for(const text of ['**You will learn to**','<details>','## Transfer the idea','Primary source']) assert.ok(source.includes(text),`${file}: complete learning structure: ${text}`);
    assert.ok(!source.includes('**Outline.**'),`${file}: ready chapters must have full content`);
  }
  const html=await readFile(`dist/${slug}.html`,'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,`${slug}: unique anchors and control IDs`);
  for(const [,fragment]of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(fragment),`${slug}: local fragment ${fragment}`);
  if(file.startsWith('chapters/')) {
    assert.ok(source.includes('```sql\n'),`${file}: genuine browser SQL`);
    if(source.includes('class="server-extension"')) {
      assert.ok(html.includes('optional server extension'),`${slug}: hybrid runtime label`);
      assert.ok(!html.includes('<details class="server-extension" id="server-extension" open'),`${slug}: server work starts optional and collapsed`);
    }
  }
  for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
    if(/^(https?:|data:)/.test(match[1]))continue;
    await access(resolve(dirname(`dist/${slug}.html`),match[1].split('#')[0]));
  }
}
console.log(`Checked ${pages.length} pages, outline contracts, and all local asset/navigation links.`);
