import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config.js';
const profile={DATABASE_URL:'postgresql://developer:test-only@127.0.0.1:5432/sham_retail_dev',NODE_ENV:'development',RETAIL_DEVELOPER_MODE:'true',HOST:'127.0.0.1',WEB_ORIGIN:'http://127.0.0.1:5196',PORT:'37961'};
test('explicit local Developer profile supports exactly the manually created database',()=>{
  assert.equal(new URL(readConfig(profile).databaseUrl).pathname,'/sham_retail_dev');
  for(const changes of [{RETAIL_DEVELOPER_MODE:'false'},{NODE_ENV:'test'},{NODE_ENV:'production'},{HOST:'0.0.0.0'},{WEB_ORIGIN:'http://192.168.1.10:5196'},{DATABASE_URL:'postgresql://developer:test-only@localhost/restaurant'},{DATABASE_URL:'postgresql://developer:test-only@localhost/sham_retail_other'}])assert.throws(()=>readConfig({...profile,...changes}));
  assert.equal(new URL(readConfig({...profile,DATABASE_URL:'postgresql://developer:test-only@127.0.0.1/sham_touch_retail_test',RETAIL_DEVELOPER_MODE:'false',NODE_ENV:'test'}).databaseUrl).pathname,'/sham_touch_retail_test');
});
