/* 终版导航验证：正确的 URL 相等判断 + CDP 真实点击（等效真实用户）。
   覆盖：4 个模块页卡片(每页前 12) + sidebar(前 10) + pager 全部 + NF 面包屑/sidebar
   + lp 链接 + syntax chips + ds 锚点 + 404 返回。 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const results = [];
function rec(name, pass, note) { results.push({ name, pass, note: String(note).slice(0, 180) }); console.log((pass ? 'ok  ' : 'BUG ') + name + ' :: ' + String(note).slice(0, 130)); }

async function navBack(page, listUrl, probeSel) {
  await page.goto(listUrl, { waitUntil: 'load' });
  for (let i = 0; i < 6; i++) {
    if (page.url() === listUrl && (await page.locator(probeSel).count()) > 0) break;
    await page.waitForTimeout(400);
    if (page.url() !== listUrl) await page.goto(listUrl, { waitUntil: 'load' });
  }
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  page.setDefaultTimeout(8000);

  async function cdpClickAt(pos) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pos.x, y: pos.y });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  }
  async function clickEl(page, sel, wantUrl, { backTo = null, probe = 'a' } = {}) {
    // 定位中心坐标
    const pos = await page.evaluate((s) => {
      const a = document.querySelector(s);
      if (!a) return null;
      const r = a.getBoundingClientRect();
      if (r.width === 0) return null;
      if (r.y < 60 || r.y > 860) window.scrollTo(0, window.scrollY + r.y - 320);
      const r2 = a.getBoundingClientRect();
      return { x: Math.round(r2.x + r2.width/2), y: Math.round(r2.y + r2.height/2) };
    }, sel);
    if (!pos) return { pass: false, note: 'element not found: ' + sel };
    await cdpClickAt(pos);
    const target = wantUrl ? 'http://localhost:4321' + wantUrl : null;
    if (target) await page.waitForURL(target, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(400);
    const pass = !target || page.url() === target;
    if (backTo) await navBack(page, backTo, probe);
    return { pass, note: pass ? 'navigated' : 'stayed at ' + page.url() };
  }

  /* 模块列表卡片 */
  for (const mp of ['/javascript/', '/git/', '/konado/', '/start/', '/go/', '/cs-fundamentals/']) {
    const listUrl = BASE + mp.slice(1);
    await navBack(page, listUrl, 'a.doc-list-link');
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a.doc-list-link')].map(a => a.getAttribute('href')).slice(0, 12));
    let bad = 0;
    for (const h of hrefs) {
      const r = await clickEl(page, `a.doc-list-link[href="${h}"]`, h, { backTo: listUrl, probe: 'a.doc-list-link' });
      if (!r.pass) { bad++; console.log('   ', h, r.note); }
    }
    rec(`cards ${mp} (${hrefs.length})`, bad === 0, bad ? `${bad}/${hrefs.length} failed` : `all ${hrefs.length} navigate`);
  }

  /* sidebar 链接 */
  for (const mp of ['/javascript/', '/algorithm/290-NetworkFlow/']) {
    const listUrl = BASE + mp.slice(1);
    await navBack(page, listUrl, '.fndx-sidebar__link');
    const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('.fndx-sidebar__link')].map(a => a.getAttribute('href')))].filter(h => h && h.startsWith('/FANDEX/')).slice(0, 10));
    let bad = 0;
    for (const h of hrefs) {
      const r = await clickEl(page, `.fndx-sidebar__link[href="${h}"]`, h, { backTo: listUrl, probe: '.fndx-sidebar__link' });
      if (!r.pass) { bad++; console.log('   ', h, r.note); }
    }
    rec(`sidebar ${mp} (${hrefs.length})`, bad === 0, bad ? `${bad}/${hrefs.length} failed` : `all ${hrefs.length} navigate`);
  }

  /* pager（列表页全部 pager 链接） */
  for (const mp of ['/javascript/', '/typescript/']) {
    const listUrl = BASE + mp.slice(1);
    await navBack(page, listUrl, '.pager-link');
    const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('.pager-link')].map(a => a.getAttribute('href')))]);
    let bad = 0;
    for (const h of hrefs) {
      const r = await clickEl(page, `.pager-link[href="${h}"]`, h, { backTo: listUrl, probe: '.pager-link' });
      if (!r.pass) { bad++; console.log('   ', h, r.note); }
    }
    rec(`pager ${mp} (${hrefs.length})`, bad === 0, bad ? `${bad} failed` : 'all navigate');
  }

  /* lp 链接 */
  const lpUrl = BASE + 'learning-path/';
  await navBack(page, lpUrl, 'a[href*="/learning-path/"]');
  const lpHrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/FANDEX/learning-path/"]')].map(a => a.getAttribute('href')))].slice(0, 24));
  let lpBad = 0;
  for (const h of lpHrefs) {
    const r = await clickEl(page, `a[href="${h}"]`, h, { backTo: lpUrl, probe: 'a[href*="/learning-path/"]' });
    if (!r.pass) { lpBad++; console.log('   ', h, r.note); }
  }
  rec(`learning-path links (${lpHrefs.length})`, lpBad === 0, lpBad ? `${lpBad} failed` : 'all navigate');

  /* syntax quick chips */
  const syUrl = BASE + 'syntax/';
  await page.goto(syUrl, { waitUntil: 'load' });
  await page.locator('.syntax-lang-chip.is-active').waitFor({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);
  const chipHrefs = await page.evaluate(() => [...document.querySelectorAll('.syntax-quick__chip')].map(a => a.getAttribute('href')));
  let cBad = 0;
  for (const ch of chipHrefs) {
    await page.goto(syUrl, { waitUntil: 'load' });
    await page.locator('.syntax-lang-chip.is-active').waitFor({ timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(700);
    const r = await clickEl(page, `.syntax-quick__chip[href="${ch}"]`, null);
    const urlOk = page.url().includes('lang=') || page.url().endsWith(ch);
    const langOk = await page.evaluate(() => {
      const meta = document.querySelector('.syntax-meta');
      return !!meta && (meta.textContent || '').length > 3;
    });
    if (!r.pass || (!urlOk && !langOk)) { cBad++; console.log('   ', ch, r.note, 'url=', page.url()); }
  }
  rec(`syntax quick chips (${chipHrefs.length})`, cBad === 0, cBad ? `${cBad} failed` : 'all switch language');

  /* ds 锚点 */
  const dsUrl = BASE + 'design-system/';
  await navBack(page, dsUrl, 'a[href^="#"]');
  const dsAnchors = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')))].slice(0, 8));
  let dsBad = 0;
  for (const an of dsAnchors) {
    await page.goto(dsUrl, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const r = await clickEl(page, `a[href="${an}"]`, null);
    const hash = await page.evaluate(() => decodeURIComponent(location.hash));
    if (hash !== an) { dsBad++; console.log('   ', an, 'hash=', hash); }
  }
  rec(`ds anchors (${dsAnchors.length})`, dsBad === 0, dsBad ? `${dsBad} failed` : 'all set hash');

  /* 404 back-home */
  await page.goto(BASE + '404/', { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(500);
  const r404 = await clickEl(page, 'a[href="/FANDEX/"]', '/FANDEX/');
  rec('404 back-home', r404.pass, r404.note);

  writeFileSync('C:/Atian/Project/FANDEX/.workflow-tmp/qa-r2-final-verify.json', JSON.stringify(results, null, 2));
  console.log('\n==== final verify: ' + results.filter(r=>r.pass).length + ' pass / ' + results.length + ' ====');
  await browser.close();
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
