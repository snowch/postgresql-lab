import {spawn, execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pages} from '../scripts/catalog.mjs';
const compose=['compose','-f','server/compose.yml'];
const docker=(args)=>execFileSync('docker',[...compose,...args],{encoding:'utf8',timeout:90000,stdio:['ignore','pipe','pipe']});
const sql=q=>docker(['exec','-T','db','psql','-X','-U','postgres','-d','lab','-At','-v','ON_ERROR_STOP=1','-c',q]).trim();
let serial=0;
class Session {
  constructor(name){
    this.buffer='';this.output='';
    this.child=spawn('docker',[...compose,'exec','-T','-e',`PGAPPNAME=lab-${name}`,'db','sh','-c','exec psql -X -q -A -t -U postgres -d lab 2>&1']);
    this.child.stdout.setEncoding('utf8');this.child.stdout.on('data',chunk=>{
      this.buffer+=chunk;
      let newline;
      while((newline=this.buffer.indexOf('\n'))>=0){
        const line=this.buffer.slice(0,newline).replace(/\r$/,'');this.buffer=this.buffer.slice(newline+1);
        if(line===this.marker){const output=this.output;this.output='';clearTimeout(this.timer);this.resolve?.(output);this.resolve=null;}
        else this.output+=line+'\n';
      }
    });
    this.child.stderr.on('data',d=>process.stderr.write(d));
    this.child.on('exit',code=>{if(this.resolve)this.reject(new Error(`session exited ${code}`));});
  }
  run(query){
    assert.equal(this.resolve,null, 'Cannot send another command to a busy session');
    return new Promise((resolve,reject)=>{
      this.resolve=resolve;this.reject=reject;this.marker=`LAB_DONE_${++serial}`;
      this.timer=setTimeout(()=>{this.resolve=null;reject(new Error('Session command timed out: '+query));},25000);
      this.child.stdin.write(`${query}\n\\echo ${this.marker}\n`);
    });
  }
  close(){clearTimeout(this.timer);this.child.stdin.end('ROLLBACK;\n\\q\n');}
}
// Initialize resolve to null so busy checks catch accidental interleaving.
Session.prototype.resolve=null;
console.log(docker(['up','-d','--wait']));
docker(['exec','-T','db','psql','-U','postgres','-d','lab','-f','/lab/server/reset.sql']);
for(const [slug,,file,,runtime] of pages){
  if(runtime!=='server'||slug==='server-setup')continue;
  docker(['exec','-T','db','psql','-U','postgres','-d','lab','-f','/lab/server/reset.sql']);
  const sessions=Object.fromEntries(['a','b','observer'].map(n=>[n,new Session(n)]));
  const pending={};
  try{
    for(const s of Object.values(sessions))await s.run('\\set VERBOSITY sqlstate\nSET search_path=lab,public;');
    const source=await readFile(file,'utf8');
    const blocks=[...source.matchAll(/```(sql-(?:a|b|observer)(?:-async)?|sh)\n([\s\S]*?)```/g)];
    for(const [,lang,command]of blocks){
      if(lang==='sh'){
        // Exact published shell commands, executed from the repository root.
        execFileSync('bash',['-e','-c',command],{encoding:'utf8',timeout:90000,stdio:['ignore','pipe','pipe']});
        if(slug==='replication') {
          const replica=q=>docker(['exec','-T','db','psql','-X','-h','127.0.0.1','-p','5433','-U','postgres','-d','lab','-At','-v','ON_ERROR_STOP=1','-c',q]).trim();
          if(command.includes('pg_last_wal_receive_lsn')) assert.equal(replica('SELECT count(*) FROM lab.replica_marker'),'1');
          if(command.includes('standby.sh caught-up')) assert.equal(replica('SELECT count(*) FROM lab.replica_marker'),'2');
          if(command.includes('standby.sh promote')) assert.equal(replica('SELECT pg_is_in_recovery(); SELECT count(*) FROM lab.replica_marker;'),'f\n3');
        }
      } else {
        const name=lang.slice(4).replace('-async','');
        if(pending[name]){await pending[name];delete pending[name];}
        const execute=async()=>{
          const output=await sessions[name].run(command);
          const expected=command.match(/-- expect-error: (\w+)/)?.[1];
          if(expected)assert.ok(output.includes(`ERROR:  ${expected}`)||output.includes(`ERROR: ${expected}`),`${slug}: expected ${expected}, got ${output}`);
          else assert.ok(!/^ERROR:/m.test(output),`${slug}: ${output}`);
          return output;
        };
        if(lang.endsWith('-async')){
          pending[name]=execute();pending[name].catch(()=>{});
          // Confirm the exact session is waiting before the observer is asked to inspect it.
          let waiting=false;
          for(let n=0;n<100;n++){
            if(sql(`SELECT count(*) FROM pg_stat_activity WHERE application_name='lab-${name}' AND wait_event_type='Lock'`)==='1'){waiting=true;break;}
            await new Promise(r=>setTimeout(r,30));
          }
          assert.ok(waiting,`${slug}: asynchronous session should wait on a lock`);
        }else await execute();
      }
    }
    await Promise.all(Object.values(pending));
    if(slug==='transactions')assert.equal(sql('SELECT count(*) FROM lab.on_call WHERE available'),'1');
    if(slug==='locks')assert.equal(sql("SELECT stock FROM lab.inventory WHERE sku='book'"),'8');
    if(slug==='migrations')assert.equal(sql("SELECT indisvalid FROM pg_index WHERE indexrelid='lab.orders_tenant_online'::regclass"),'t');
    if(slug==='backup-recovery'){
      assert.equal(sql('SELECT string_agg(id::text,\',\' ORDER BY id) FROM lab.recovery_marker'),'2');
      const restored=docker(['exec','-T','db','psql','-X','-U','postgres','-d','lab_restore','-Atc','SELECT string_agg(id::text,\',\' ORDER BY id) FROM lab.recovery_marker; SELECT count(*) FROM lab.orders;']).trim();
      assert.equal(restored,'1\n60000');
    }
    if(slug==='production-incident')assert.equal(sql('SELECT total_cents = 1000 + (42 * 7919) % 20000 + 2 FROM lab.orders WHERE id=42'),'t');
    console.log(`PASS ${slug}: published session schedule and commands`);
  } finally {for(const s of Object.values(sessions))s.close();}
}
console.log('All seven real-server chapters passed. Compose service left running for inspection.');
