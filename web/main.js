const menu = document.querySelector('#menu');
const sidebar = document.querySelector('#sidebar');
const wide = matchMedia('(min-width: 1200px)');
function setNavigation(open) {
  menu.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('nav-open', open);
  sidebar.inert = !open;
  if (open) sidebar.querySelector('[aria-current="page"]')?.scrollIntoView({block:'nearest'});
}
setNavigation(wide.matches);
menu.addEventListener('click',()=>setNavigation(menu.getAttribute('aria-expanded')!=='true'));
wide.addEventListener('change',()=>setNavigation(wide.matches));
document.querySelector('#nav-backdrop').addEventListener('click',()=>setNavigation(false));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && menu.getAttribute('aria-expanded')==='true') {
    setNavigation(false);menu.focus();
  }
});
document.querySelectorAll('.terminal-cell .copy').forEach(button=>button.addEventListener('click',async()=>{
  const code=button.closest('.terminal-cell').querySelector('code');
  try {await navigator.clipboard.writeText(code.textContent);button.textContent='Copied';}
  catch {const range=document.createRange();range.selectNodeContents(code);getSelection().removeAllRanges();getSelection().addRange(range);button.textContent='Select and copy';}
  setTimeout(()=>button.textContent='Copy',2000);
}));
const cells = [...document.querySelectorAll('.sql-cell')];
if (cells.length) startLab();
function startLab() {
  let worker, active, timer, ready = false, execution = 0;
  document.querySelector('#download-sql').addEventListener('click',()=>{
    const sql=cells.map((c,i)=>`-- Experiment ${i+1}\n${c.querySelector('textarea').value}`).join('\n\n');
    const url=URL.createObjectURL(new Blob([sql],{type:'text/plain'}));
    const a=document.createElement('a');a.href=url;a.download=`${document.body.dataset.page}.sql`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const status = document.querySelector('#db-status');
  const reset = document.querySelector('#reset-db');
  const setBusy = busy => cells.forEach(c=>c.querySelector('.run').disabled = busy || !ready);
  const render = (container, results) => {
    container.replaceChildren();
    for (const result of results) {
      const note = document.createElement('p');
      note.className = 'result-note';
      note.textContent = result.fields.length ? `${result.totalRows} row(s)${result.totalRows>100?' · showing first 100':''}` : `Statement complete${result.affectedRows!==undefined?` · ${result.affectedRows} affected row(s)`:''}`;
      container.append(note);
      if (!result.rows.length) continue;
      if (result.fields[0]?.name === 'QUERY PLAN') {
        const pre=document.createElement('pre'); pre.textContent=result.rows.map(r=>r['QUERY PLAN']).join('\n'); container.append(pre);
      } else {
        const table=document.createElement('table'), head=table.createTHead().insertRow();
        result.fields.forEach(f=>{const th=document.createElement('th'); th.textContent=f.name; head.append(th);});
        const body=table.createTBody();
        result.rows.forEach(row=>{const tr=body.insertRow();result.fields.forEach(f=>{const value=row[f.name];tr.insertCell().textContent=value===null?'NULL':typeof value==='object'?JSON.stringify(value):String(value);});});
        container.append(table);
      }
    }
  };
  function initialize() {
    worker?.terminate(); clearTimeout(timer); active=null; ready=false; setBusy(true);
    execution=0; cells.forEach(c=>{c.querySelector('.result').replaceChildren(); delete c.dataset.executed; delete c.dataset.execution; c.querySelector('.execution-note').hidden=true;});
    status.textContent='Starting PostgreSQL and loading 60,000 orders…';
    worker = new Worker(new URL('./db-worker.js', import.meta.url), {type:'module'});
    worker.onmessage = ({data}) => {
      clearTimeout(timer);
      if (data.type==='ready') {
        ready=true; status.textContent='Ready · 60,000 orders · in-memory database'; status.title=data.version;
      } else if (data.type==='error') {
        if (active) { delete active.dataset.execution; active.querySelector('.execution-note').hidden=true; active.querySelector('.result').textContent=`SQL error: ${data.message}. Any open transaction was rolled back.`; }
        status.textContent=ready?'SQL failed · edit and retry, or reset':'Database failed to start. Use Reset database to retry.';
        if (!active) status.title=data.message;
      } else if (active) {
        render(active.querySelector('.result'), data.results); active.dataset.executed=active.dataset.submitted; active.dataset.execution=String(++execution); updateNotes(); status.textContent='Ready · changes shared by experiments on this page';
      }
      active=null; setBusy(false);
    };
    worker.onerror = event => {
      clearTimeout(timer); ready=false; setBusy(true);status.textContent=`Database worker failed: ${event.message || 'reload or reset to retry'}`;
    };
    worker.postMessage({type:'init'});
  }
  function updateNotes() {
    for(const cell of cells) {
      const note=cell.querySelector('.execution-note');
      note.hidden=!cell.dataset.execution;
      if (!note.hidden) note.textContent=cell.querySelector('textarea').value!==cell.dataset.executed ? 'SQL edited · output below is from the previous SQL.' : `Execution ${cell.dataset.execution}${Number(cell.dataset.execution)<execution?' · later statements may have changed the database.':''}`;
    }
  }
  for (const cell of cells) {
    const editor=cell.querySelector('textarea'), original=editor.value;
    cell.querySelector('.restore').addEventListener('click',()=>{editor.value=original;updateNotes();});
    editor.addEventListener('input',updateNotes);
    cell.querySelector('.copy').addEventListener('click',async e=>{
      try { await navigator.clipboard.writeText(editor.value); e.target.textContent='Copied'; }
      catch { editor.focus();editor.select();e.target.textContent='Select and copy'; }
      setTimeout(()=>e.target.textContent='Copy SQL',2000);
    });
    const run=()=>{
      if (!ready || active) return;
      active=cell; setBusy(true);cell.querySelector('.result').textContent='Running…';status.textContent='Executing SQL…';
      cell.dataset.submitted=editor.value;
      worker.postMessage({type:'exec',sql:editor.value});
      timer=setTimeout(()=>{worker.terminate();ready=false;cell.querySelector('.result').textContent='Stopped after 30 seconds. Reset database to continue.';status.textContent='Database stopped · reset to start again';active=null;setBusy(true);},30000);
    };
    cell.querySelector('.run').addEventListener('click',run);
    editor.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();run();}});
  }
  reset.addEventListener('click',initialize);
  initialize();
}
