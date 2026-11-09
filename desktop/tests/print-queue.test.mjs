import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { PrintQueue } from '../print-queue.mjs';
const root=resolve(process.env.TEST_ARTIFACT_DIR??'../work/desktop');
test('durable queue never blindly repeats an uncertain Windows spool submission',async()=>{
  const directory=join(root,randomUUID());await mkdir(directory,{recursive:true});let sends=0;const queue=new PrintQueue({directory,render:async()=>['page'],spool:async()=>{sends++;throw Error('Spool response lost after possible acceptance');}});await queue.initialize();const job={id:randomUUID(),payload:{number:'TEST-1'},kind:'receipt',format:'80mm'};await queue.enqueue(job,'Synthetic printer');await queue.work();assert.equal((await queue.read(job.id)).state,'uncertain');await queue.enqueue(job,'Synthetic printer');await queue.work();assert.equal(sends,1);await assert.rejects(queue.retry(job.id));await queue.review(job.id,'confirmed_printed');assert.equal((await queue.read(job.id)).state,'confirmed_printed');
});
test('crash between submitting and acknowledgement becomes uncertain on restart',async()=>{
  const directory=join(root,randomUUID());await mkdir(directory,{recursive:true});const queue=new PrintQueue({directory,render:async()=>[],spool:async()=>{throw Error('Must not spool');}});const job={id:randomUUID(),payload:{},kind:'invoice',format:'A4'};const record=await queue.enqueue(job,'Synthetic printer');await queue.save({...record,state:'submitting'});await queue.initialize();assert.equal((await queue.read(job.id)).state,'uncertain');await queue.work();await assert.rejects(queue.enqueue(job,'Other printer'));
});
test('failure before spool can retry the same job exactly once',async()=>{
  const directory=join(root,randomUUID());await mkdir(directory,{recursive:true});let renders=0,sends=0;const queue=new PrintQueue({directory,render:async()=>{if(++renders===1)throw Error('Synthetic renderer failure');return ['page'];},spool:async()=>{sends++;}}),job={id:randomUUID(),payload:{},kind:'receipt',format:'58mm'};await queue.enqueue(job,'Synthetic printer');await queue.work();assert.equal((await queue.read(job.id)).state,'render_failed');await queue.retry(job.id);await queue.work();await queue.work();assert.equal(sends,1);assert.equal((await queue.read(job.id)).state,'spooled');
});

test('concurrent duplicate enqueue remains one durable job and one spool submission',async()=>{
  const directory=join(root,randomUUID());let sends=0;const queue=new PrintQueue({directory,render:async()=>['page'],spool:async()=>{sends++;}});await queue.initialize();const job={id:randomUUID(),kind:'receipt',format:'80mm',payload:{number:'CONCURRENT-ONLY'}};
  await Promise.all(Array.from({length:20},()=>queue.enqueue(job,'Synthetic printer')));await Promise.all([queue.work(),queue.work()]);assert.equal(sends,1);assert.equal((await queue.list()).length,1);assert.equal((await queue.list())[0].state,'spooled');
});
