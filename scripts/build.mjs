import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { marked } from 'marked';
import { build } from 'vite';
import { groups, pages } from './catalog.mjs';
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
await rm('.stage', { recursive: true, force: true });
await mkdir('.stage', { recursive: true });
await cp('web', '.stage/web', { recursive: true });
await mkdir('.stage/web/engine', {recursive:true});
for (const name of ['pglite.wasm','initdb.wasm','pglite.data']) await cp(`node_modules/@electric-sql/pglite/dist/${name}`, `.stage/web/engine/${name}`);
for (const [i, [slug, title, file, status, runtime]] of pages.entries()) {
  let body = marked.parse(await readFile(file, 'utf8'));
  let cell = 0;
  body = body.replace(/<pre><code class="language-sql">([\s\S]*?)<\/code><\/pre>/g, (_, code) => {
    const id = `sql-${++cell}`;
    return `<section class="sql-cell" aria-label="SQL experiment ${cell}"><div class="cell-heading"><span>SQL · ${String(cell).padStart(2,'0')}</span><div><button class="copy" type="button">Copy SQL</button><button class="restore" type="button">Restore SQL</button></div></div><textarea id="${id}" spellcheck="false" aria-label="SQL experiment ${cell}" rows="${Math.min(18,code.split('\n').length + 1)}">${code}</textarea><div class="cell-actions"><button class="run" type="button" disabled>Run SQL</button><span class="cell-hint">Ctrl / ⌘ + Enter</span></div><p class="execution-note" hidden></p><div class="result" role="region" aria-label="Results for experiment ${cell}" tabindex="0"></div></section>`;
  });
  body = body.replace(/<pre><code class="language-(sql-[a-z-]+|sh)">([\s\S]*?)<\/code><\/pre>/g, (_,lang,code)=>{
    const label=lang==='sh'?'Terminal':lang.replace('sql-','Session ').replace('-async',' · leave running');
    return `<section class="terminal-cell" aria-label="${label}"><div class="cell-heading"><span>${label} · real server</span><button class="copy" type="button">Copy</button></div><pre><code>${code}</code></pre></section>`;
  });
  const headings=[];
  body=body.replace(/<h2>(.*?)<\/h2>/g,(_,title)=>{const id=title.replace(/<[^>]*>/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');headings.push([id,title]);return `<h2 id="${id}">${title}</h2>`;});
  const toc=slug.match(/^(index|getting-started|dataset|glossary|runtime)$/)?'':`<nav class="chapter-toc" aria-label="On this page">${headings.map(([id,t])=>`<a href="#${id}">${t}</a>`).join('')}</nav>`;
  body=body.replace(/(<h1>.*?<\/h1>\s*<p>[\s\S]*?<\/p>)/,`$1${toc}`);
  const nav = groups.map(g => `<div class="nav-group"><p>${g.title}</p>${g.pages.map(([s,t,,st,rt]) => `<a href="./${s}.html" ${s===slug?'aria-current="page"':''}>${escape(t)}${st==='outline'?'<span class="nav-status">Outline</span>':rt==='server'?'<span class="nav-status">Server</span>':''}${rt==='server'?'<span class="sr-only"> · Real server lab</span>':''}</a>`).join('')}</div>`).join('');
  const previous=pages[i-1], next=pages[i+1];
  const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="An advanced, hands-on journey through PostgreSQL. Run real SQL in your browser."><title>${escape(title)} · PostgreSQL Lab</title><link rel="stylesheet" href="./web/style.css"><script type="module" src="./web/main.js"></script></head><body data-page="${slug}"><a class="skip" href="#content">Skip to content</a><header><a class="brand" href="./index.html"><span class="brand-icon">P<span>g</span></span>PostgreSQL <strong>Lab</strong></a><div class="header-right"><span class="local-label">Learn by investigating</span><a href="https://github.com/snowch/postgresql-lab">GitHub</a><button id="menu" type="button" aria-expanded="false" aria-controls="sidebar">Chapters</button></div></header><button id="nav-backdrop" type="button" aria-label="Close chapter navigation" tabindex="-1"></button><aside id="sidebar" aria-label="Book navigation">${nav}<p class="nav-footer">PostgreSQL, in your browser.<br>Developer → operator.</p></aside><main id="content" tabindex="-1"><div class="eyebrow">${status==='outline'?'Planned chapter · '+(runtime==='server'?'Real PostgreSQL':'Browser lab'):runtime==='server'?'Server investigation · PostgreSQL':cell?'Browser investigation · PostgreSQL / WASM':'The interactive field guide'}</div>${body}${cell?'<div id="runtime-bar" class="runtime-bar"><span id="db-status" role="status">Starting PostgreSQL…</span><div><button id="download-sql" type="button">Download SQL</button> <button id="reset-db" type="button">Reset database</button></div></div>':''}<nav class="page-turn" aria-label="Chapter navigation">${previous?`<a href="./${previous[0]}.html"><small>Previous</small>${escape(previous[1])}</a>`:'<span></span>'}${next?`<a href="./${next[0]}.html"><small>Next</small>${escape(next[1])} →</a>`:''}</nav><footer>PostgreSQL Lab · Experiments run locally. Plans are evidence, timings are context.</footer></main></body></html>`;
  await writeFile(`.stage/${slug}.html`, html);
}
await build({root:resolve('.stage'), base:'./', logLevel:'info', worker:{format:'es'}, build:{outDir:resolve('dist'),emptyOutDir:true,rollupOptions:{input:Object.fromEntries(pages.map(([slug])=>[slug,resolve(`.stage/${slug}.html`)]))}}});
