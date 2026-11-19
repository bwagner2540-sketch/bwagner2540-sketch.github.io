import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.SITE_URL || 'http://127.0.0.1:8741';
const routes = [
  ['/', 'Custom Home Automation'],
  ['/celebrity/', 'url=./pradera/'],
  ['/celebrity/pradera/', 'Home Technology Selections'],
];
for (const [path, marker] of routes) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.ok((await response.text()).includes(marker), `${path}: incorrect content`);
}
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL });
try {
  const page = await browser.newPage();
  const failures = [];
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/celebrity/pradera/') && response.status() >= 400)
      failures.push(`${response.status()} ${url.pathname}`);
  });
  for (const path of ['/celebrity', '/celebrity/']) {
    await page.goto(new URL(path, base).href, { waitUntil: 'networkidle' });
    await page.waitForURL('**/celebrity/pradera/');
    await page.locator('#audio-design-notes').waitFor();
    assert.match(await page.title(), /Home Technology Selections/);
  }
  await page.goto(new URL('/celebrity/?client=Route%20QA#selections', base).href, { waitUntil: 'networkidle' });
  assert.equal(new URL(page.url()).pathname, '/celebrity/pradera/');
  assert.equal(new URL(page.url()).searchParams.get('client'), 'Route QA');
  assert.equal(new URL(page.url()).hash, '#selections');
  assert.deepEqual(failures, [], 'Presentation assets must load');
  console.log(`ROUTES_SMOKE passed: ${base} (homepage, both Celebrity links, Pradera, assets, query/hash)`);
} finally {
  await browser.close();
}
