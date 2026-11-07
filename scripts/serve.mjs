import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.data':'application/octet-stream'};
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let path=decodeURIComponent(url.pathname).replace(/^\/postgresql-lab(?=\/|$)/,'');
  if(path.endsWith('/'))path+='index.html';
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  try{const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(data);}
  catch{res.writeHead(404).end('Not found');}
}).listen(4173,'0.0.0.0');
