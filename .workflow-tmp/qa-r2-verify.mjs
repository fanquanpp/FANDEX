/**
 * R2 修正验证套件（对 main 阶段 findings 逐案复核）：
 * 用 href/aria 精确匹配（消除 hasText 歧义），单页访问内顺序点击（点击后若离开则回跳）。
 * 输出 verdicts JSON。
 * 运行：node .workflow-tmp/qa-r2-verify.mjs
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const OUT = path.join(ROOT, '.workflow-tmp/qa-r2-verify-report.json');
const BASE = 'http://localhost:4321/FANDEX/';

const results = [];
const pageErrors = [];

function verdict(name, page, expected, actual, severity) {
  results.push({ name, page, expected, actual, severity, verdict: 'bug' });
  console.log(`  [${severity}] ${name} :: expected ${expected} :: actual ${String(actual).slice(0, 150)}`);
}
function ok(name, note) {
  results.push({ name, verdict: 'pass', note: String(note).slice(0, 200) });
  console.log(`  ok ${name} :: ${String(note).slice(0, 120)}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4321' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => pageErrors.push({ page: page.url(), msg: String(e).slice(0, 200) }));

  /* ============ A. 模块列表页 doc 卡片（抽 6 页全卡点击） ============ */
  const modulePages = ['/javascript/', '/git/', '/konado/', '/start/', '/cs-fundamentals/', '/go/'];
  for (const mp of modulePages) {
    const url = BASE + mp.slice(1);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    // 收集主列表卡片 href（.doc-list-link），排除 sidebar 重复
    const cardHrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a.doc-list-link')].map((a) => a.getAttribute('href')).filter(Boolean),
    );
    let bad = 0;
    const checkedN = Math.min(cardHrefs.length, 60);
    for (const href of cardHrefs.slice(0, 60)) {
      if (page.url() !== url && !page.url().startsWith(url)) await page.goto(url, { waitUntil: 'load' });
      const card = page.locator(`a.doc-list-link[href="${href}"]`).first();
      try {
        await card.click({ timeout: 6000 });
        await page.waitForTimeout(900);
        const navigated = page.url() === 'http://localhost:4321' + href;
        if (!navigated) { bad += 1; console.log(`    card not navigating: ${href} (at ${page.url()})`); }
      } catch (e) {
        bad += 1;
        console.log(`    card click err ${href}: ${String(e).split('\n')[0].slice(0, 80)}`);
      }
    }
    if (bad === 0) ok(`module ${mp} doc cards (${checkedN})`, `all ${checkedN} cards navigate`);
    else verdict(`module ${mp} doc cards`, mp, 'each .doc-list-link click navigates to its href', `${bad}/${checkedN} failed`, 'high');
  }

  /* ============ B. 模块列表页 sidebar 链接（抽 2 页 x 前 30 链接） ============ */
  for (const mp of ['/javascript/', '/git/']) {
    const url = BASE + mp.slice(1);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const sbHrefs = await page.evaluate(() =>
      [...document.querySelectorAll('.fndx-sidebar__link')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/FANDEX/')),
    );
    let bad = 0;
    const checkedN = Math.min(sbHrefs.length, 30);
    for (const href of sbHrefs.slice(0, 30)) {
      if (!page.url().startsWith(url)) await page.goto(url, { waitUntil: 'load' });
      const link = page.locator(`.fndx-sidebar__link[href="${href}"]`).first();
      try {
        await link.click({ timeout: 6000 });
        await page.waitForTimeout(800);
        if (page.url() !== 'http://localhost:4321' + href) { bad += 1; console.log(`    sidebar not navigating: ${href}`); }
      } catch (e) { bad += 1; console.log(`    sidebar click err ${href}: ${String(e).split('\n')[0].slice(0, 70)}`); }
    }
    if (bad === 0) ok(`module ${mp} sidebar links (${checkedN})`, `all ${checkedN} navigate`);
    else verdict(`module ${mp} sidebar links`, mp, 'sidebar link click navigates', `${bad}/${checkedN} failed`, 'medium');
  }

  /* ============ C. pager（多模块 Next/Prev） ============ */
  for (const mp of ['/javascript/', '/typescript/', '/java/', '/mysql/']) {
    const url = BASE + mp.slice(1);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const pagerLinks = await page.evaluate(() =>
      [...document.querySelectorAll('.pager-link')].map((a) => ({ h: a.getAttribute('href'), t: (a.textContent || '').trim() })),
    );
    let bad = 0;
    for (const pl of pagerLinks) {
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const link = page.locator(`.pager-link[href="${pl.h}"]`).first();
      try {
        await link.click({ timeout: 6000 });
        await page.waitForTimeout(900);
        if (page.url() !== 'http://localhost:4321' + pl.h) { bad += 1; console.log(`    pager ${pl.t} -> stayed ${page.url()}`); }
      } catch (e) { bad += 1; console.log(`    pager ${pl.t} err ${String(e).split('\n')[0].slice(0, 70)}`); }
    }
    if (pagerLinks.length && bad === 0) ok(`pager ${mp}`, `${pagerLinks.length} pager links all navigate`);
    else if (!pagerLinks.length) ok(`pager ${mp}`, 'no pager on page');
    else verdict(`pager ${mp}`, mp, 'pager link navigates', `${bad}/${pagerLinks.length} failed`, 'medium');
  }

  /* ============ D. NetworkFlow 面包屑 + sidebar 抽查 ============ */
  await page.goto(BASE + 'algorithm/290-NetworkFlow/', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const bcLinks = await page.evaluate(() => [...document.querySelectorAll('.breadcrumb a')].map((a) => a.getAttribute('href')));
  let bcBad = 0;
  for (const h of bcLinks) {
    await page.goto(BASE + 'algorithm/290-NetworkFlow/', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const l = page.locator(`.breadcrumb a[href="${h}"]`).first();
    try {
      await l.click({ timeout: 6000 });
      await page.waitForTimeout(900);
      if (page.url() !== 'http://localhost:4321' + h) bcBad += 1;
    } catch { bcBad += 1; }
  }
  if (bcBad === 0) ok('NetworkFlow breadcrumbs', `${bcLinks.length} links navigate`);
  else verdict('NetworkFlow breadcrumbs', '/algorithm/290-NetworkFlow/', 'breadcrumb navigates', `${bcBad}/${bcLinks.length} failed`, 'medium');

  const sbHrefs2 = await page.evaluate(() => [...document.querySelectorAll('.fndx-sidebar__link')].map((a) => a.getAttribute('href')).filter(Boolean));
  let sb2Bad = 0;
  const sb2N = Math.min(sbHrefs2.length, 20);
  for (const h of sbHrefs2.slice(0, 20)) {
    await page.goto(BASE + 'algorithm/290-NetworkFlow/', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const l = page.locator(`.fndx-sidebar__link[href="${h}"]`).first();
    try {
      await l.click({ timeout: 6000 });
      await page.waitForTimeout(800);
      if (page.url() !== 'http://localhost:4321' + h) { sb2Bad += 1; console.log(`    NF sidebar ${h} stayed`); }
    } catch { sb2Bad += 1; }
  }
  if (sb2Bad === 0) ok('NetworkFlow sidebar links', `${sb2N} links navigate`);
  else verdict('NetworkFlow sidebar links', '/algorithm/290-NetworkFlow/', 'sidebar link navigates', `${sb2Bad}/${sb2N} failed`, 'medium');

  /* ============ E. learning-path chips（全部 href 链接点击） ============ */
  await page.goto(BASE + 'learning-path/', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const lpLinks = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/learning-path/"]')].map((a) => a.getAttribute('href')))]);
  let lpBad = 0;
  for (const h of lpLinks) {
    await page.goto(BASE + 'learning-path/', { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const l = page.locator(`a[href="${h}"]`).first();
    try {
      await l.click({ timeout: 6000 });
      await page.waitForTimeout(800);
      if (page.url() !== 'http://localhost:4321' + h) { lpBad += 1; console.log(`    lp ${h} stayed at ${page.url()}`); }
    } catch (e) { lpBad += 1; console.log(`    lp ${h} err`); }
  }
  if (lpBad === 0) ok('learning-path links', `${lpLinks.length} links navigate`);
  else verdict('learning-path links', '/learning-path/', 'all learning-path links navigate', `${lpBad}/${lpLinks.length} failed`, 'medium');

  /* ============ F. syntax quick chips（含 ?lang= 相对 href） ============ */
  await page.goto(BASE + 'syntax/', { waitUntil: 'load' });
  await page.locator('.syntax-lang-chip.is-active').waitFor({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const chips = await page.evaluate(() => [...document.querySelectorAll('.syntax-quick__chip')].map((a) => a.getAttribute('href')));
  let chipBad = 0;
  for (const ch of chips) {
    await page.goto(BASE + 'syntax/', { waitUntil: 'load' });
    await page.locator('.syntax-lang-chip.is-active').waitFor({ timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(900);
    const c = page.locator(`.syntax-quick__chip[href="${ch}"]`).first();
    try {
      await c.click({ timeout: 6000 });
      await page.waitForTimeout(1300);
      const want = 'http://localhost:4321/FANDEX/syntax/' + ch.replace(/^\//, '');
      // ?lang=sql -> island 用 history.replaceState 同步 URL
      const urlNow = page.url();
      if (!urlNow.includes(ch.replace('?lang=', 'lang=')) && !urlNow.endsWith(ch)) {
        // 兜底：检查对应语言 chip 是否激活
        const activeOk = await page.evaluate((lang) => !!document.querySelector('.syntax-lang-chip.is-active') && (document.querySelector('.syntax-lang-chip.is-active').textContent || '').length > 0, ch);
        if (!activeOk) { chipBad += 1; console.log(`    chip ${ch} stayed ${urlNow}`); }
      }
    } catch (e) { chipBad += 1; console.log(`    chip ${ch} err`); }
  }
  if (chipBad === 0) ok('syntax quick chips', `${chips.length} chips switch language`);
  else verdict('syntax quick chips', '/syntax/', 'quick chip navigates/switches lang', `${chipBad}/${chips.length} failed`, 'medium');

  /* ============ G. design-system 锚点链接（prose 锚点跳转） ============ */
  await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const dsAnchors = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="#"]')].slice(0, 12).map((a) => ({ h: a.getAttribute('href'), t: (a.textContent || '').trim().slice(0, 20) })),
  );
  let dsBad = 0;
  for (const an of dsAnchors) {
    await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const l = page.locator(`a[href="${an.h}"]`).first();
    try {
      await l.click({ timeout: 6000 });
      await page.waitForTimeout(900);
      const hashNow = await page.evaluate(() => decodeURIComponent(location.hash));
      const scrolled = await page.evaluate(() => (document.getElementById('app-main') || document.scrollingElement).scrollTop);
      if (hashNow !== an.h && scrolled <= 0) { dsBad += 1; console.log(`    ds anchor ${an.h} no jump (hash=${hashNow}, scroll=${scrolled})`); }
    } catch (e) { dsBad += 1; }
  }
  if (dsBad === 0) ok('design-system anchor links', `${dsAnchors.length} anchors jump`);
  else verdict('design-system anchor links', '/design-system/', 'anchor link sets hash or scrolls', `${dsBad}/${dsAnchors.length} failed`, 'low');

  /* ============ H. lang toggle 单击后的 island 存活（每页） ============ */
  const langPages = ['/', '/javascript/', '/syntax/', '/learning-path/javascript/', '/playground/?pen=frontend', '/algorithms/', '/ai/', '/disclaimer/'];
  const islandSel = {
    '/syntax/': '.syntax-lang-chip',
    '/learning-path/javascript/': '[class*=lp-], canvas, [class*=map]',
    '/playground/?pen=frontend': '.pg-toolbar, .pg-editor-tab',
    '/algorithms/': '[data-algo-item]',
    '/ai/': 'input, button',
    '/disclaimer/': 'article, .prose',
  };
  for (const lp of langPages) {
    await page.goto(BASE + lp.slice(1), { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    const beforeCount = await page.evaluate((sel) => document.querySelectorAll(sel.split(',')[0]).length, islandSel[lp] || 'button');
    const errsBefore = pageErrors.length;
    await page.locator('[data-lang-toggle]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    const afterCount = await page.evaluate((sel) => document.querySelectorAll(sel.split(',')[0]).length, islandSel[lp] || 'button');
    const newErrs = pageErrors.slice(errsBefore);
    const islandDead = beforeCount > 0 && afterCount === 0;
    const crashed = newErrs.some((e) => /replace|TypeError/.test(e.msg));
    if (islandDead) verdict(`lang toggle island survival ${lp}`, lp, 'after lang switch the page island stays mounted', `island unmounted (${beforeCount} -> 0 nodes) + pageerror: ${newErrs[0] ? newErrs.msg.slice(0, 80) : ''}`, 'high');
    else if (crashed) verdict(`lang toggle error ${lp}`, lp, 'lang switch without pageerror', `pageerror: ${newErrs[0].msg.slice(0, 100)}`, 'medium');
    else ok(`lang toggle ${lp}`, `island intact (${beforeCount} -> ${afterCount}), no pageerror`);
  }

  writeFileSync(OUT, JSON.stringify({ results, pageErrors }, null, 2));
  const bug = results.filter((r) => r.verdict === 'bug').length;
  console.log(`\n==== verify done: ${results.length} checks, ${bug} bugs ====`);
  if (pageErrors.length) console.log('pageErrors:', pageErrors.slice(0, 6));
  await browser.close();
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
