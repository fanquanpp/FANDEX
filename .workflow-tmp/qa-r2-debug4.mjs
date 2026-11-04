/* 定位到 "Next"/"图算法" 等模糊匹配外的真实对应元素，核实点击后的 URL */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

async function caseRun(name, url, buildSel, expectPath) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const loc = buildSel(page);
  const c = await loc.count();
  if (!c) { console.log(`${name}: locator empty`); return; }
  const info = await loc.first().evaluate(el => ({t:(el.textContent||'').trim().slice(0,28), h:el.getAttribute('href'), rect:(r=>({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}))(el.getBoundingClientRect())}));
  await loc.first().click({ timeout: 6000 }).catch(e => { console.log(`${name}: click err ${String(e).slice(0,90)}`); });
  await page.waitForTimeout(1100);
  const ok = page.url().includes(expectPath);
  console.log(`${name}: elem=${JSON.stringify(info)} expect~${expectPath} -> ${ok ? 'OK' : 'MISMATCH'} now=${page.url()}`);
}

// /javascript/ "Next"：找真正的 Next/pager 链接
await page.goto(BASE+'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(800);
const pager = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('a').forEach(a => {
    const t = (a.textContent||'').trim();
    const h = a.getAttribute('href') || '';
    if (/page\/2|下一页|Next|next/.test(t + ' ' + h + ' ' + (a.className||'') + ' ' + (a.getAttribute('aria-label')||''))) out.push({t:t.slice(0,26), h, cls:a.className.slice(0,40), aria:a.getAttribute('aria-label')||''});
  });
  return out;
});
console.log('/javascript/ pager candidates:', JSON.stringify(pager, null, 1));

// /javascript/page/2/ "JavaScript" 面包屑
await page.goto(BASE+'javascript/page/2/', { waitUntil: 'load' });
await page.waitForTimeout(800);
const bc = await page.evaluate(() => [...document.querySelectorAll('.breadcrumb a, nav[aria-label*=readcrumb] a')].map(a => ({t:(a.textContent||'').trim().slice(0,22), h:a.getAttribute('href')})));
console.log('page/2 breadcrumbs:', JSON.stringify(bc));
if (bc.length) {
  const jl = page.locator('.breadcrumb a').first();
  await jl.click({timeout:5000}).catch(e=>console.log('  err',String(e).slice(0,80)));
  await page.waitForTimeout(1000);
  console.log('page/2 breadcrumb[0] click ->', page.url());
}

// NetworkFlow 面包屑"算法与数据结构"
await caseRun('NetworkFlow breadcrumb 算法与数据结构', BASE+'algorithm/290-NetworkFlow/', p => p.locator('.breadcrumb a[href="/FANDEX/algorithm/"]'), '/FANDEX/algorithm');
// NetworkFlow sidebar 图算法
await caseRun('NetworkFlow sidebar 图算法', BASE+'algorithm/290-NetworkFlow/', p => p.locator('.fndx-sidebar__link', { hasText: '图算法' }), '/FANDEX/algorithm/110-GraphAlgorithms');
// lp Git chip（可能是 hover 或别的 chip；直接 href）
await caseRun('lp Git href link', BASE+'learning-path/', p => p.locator('a[href="/FANDEX/learning-path/git/"]').first(), '/FANDEX/learning-path/git');
// syntax JS quick chip
await caseRun('syntax JS quick chip', BASE+'syntax/', p => p.locator('.syntax-quick__chip[href="?lang=javascript"]'), '?lang=javascript');
await browser.close();
