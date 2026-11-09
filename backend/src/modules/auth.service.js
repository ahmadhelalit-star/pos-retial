import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { transaction } from '../db/pool.js';
import { AppError, fail } from '../http/errors.js';
import { hash, audit } from './common.js';
import { loadUser } from './auth.repository.js';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [algorithm,salt,hex] = (stored ?? '').split(':');
  const expected = algorithm === 'scrypt' && /^[a-f0-9]{128}$/.test(hex ?? '') ? Buffer.from(hex,'hex') : Buffer.alloc(64);
  const actual = await scrypt(password, salt || 'dummy-salt',64,{ N:32768,r:8,p:1,maxmem:64*1024*1024 });
  return algorithm === 'scrypt' && timingSafeEqual(expected,actual);
}
export async function login(pool, username, password, ip, sessionHours) {
  const result = await transaction(pool, async (db) => {
    const key = hash(`${ip}:${(username??'').toLowerCase()}`);
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`login:${key}`]);
    await db.query("INSERT INTO login_attempts(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN 0 ELSE login_attempts.failures END,window_start=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE login_attempts.window_start END",[key]);
    const attempt = (await db.query('SELECT failures FROM login_attempts WHERE key=$1',[key])).rows[0];
    if (attempt.failures >= 8) return { error: new AppError(429,'LOGIN_THROTTLED','Try again later') };
    const row = (await db.query('SELECT id,password_hash,active FROM users WHERE lower(username)=lower($1)',[username])).rows[0];
    const valid = await verifyPassword(password,row?.password_hash);
    if (!row?.active || !valid) {
      await db.query('UPDATE login_attempts SET failures=failures+1 WHERE key=$1',[key]);
      return { error: new AppError(401,'INVALID_CREDENTIALS','بيانات الدخول غير صحيحة / Invalid credentials') };
    }
    await db.query('DELETE FROM login_attempts WHERE key=$1',[key]);
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(24).toString('base64url');
    await db.query("INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+$4*interval '1 hour')",[hash(token),row.id,csrfToken,sessionHours]);
    const user = await loadUser(db,row.id);
    await audit(db,user,'auth.login',user.id);
    return { token,csrfToken,user };
  });
  if (result.error) throw result.error;
  return result;
}
export function requirePermission(permission) {
  return (req,_res,next) => { if (!req.user.permissions.includes(permission)) fail(403,'PERMISSION_DENIED',`Permission required: ${permission}`); next(); };
}
export function authenticate(pool) {
  return async (req,_res,next) => {
    const token = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('retail_session='))?.slice(15);
    if (!token || token.length > 128) fail(401,'AUTH_REQUIRED','تسجيل الدخول مطلوب / Login required');
    const session = (await pool.query('SELECT user_id,csrf_token FROM sessions WHERE token_hash=$1 AND expires_at>now()',[hash(token)])).rows[0];
    const user = session ? await loadUser(pool,session.user_id) : null;
    if (!user) fail(401,'AUTH_REQUIRED','Session expired');
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers['x-csrf-token'] !== session.csrf_token) fail(403,'CSRF_REQUIRED','CSRF token required');
    req.user=user; req.csrfToken=session.csrf_token; req.sessionHash=hash(token); next();
  };
}
export async function requireWarehouse(db,user,warehouseId) {
  const warehouse = (await db.query('SELECT * FROM warehouses WHERE company_id=$1 AND id=$2',[user.companyId,warehouseId])).rows[0];
  if (!warehouse || !user.branches.includes(warehouse.branch_id) || !user.warehouses.includes(warehouseId)) fail(403,'WAREHOUSE_DENIED','Warehouse or branch outside user scope');
  return warehouse;
}
