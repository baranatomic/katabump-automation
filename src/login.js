import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const LOGIN_URL = 'https://dashboard.katabump.com/auth/login';
const DASHBOARD_URL = 'https://dashboard.katabump.com/dashboard';

const email = process.env.KATABUMP_EMAIL;
const password = process.env.KATABUMP_PASSWORD;

if (!email || !password) {
  throw new Error(
    'KATABUMP_EMAIL and KATABUMP_PASSWORD must be set'
  );
}

await fs.mkdir('artifacts', {
  recursive: true
});

const browser = await chromium.launch({
  headless: true
});

const context = await browser.newContext({
  viewport: {
    width: 1366,
    height: 768
  }
});

const page = await context.newPage();

async function saveDebugInfo() {
  console.log('');
  console.log('=================================');
  console.log('SAVING DEBUG INFORMATION');
  console.log('=================================');

  try {
    console.log(`URL: ${page.url()}`);

    const title = await page.title();
    console.log(`Title: ${title}`);

    await page.screenshot({
      path: 'artifacts/login-page.png',
      fullPage: true
    });

    console.log('Screenshot saved: artifacts/login-page.png');

    const html = await page.content();

    await fs.writeFile(
      'artifacts/login-page.html',
      html,
      'utf8'
    );

    console.log('HTML saved: artifacts/login-page.html');

    const bodyText = await page.locator('body').innerText({
      timeout: 5000
    }).catch(() => '');

    await fs.writeFile(
      'artifacts/login-page.txt',
      bodyText,
      'utf8'
    );

    console.log('Text saved: artifacts/login-page.txt');

  } catch (debugError) {
    console.error(
      'Could not save all debug information:',
      debugError
    );
  }
}

try {
  console.log('Opening KataBump login page...');

  await page.goto(LOGIN_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  console.log(`Current URL: ${page.url()}`);

  console.log(`Page title: ${await page.title()}`);

  console.log('Waiting for login form...');

  await page.locator('#login-form').waitFor({
    state: 'visible',
    timeout: 15000
  });

  console.log('Login form is visible.');

  console.log('Filling email...');

  await page.locator('#email').fill(email);

  console.log('Filling password...');

  await page.locator('#password').fill(password);

  console.log('Waiting for Cloudflare Turnstile...');

  const turnstile = page.locator(
    'input[name="cf-turnstile-response"]'
  );

  await turnstile.waitFor({
    state: 'attached',
    timeout: 15000
  });

  console.log('Turnstile element found.');

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

  await saveDebugInfo();

  throw error;

} finally {
  await browser.close();
}
