import { chromium } from 'playwright';

const LOGIN_URL = 'https://dashboard.katabump.com/auth/login';
const DASHBOARD_URL = 'https://dashboard.katabump.com/dashboard';

const email = process.env.KATABUMP_EMAIL;
const password = process.env.KATABUMP_PASSWORD;

if (!email || !password) {
  throw new Error(
    'KATABUMP_EMAIL and KATABUMP_PASSWORD must be set'
  );
}

const browser = await chromium.launch({
  headless: true
});

const context = await browser.newContext();
const page = await context.newPage();

try {
  console.log('Opening KataBump login page...');

  await page.goto(LOGIN_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  console.log('Waiting for login form...');

  await page.locator('#login-form').waitFor({
    state: 'visible',
    timeout: 15000
  });

  console.log('Filling email...');

  await page.locator('#email').fill(email);

  console.log('Filling password...');

  await page.locator('#password').fill(password);

  /*
   * KataBump uses Cloudflare Turnstile.
   *
   * We do not create, forge, inject, or bypass a Turnstile token.
   * We simply wait for the widget to produce its response normally.
   */

  console.log('Waiting for Cloudflare Turnstile...');

  const turnstile = page.locator(
    'input[name="cf-turnstile-response"]'
  );

  await turnstile.waitFor({
    state: 'attached',
    timeout: 15000
  });

  await page.waitForFunction(() => {
    const input = document.querySelector(
      'input[name="cf-turnstile-response"]'
    );

    return Boolean(input?.value?.trim());
  }, null, {
    timeout: 30000
  });

  console.log('Turnstile response detected.');

  console.log('Submitting login form...');

  await page.locator('#submit').click();

  console.log('Waiting for dashboard...');

  await page.waitForURL(DASHBOARD_URL, {
    timeout: 15000
  });

  const currentUrl = page.url();

  if (currentUrl !== DASHBOARD_URL) {
    throw new Error(
      `Login did not reach dashboard. Current URL: ${currentUrl}`
    );
  }

  console.log('');
  console.log('=================================');
  console.log('LOGIN_SUCCESS');
  console.log('=================================');
  console.log(`Dashboard: ${currentUrl}`);
  console.log('');

} catch (error) {
  console.error('');
  console.error('=================================');
  console.error('LOGIN_FAILED');
  console.error('=================================');
  console.error(`Current URL: ${page.url()}`);
  console.error('');
  console.error(error);
  console.error('');

  throw error;

} finally {
  await browser.close();
}
