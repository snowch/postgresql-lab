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
  for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
    if(/^(https?:|data:)/.test(match[1]))continue;
    await access(resolve(dirname(`dist/${slug}.html`),match[1].split('#')[0]));
  }
}
console.log(`Checked ${pages.length} pages, outline contracts, and all local asset/navigation links.`);
