// playground 域视检脚本（ constraints §4 协议：SW 清除 + 明暗两套 + 恰 768px ）
import { chromium } from 'file:///C:/Atian/Project/FANDEX/app-web/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const BASE = 'http://localhost:4321/FANDEX';
const OUT = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/playground';
fs.mkdirSync(OUT, { recursive: true });

const report = { probes: [], consoleErrors: [], pageErrors: [] };
const probe = (name, value) => report.probes.push({ name, value });

async function clearSW(page) {
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  });
  await page.reload({ waitUntil: 'networkidle' });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => report.pageErrors.push(String(e).slice(0, 200)));

// ---- 桌面 1440 亮色 ----
await page.goto(`${BASE}/playground/`, { waitUntil: 'networkidle' });
await page.waitForSelector('.pg-toolbar .fndx-button', { timeout: 30000 });
await clearSW(page);
await page.waitForTimeout(600);

probe('url', page.url());
probe('fxBackdropZ', await page.evaluate(() => {
  const el = document.querySelector('.fx-backdrop');
  return el ? getComputedStyle(el).zIndex : 'missing';
}));
probe('toolbarButtonCount', await page.locator('.pg-toolbar .fndx-button').count());
probe('toolbarButtonHeight', await page.evaluate(() => {
  const el = document.querySelector('.pg-toolbar .fndx-button');
  return el ? getComputedStyle(el).height : 'missing';
}));
probe('editorTabCount', await page.locator('.pg-editor-tab').count());
probe('editorTabHeight', await page.evaluate(() => {
  const el = document.querySelector('.pg-editor-tab');
  return el ? getComputedStyle(el).height : 'missing';
}));
probe('iconBtnCount', await page.locator('.pg-frontend .fndx-icon-btn').count());
probe('titleInputHeight', await page.evaluate(() => {
  const el = document.querySelector('.pg-title-input');
  return el ? getComputedStyle(el).height : 'missing';
}));
probe('paneHeadHeight', await page.evaluate(() => {
  const el = document.querySelector('.pg-pane-head');
  return el ? getComputedStyle(el).height : 'missing';
}));
probe('toolbarTooltips', await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.pg-toolbar .fndx-button')];
  return `${btns.filter((b) => b.getAttribute('title')).length}/${btns.length} have title`;
}));
probe('pgBtnResidue', await page.evaluate(() => document.querySelectorAll('[class*="pg-btn"]').length));

await page.screenshot({ path: `${OUT}/desktop-light-toolbar.png`, clip: { x: 0, y: 0, width: 1440, height: 260 } });
await page.screenshot({ path: `${OUT}/desktop-light-full.png` });

// ---- 作品库抽屉 z 探针 ----
await page.getByTitle(/作品库|本地作品/).first().click();
await page.waitForSelector('.pg-drawer-mask', { timeout: 5000 });
probe('drawerMaskZ', await page.evaluate(() => getComputedStyle(document.querySelector('.pg-drawer-mask')).zIndex));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/desktop-light-drawer.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// ---- 图鉴 lightbox z 探针 ----
await page.getByTitle(/图鉴|灵感/).first().click();
await page.waitForSelector('.pg-sc-mask', { timeout: 5000 });
probe('scMaskZ', await page.evaluate(() => getComputedStyle(document.querySelector('.pg-sc-mask')).zIndex));
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/desktop-light-gallery.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// ---- 上手指南（pg-keys-mask 60 局部带） ----
await page.keyboard.press('?');
await page.waitForSelector('.pg-keys-mask', { timeout: 5000 });
probe('guideMaskZ', await page.evaluate(() => getComputedStyle(document.querySelector('.pg-keys-mask')).zIndex));
await page.screenshot({ path: `${OUT}/desktop-light-guide.png` });
await page.keyboard.press('Escape');

// ---- 桌面 1440 暗色 ----
await page.evaluate(() => localStorage.setItem('fandex-theme', 'dark'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.pg-toolbar .fndx-button', { timeout: 30000 });
await page.waitForTimeout(600);
probe('darkThemeAttr', await page.evaluate(() => document.documentElement.getAttribute('data-theme')));
await page.screenshot({ path: `${OUT}/desktop-dark-toolbar.png`, clip: { x: 0, y: 0, width: 1440, height: 260 } });
await page.screenshot({ path: `${OUT}/desktop-dark-full.png` });
await page.evaluate(() => localStorage.removeItem('fandex-theme'));

// ---- 恰 768px（明暗） ----
const page768 = await browser.newPage({ viewport: { width: 768, height: 1024 } });
page768.on('pageerror', (e) => report.pageErrors.push('768: ' + String(e).slice(0, 200)));
await page768.goto(`${BASE}/playground/`, { waitUntil: 'networkidle' });
await page768.waitForSelector('.pg-toolbar .fndx-button', { timeout: 30000 });
await clearSW(page768);
await page768.waitForTimeout(600);
probe('768 horizontalOverflow', await page768.evaluate(() => document.documentElement.scrollWidth > 768));
probe('768 paneVisibleCount', await page768.evaluate(() =>
  [...document.querySelectorAll('.pg-editors .pg-pane')].filter((p) => getComputedStyle(p).display !== 'none').length));
probe('768 paneSplitterDisplay', await page768.evaluate(() => {
  const el = document.querySelector('.pg-pane-splitter');
  return el ? getComputedStyle(el).display : 'none-in-dom';
}));
await page768.screenshot({ path: `${OUT}/768-light-full.png` });
await page768.evaluate(() => localStorage.setItem('fandex-theme', 'dark'));
await page768.reload({ waitUntil: 'networkidle' });
await page768.waitForSelector('.pg-toolbar .fndx-button', { timeout: 30000 });
await page768.waitForTimeout(500);
await page768.screenshot({ path: `${OUT}/768-dark-full.png` });

// ---- 375px 窄屏工具栏图标态 ----
await page768.setViewportSize({ width: 375, height: 800 });
await page768.waitForTimeout(500);
probe('375 labelsHidden', await page768.evaluate(() => {
  const span = document.querySelector('.pg-toolbar .fndx-button span');
  return span ? getComputedStyle(span).display : 'no-span';
}));
probe('375 horizontalOverflow', await page768.evaluate(() => document.documentElement.scrollWidth > 375));
await page768.screenshot({ path: `${OUT}/375-dark-toolbar.png`, clip: { x: 0, y: 0, width: 375, height: 320 } });

// ---- editor.astro 重定向桩 ----
const pageEd = await browser.newPage({ viewport: { width: 800, height: 600 } });
await pageEd.goto(`${BASE}/playground/editor/`, { waitUntil: 'domcontentloaded' });
probe('editorMetaRefresh', await pageEd.evaluate(() => document.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content') ?? 'missing'));
try {
  await pageEd.waitForURL('**/playground/', { timeout: 8000 });
  probe('editorRedirectLanded', pageEd.url());
} catch {
  probe('editorRedirectLanded', `timeout, still at ${pageEd.url()}`);
}

await browser.close();
fs.writeFileSync('C:/Atian/Project/FANDEX/.workflow-tmp/pg-visual-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
