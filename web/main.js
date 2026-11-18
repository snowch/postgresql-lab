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
    for(const cell of cells) {
      cell.querySelector('.run').disabled=busy||!ready;
      const localStatus=cell.querySelector('.cell-status');
      const message=!ready
        ? operation==='init'?'Starting PostgreSQL…':'Use Reset database to run SQL.'
        : busy
          ? active===cell?'Executing SQL…':'The shared database is busy.'
          : '';
      localStatus.textContent=message;
      localStatus.hidden=!message;
    }
    if(save)save.disabled=busy||!ready;
    if(restore)restore.disabled=busy||!savedCheckpoint;
    if(checkpointDownload)checkpointDownload.disabled=busy||!savedCheckpoint;
  }
  function clearResults() {
    execution=0;
    cells.forEach(cell=>{
      cell.querySelector('.result').replaceChildren();
      delete cell.dataset.executed;delete cell.dataset.execution;delete cell.dataset.attemptFailed;
      cell.querySelector('.execution-note').hidden=true;
      cell.querySelector('.query-error').hidden=true;
    });
  }
  function updateNotes() {
    for(const cell of cells) {
      const note=cell.querySelector('.execution-note');
      const messages = [];
      if (cell.dataset.execution) {
        if (cell.querySelector('textarea').value !== cell.dataset.executed) {
          messages.push('SQL edited. This result is from the last successful SQL in this editor.');
        }
        if (cell.dataset.attemptFailed) {
          messages.push('The latest attempt failed. The previous result is shown below.');
        }
        if (Number(cell.dataset.execution) < execution) {
          messages.push('The database may have changed since this result.');
        }
      }
      note.hidden = !messages.length;
      note.textContent = messages.join(' ');
    }
  }
  function reportFailure(message) {
    if(!active)return;
    const error=active.querySelector('.query-error');
    error.hidden=false;
    error.textContent=message;
    active.dataset.attemptFailed='true';
    execution++;
    updateNotes();
  }
  function finish() {
    const cell=active;
    const returnFocus=ready && cell?.querySelector('.cell-status')===document.activeElement;
    active=null;operation=null;setBusy(false);
    if(returnFocus)cell.querySelector('.run').focus({preventScroll:true});
  }
  function render(container,results) {
    container.replaceChildren();
    for(const result of results) {
      const isPlan=result.fields[0]?.name==='QUERY PLAN';
      const note=document.createElement('p');note.className='result-note';
      if(isPlan)note.textContent=result.totalRows>100?'Query plan. First 100 lines shown.':'Query plan';
      else if(result.fields.length) {
        const rows=`${result.totalRows} ${result.totalRows===1?'row':'rows'} returned.`;
        note.textContent=rows+(result.totalRows>100?' Showing the first 100.':'');
      }else {
        const affected=result.affectedRows;
        note.textContent=affected===undefined?'Statement complete.':`Statement complete. ${affected} ${affected===1?'row':'rows'} affected.`;
      }
      container.append(note);
      if(!result.rows.length)continue;
      if(isPlan) {
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
      worker.terminate();worker=null;ready=false;
      const message=`Stopped after ${milliseconds/1000} seconds. Reset database to continue.`;
      reportFailure(message);
      if(operation==='snapshot')checkpointStatus.textContent=message;
      status.textContent='Database stopped. Reset database to start again.';
      finish();
    },milliseconds);
  }
  function initialize(snapshot=null) {
    worker?.terminate();worker=null;clearTimeout(timer);active=null;operation='init';ready=false;setBusy(true);clearResults();
    status.textContent=snapshot?'Restoring checkpoint into a fresh PostgreSQL instance…':'Starting PostgreSQL and loading 60,000 orders…';
    if(snapshot)checkpointStatus.textContent='Restoring checkpoint into a fresh PostgreSQL instance…';
    let currentWorker;
    try {
      currentWorker=new Worker(new URL('./db-worker.js',import.meta.url),{type:'module'});
    } catch(error) {
      status.textContent=`Database failed to start. ${error.message}`;
      if(snapshot)checkpointStatus.textContent=status.textContent;
      finish();
      return;
    }
    worker=currentWorker;
    currentWorker.onmessage=({data})=>{
      if(worker!==currentWorker)return;
      clearTimeout(timer);
      if(data.type==='ready') {
        ready=true;status.textContent=data.restored?'Ready · checkpoint restored · verify the data':'Ready · 60,000 orders · in-memory database';
        status.title=data.version;
        if(data.restored)checkpointStatus.textContent='Checkpoint restored. Run the verification SQL below.';
      }else if(data.type==='snapshot') {
        savedCheckpoint=data.snapshot;
        checkpointStatus.textContent=`Checkpoint saved (${(savedCheckpoint.size/1048576).toFixed(1)} MiB). Run the next experiment when ready.`;
        status.textContent='Ready · recovery checkpoint saved';
      }else if(data.type==='checkpoint-blocked') {
        checkpointStatus.textContent='Checkpoint not saved. The transaction is still open. Run COMMIT or ROLLBACK, then save again.';
        status.textContent='Ready · transaction open';
      }else if(data.type==='error') {
        if(active) {
          reportFailure(`SQL error. ${data.message}. Open transactions are rolled back.`);
        }else if(checkpointStatus)checkpointStatus.textContent=`Checkpoint operation failed: ${data.message}`;
        status.textContent=ready?'Operation failed · edit and retry, or reset':`Database failed to start: ${data.message}`;
      }else if(active) {
        render(active.querySelector('.result'),data.results);
        delete active.dataset.attemptFailed;
        active.dataset.executed=active.dataset.submitted;active.dataset.execution=String(++execution);updateNotes();
        status.textContent='Ready · changes shared by experiments on this page';
      }
      finish();
    };
    currentWorker.onerror=event=>{
      if(worker!==currentWorker)return;
      clearTimeout(timer);ready=false;
      status.textContent=`Database worker failed: ${event.message||'reload or reset to retry'}`;
      reportFailure(status.textContent);
      finish();
    };
    worker.postMessage({type:'init',snapshot});timeout(90000);
  }
  for(const cell of cells) {
    const editor=cell.querySelector('textarea'),original=editor.value;
    const recover=cell.querySelector('.recover');
    const runButton=cell.querySelector('.run');
    const localStatus=cell.querySelector('.cell-status');
    let previousEdit=null;
    function updateRecovery() {
      recover.hidden=previousEdit===null||editor.value===previousEdit;
    }
    function replaceSql(sql) {
      const outgoing=editor.value;
      if(outgoing!==original&&outgoing!==sql)previousEdit=outgoing;
      editor.value=sql;
      updateRecovery();
      updateNotes();
      editor.focus();
      editor.setSelectionRange(0,0);
      editor.scrollTop=0;
      editor.scrollLeft=0;
    }
    cell.querySelector('.restore').addEventListener('click',()=>replaceSql(original));
    recover.addEventListener('click',()=>{if(previousEdit!==null)replaceSql(previousEdit);});
    editor.addEventListener('input',()=>{updateNotes();updateRecovery();});
    cell.querySelector('.copy').addEventListener('click',async event=>{
      try{await navigator.clipboard.writeText(editor.value);event.target.textContent='Copied';}
      catch{editor.focus();editor.select();event.target.textContent='Select and copy';}
      setTimeout(()=>event.target.textContent='Copy SQL',2000);
    });
    const run=()=>{
      if(!ready||busy)return;
      const moveFocus=document.activeElement===runButton;
      active=cell;operation='query';setBusy(true);
      cell.querySelector('.query-error').hidden=true;
      status.textContent='Executing SQL…';
      if(moveFocus)localStatus.focus({preventScroll:true});
      cell.dataset.submitted=editor.value;worker.postMessage({type:'exec',sql:editor.value});timeout(30000);
    };
    runButton.addEventListener('click',run);
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
  let id;
  try {id=decodeURIComponent(location.hash.slice(1));}
  catch {return;}
  const target=document.getElementById(id);
  if(!target)return;
  let parent=target;
  while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
  if(location.hash)requestAnimationFrame(()=>target.scrollIntoView());
}
window.addEventListener('hashchange',revealAnchor);
revealAnchor();
