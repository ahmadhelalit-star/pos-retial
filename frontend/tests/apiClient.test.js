import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient,productQuery,ApiError } from '../src/services/apiClient.js';

test('API authentication keeps cookie credentials and CSRF only in memory',async()=>{
  const calls=[];const api=createApiClient({fetcher:async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>calls.length===1?{csrfToken:'csrf-fixture'}:{saved:true}};}});
  await api.request('/auth/login',{method:'POST',body:{username:'fixture',password:'test-only'}});await api.request('/products',{method:'POST',body:{name:'Item'},key:'fixture-key'});
  assert.equal(calls[1].options.credentials,'include');assert.equal(calls[1].options.headers['X-CSRF-Token'],'csrf-fixture');assert.equal(calls[1].options.headers['Idempotency-Key'],'fixture-key');
});
test('401 invalidates auth and server validation errors retain detail',async()=>{
  let invalidated=false;const api=createApiClient({onUnauthorized:()=>{invalidated=true;},fetcher:async()=>({ok:false,status:401,json:async()=>({error:{code:'AUTH_REQUIRED',message:'Login required'}})})});
  await assert.rejects(api.request('/products'),error=>error instanceof ApiError&&error.code==='AUTH_REQUIRED');assert.equal(invalidated,true);
});
test('server search is bounded and encodes barcode/search filters',()=>{
  const query=productQuery({q:'A&B',page:3,limit:50,category:'all',stock:'low_stock'});assert.match(query,/page=3/);assert.match(query,/limit=50/);assert.match(query,/q=A%26B/);assert.doesNotMatch(query,/category=/);
});

test('local printing uses the authenticated API cookie path and CSRF protection',async()=>{
  let call;const api=createApiClient({fetcher:async(url,options)=>{call={url,options};return {ok:true,json:async()=>({saved:true})};}});
  api.setCsrfToken('local-csrf');await api.request('/local/thermal',{method:'PUT',body:{enabled:false}});
  assert.equal(call.url,'/api/local/thermal');assert.equal(call.options.credentials,'include');assert.equal(call.options.headers['X-Retail-Local'],'1');assert.equal(call.options.headers['X-CSRF-Token'],'local-csrf');
});
test('bad server responses surface errors rather than falling back to browser data',async()=>{
  const api=createApiClient({fetcher:async()=>({status:502,json:async()=>{throw new Error('HTML proxy error');}})});await assert.rejects(api.request('/products'),ApiError);
});
