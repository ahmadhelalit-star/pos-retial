import test from 'node:test';
import assert from 'node:assert/strict';
import { settings } from '../../developer/common.mjs';
import { chromium } from 'playwright-core';

test('Retail recovery UI clears credentials and returns to login without live writes', async () => {
  const config = await settings();
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = [], writes = [];
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === '/api/offline-activation/status') return route.fulfill({ json: { status: 'ACTIVE', activated: true, product: 'retail', setupRequired: false } });
    if(path==='/api/auth/me')return route.fulfill({status:401,json:{error:{code:'AUTH_REQUIRED',message:'Sign in'}}});
    if(path==='/api/auth/accounts')return route.fulfill({json:{items:[{id:'11111111-1111-4111-8111-111111111111',name:'Mock Admin',isAdmin:true}],branding:{name:'Test store'}}});
    if (path === '/api/admin-recovery/request') {
      assert.equal(request.postDataJSON().userId, '11111111-1111-4111-8111-111111111111');
      return route.fulfill({ json: { requestCode: 'MOCK-REQUEST' } });
    }
    if (path === '/api/admin-recovery/reset') {
      assert.equal(request.postDataJSON().recoveryCode, 'MOCK-CODE');
      assert.equal(request.postDataJSON().password, 'Mock-only-password-123!');
      return route.fulfill({ json: { recovered: true } });
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { writes.push(path); return route.abort(); }
    return route.continue();
  });
  try {
    await page.goto(config.origin);
    await page.getByRole('button', { name: 'نسيت رمز الأدمن؟', exact: true }).click();
    assert.equal(await page.getByLabel('اسم مستخدم المدير',{exact:true}).count(),0);
    await page.getByRole('button', { name: 'توليد طلب الاستعادة', exact: true }).click();
    await page.getByLabel('طلب الاستعادة', { exact: true }).waitFor();
    await page.getByLabel('كود استعادة Retail', { exact: true }).fill('MOCK-CODE');
    await page.getByLabel('كلمة المرور الجديدة', { exact: true }).fill('Mock-only-password-123!');
    await page.getByLabel('تأكيد كلمة المرور', { exact: true }).fill('Mock-only-password-123!');
    await page.getByRole('button', { name: 'استعادة المدير', exact: true }).click();
    await page.getByText('تم تغيير كلمة المرور وإغلاق الجلسات السابقة. يمكنك تسجيل الدخول الآن.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('كلمة المرور الجديدة', { exact: true }).inputValue(), '');
    await page.getByRole('button', { name: 'العودة لتسجيل الدخول', exact: true }).click();
    await page.getByRole('button',{name:'Mock Admin',exact:true}).waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
  } finally { await browser.close(); }
});
