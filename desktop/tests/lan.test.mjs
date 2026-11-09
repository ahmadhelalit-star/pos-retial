import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
test('actual TLS server and loopback agent reject untrusted certificates and cross-origin device writes',async()=>{
  const server=new URL(process.env.TEST_TLS_URL),agent=new URL(process.env.TEST_AGENT_URL);assert.equal(server.hostname,'127.0.0.1');assert.equal(agent.hostname,'127.0.0.1');
  const ca=await readFile(process.env.TEST_TLS_CA);
  const health=certificate=>new Promise((resolve,reject)=>{const req=https.get(new URL('/api/health',server),{ca:certificate,rejectUnauthorized:true},res=>{let text='';res.on('data',part=>text+=part);res.on('end',()=>resolve(JSON.parse(text)));});req.on('error',reject);req.setTimeout(5000,()=>req.destroy(Error('Timeout')));});
  assert.equal((await health(ca)).product,'retail');await assert.rejects(health(''),/self-signed|certificate|verify/i);
  assert.equal((await fetch(new URL('/api/health',agent))).status,200);
  assert.equal((await fetch(new URL('/local/printers',agent),{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(new URL('/local/printers',agent),{method:'PUT',headers:{Origin:'https://untrusted.invalid','X-Retail-Local':'1','Content-Type':'application/json'},body:'{}'})).status,403);
  const rebound=await new Promise((resolve,reject)=>{const request=http.get(new URL('/local/status',agent),{headers:{Host:'untrusted.invalid'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);});assert.equal(rebound,403);
});
