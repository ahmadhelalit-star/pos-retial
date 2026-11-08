import { createHash } from 'node:crypto';
import { fail } from '../http/errors.js';
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export async function audit(db, user, action, entityId, details = {}) {
  await db.query('INSERT INTO audit_logs(company_id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)', [user.companyId, user.id, action, String(entityId), details]);
}
export async function idempotent(db, user, key, operation, body, work) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9:_-]{8,160}$/.test(key)) fail(400,'IDEMPOTENCY_KEY_REQUIRED','Valid Idempotency-Key required');
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`${user.companyId}:${key}`]);
  const requestHash = hash(JSON.stringify(body));
  const previous = (await db.query('SELECT * FROM idempotency_requests WHERE company_id=$1 AND key=$2',[user.companyId,key])).rows[0];
  if (previous) {
    if (previous.operation !== operation || previous.request_hash !== requestHash) fail(409,'IDEMPOTENCY_CONFLICT','Key already used for a different operation');
    return previous.response;
  }
  const response = await work();
  await db.query('INSERT INTO idempotency_requests(company_id,key,operation,request_hash,response) VALUES($1,$2,$3,$4,$5)', [user.companyId,key,operation,requestHash,response]);
  return response;
}
