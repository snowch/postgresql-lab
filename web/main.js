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
function download(blob, filename) {
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function startLab() {
  let worker, active, timer, ready=false, busy=false, execution=0, savedCheckpoint=null, operation=null;
  const status=document.querySelector('#db-status');
  const checkpointStatus=document.querySelector('#checkpoint-status');
  const save=document.querySelector('#save-checkpoint');
  const restore=document.querySelector('#restore-checkpoint');
  const checkpointDownload=document.querySelector('#download-checkpoint');
  function setBusy(value) {
    busy=value;
    cells.forEach(cell=>cell.querySelector('.run').disabled=busy||!ready);
    if(save)save.disabled=busy||!ready;
    if(restore)restore.disabled=busy||!savedCheckpoint;
    if(checkpointDownload)checkpointDownload.disabled=busy||!savedCheckpoint;
  }
  function clearResults() {
    execution=0;
    cells.forEach(cell=>{
      cell.querySelector('.result').replaceChildren();
      delete cell.dataset.executed;delete cell.dataset.execution;
      cell.querySelector('.execution-note').hidden=true;
    });
  }
  function updateNotes() {
    for(const cell of cells) {
      const note=cell.querySelector('.execution-note');
      note.hidden=!cell.dataset.execution;
      if(!note.hidden)note.textContent=cell.querySelector('textarea').value!==cell.dataset.executed
        ? 'SQL edited · output below is from the previous SQL.'
        : `Execution ${cell.dataset.execution}${Number(cell.dataset.execution)<execution?' · later statements may have changed the database.':''}`;
    }
  }
  function render(container,results) {
    container.replaceChildren();
    for(const result of results) {
      const note=document.createElement('p');note.className='result-note';
      note.textContent=result.fields.length
        ? `${result.totalRows} row(s)${result.totalRows>100?' · showing first 100':''}`
        : `Statement complete${result.affectedRows!==undefined?` · ${result.affectedRows} affected row(s)`:''}`;
      container.append(note);
      if(!result.rows.length)continue;
      if(result.fields[0]?.name==='QUERY PLAN') {
        const pre=document.createElement('pre');pre.textContent=result.rows.map(row=>row['QUERY PLAN']).join('\n');container.append(pre);
      }else{
        const table=document.createElement('table'),head=table.createTHead().insertRow();
        result.fields.forEach(field=>{const th=document.createElement('th');th.textContent=field.name;head.append(th);});
        const body=table.createTBody();
        result.rows.forEach(row=>{
          const tr=body.insertRow();
          result.fields.forEach(field=>{
            const value=row[field.name];
            tr.insertCell().textContent=value===null?'NULL':value instanceof Date?value.toISOString():typeof value==='object'?JSON.stringify(value):String(value);
          });
        });
        container.append(table);
      }
    }
  }
  function timeout(milliseconds) {
    clearTimeout(timer);
    timer=setTimeout(()=>{
      worker.terminate();ready=false;
      const message=`Stopped after ${milliseconds/1000} seconds. Reset database to continue.`;
      if(active)active.querySelector('.result').textContent=message;
      if(operation==='snapshot')checkpointStatus.textContent=message;
      status.textContent='Database stopped · reset to start again';active=null;operation=null;setBusy(false);
    },milliseconds);
  }
  function initialize(snapshot=null) {
    worker?.terminate();clearTimeout(timer);active=null;operation='init';ready=false;setBusy(true);clearResults();
    status.textContent=snapshot?'Restoring checkpoint into a fresh PostgreSQL instance…':'Starting PostgreSQL and loading 60,000 orders…';
    if(snapshot)checkpointStatus.textContent='Restoring checkpoint into a fresh PostgreSQL instance…';
    worker=new Worker(new URL('./db-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      clearTimeout(timer);
      if(data.type==='ready') {
        ready=true;status.textContent=data.restored?'Ready · checkpoint restored · verify the data':'Ready · 60,000 orders · in-memory database';
        status.title=data.version;
        if(data.restored)checkpointStatus.textContent='Checkpoint restored. Run the verification SQL below.';
      }else if(data.type==='snapshot') {
        savedCheckpoint=data.snapshot;
        checkpointStatus.textContent=`Checkpoint saved · ${(savedCheckpoint.size/1048576).toFixed(1)} MiB. You can now damage the database.`;
        status.textContent='Ready · recovery checkpoint saved';
      }else if(data.type==='error') {
        if(active) {
          delete active.dataset.execution;active.querySelector('.execution-note').hidden=true;
          active.querySelector('.result').textContent=`SQL error: ${data.message}. Any open transaction was rolled back.`;
        }else if(checkpointStatus)checkpointStatus.textContent=`Checkpoint operation failed: ${data.message}`;
        status.textContent=ready?'Operation failed · edit and retry, or reset':`Database failed to start: ${data.message}`;
      }else if(active) {
        render(active.querySelector('.result'),data.results);
        active.dataset.executed=active.dataset.submitted;active.dataset.execution=String(++execution);updateNotes();
        status.textContent='Ready · changes shared by experiments on this page';
      }
      active=null;operation=null;setBusy(false);
    };
    worker.onerror=event=>{
      clearTimeout(timer);ready=false;active=null;operation=null;setBusy(false);
      status.textContent=`Database worker failed: ${event.message||'reload or reset to retry'}`;
    };
    worker.postMessage({type:'init',snapshot});timeout(90000);
  }
  for(const cell of cells) {
    const editor=cell.querySelector('textarea'),original=editor.value;
    cell.querySelector('.restore').addEventListener('click',()=>{editor.value=original;updateNotes();});
    editor.addEventListener('input',updateNotes);
    cell.querySelector('.copy').addEventListener('click',async event=>{
      try{await navigator.clipboard.writeText(editor.value);event.target.textContent='Copied';}
      catch{editor.focus();editor.select();event.target.textContent='Select and copy';}
      setTimeout(()=>event.target.textContent='Copy SQL',2000);
    });
    const run=()=>{
      if(!ready||busy)return;
      active=cell;operation='query';setBusy(true);
      cell.querySelector('.result').textContent='Running…';status.textContent='Executing SQL…';
      cell.dataset.submitted=editor.value;worker.postMessage({type:'exec',sql:editor.value});timeout(30000);
    };
    cell.querySelector('.run').addEventListener('click',run);
    editor.addEventListener('keydown',event=>{
      if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();run();}
    });
  }
  document.querySelector('#download-sql').addEventListener('click',()=>{
    const sql=cells.map((cell,i)=>`-- Experiment ${i+1}\n${cell.querySelector('textarea').value}`).join('\n\n');
    download(new Blob([sql],{type:'text/plain'}),`${document.body.dataset.page}.sql`);
  });
  save?.addEventListener('click',()=>{
    if(!ready||busy)return;
    operation='snapshot';setBusy(true);status.textContent='Saving database checkpoint…';
    checkpointStatus.textContent='Saving the current database files…';worker.postMessage({type:'snapshot'});timeout(60000);
  });
  restore?.addEventListener('click',()=>{if(savedCheckpoint&&!busy)initialize(savedCheckpoint);});
  checkpointDownload?.addEventListener('click',()=>{if(savedCheckpoint)download(savedCheckpoint,'postgresql-lab-checkpoint.tar.gz');});
  document.querySelector('#reset-db').addEventListener('click',()=>{
    savedCheckpoint=null;if(checkpointStatus)checkpointStatus.textContent='No checkpoint saved.';initialize();
  });
  initialize();
}
function revealAnchor() {
  const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if(!target)return;
  let parent=target.parentElement;
  while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
  if(location.hash)requestAnimationFrame(()=>target.scrollIntoView());
}
window.addEventListener('hashchange',revealAnchor);
revealAnchor();
