/* 逐案核查 main 阶段的 medium/low findings：区分产品缺陷 vs 探针定位错位 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

async function probe(name, url, locSel, expectUrl) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const loc = page.locator(locSel).first();
  const cnt = await loc.count();
  if (cnt === 0) { console.log(`SKIP ${name}: no ${locSel}`); return; }
  const info = await loc.evaluate((el) => ({
    href: el.getAttribute('href'),
    text: (el.textContent||'').trim().slice(0,30),
    rect: (r => ({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}))(el.getBoundingClientRect()),
  }));
  await loc.click({ timeout: 6000 }).catch(async (e) => { console.log(`  click err ${name}: ${String(e).slice(0,80)}`); });
  await page.waitForTimeout(1200);
  console.log(`${name}: href=${info.href} rect=${JSON.stringify(info.rect)} -> now ${page.url()}`);
}

// 1. /javascript/ pager Next
await probe('pager Next', BASE+'javascript/', 'a[aria-label*="下一页"], a.doc-nav__next, .doc-nav a[href*="page/2"]', '/FANDEX/javascript/page/2/');
// 2. /javascript/page/2/ breadcrumb "JavaScript"
await page.goto(BASE+'javascript/page/2/', { waitUntil: 'load' });
await page.waitForTimeout(700);
const crumbs = await page.evaluate(() => [...document.querySelectorAll('nav[aria-label*=readcrumb] a, .breadcrumb a, nav a')].map(a => ({t:(a.textContent||'').trim().slice(0,20), h:a.getAttribute('href')})));
console.log('page/2 crumb-ish links:', JSON.stringify(crumbs.slice(0,10)));
await page.goto(BASE+'javascript/page/2/', { waitUntil: 'load' });
const jsLink = page.locator('a[href="/FANDEX/javascript/"]').first();
await jsLink.click({ timeout: 5000 }).catch(e=>console.log('  err', String(e).slice(0,80)));
await page.waitForTimeout(1000);
console.log('page/2 -> click "JavaScript" link ->', page.url());

// 3. NetworkFlow sidebar "算法与数据结构"
await page.goto(BASE+'algorithm/290-NetworkFlow/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const sbLinks = await page.evaluate(() => [...document.querySelectorAll('#app-sidebar a, .fndx-sidebar a, aside a')].map(a => ({t:(a.textContent||'').trim().slice(0,24), h:a.getAttribute('href')})).slice(0,20));
console.log('NetworkFlow sidebar links:', JSON.stringify(sbLinks.slice(0,12)));
const algLink = page.locator('#app-sidebar a[href="/FANDEX/algorithm/"], aside a[href="/FANDEX/algorithm/"]').first();
if (await algLink.count()) {
  await algLink.click({timeout:5000}).catch(e=>console.log('  err',String(e).slice(0,80)));
  await page.waitForTimeout(1200);
  console.log('NetworkFlow sidebar 算法与数据结构 ->', page.url());
}

// 4. learning-path Git chip
await page.goto(BASE+'learning-path/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const gitChip = page.locator('a[href*="learning-path/git"]').first();
const gitInfo = await gitChip.evaluate(el => ({t:(el.textContent||'').trim().slice(0,20), h:el.getAttribute('href')})).catch(()=>null);
console.log('lp Git chip:', JSON.stringify(gitInfo), 'count=', await gitChip.count());
if (await gitChip.count()) {
  await gitChip.click({timeout:5000}).catch(e=>console.log('  err',String(e).slice(0,80)));
  await page.waitForTimeout(1200);
  console.log('lp Git ->', page.url());
}

// 5. syntax JS chip
await page.goto(BASE+'syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const jsChip = page.locator('.syntax-chip, [data-lang-chip]').filter({hasText:'JavaScript'}).first();
console.log('syntax JS chip count=', await jsChip.count());
if (await jsChip.count()) {
  const ci = await jsChip.evaluate(el => ({tag: el.tagName, cls: el.className.toString().slice(0,40), txt:(el.textContent||'').trim().slice(0,20)}));
  console.log('chip info', JSON.stringify(ci));
}
await browser.close();
