// S4 行为视检脚本：主题三态 / system 跟随 / 语言切换 / reduced-motion / web-vitals /
// fallback face 生效性 / 换页后接线。跑在 astro dev（http://localhost:3000，base /FANDEX/）。
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const SHOTS = resolve(ROOT, '.workflow-tmp', 'shots');
const BASE = 'http://localhost:3000/FANDEX/';

const { chromium } = await import(
  pathToFileURL(resolve(ROOT, 'app-web', 'node_modules', 'playwright', 'index.mjs')).href
);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' -- ' + detail : ''}`);
}

// 取一条真实文档路由（doc-index 裸数组：{slug, module, title, order}）
const docIndex = JSON.parse(await readFile(resolve(ROOT, 'app-web', 'src', 'data', 'doc-index.json'), 'utf-8'));
const doc0 = docIndex[0];
console.log(`doc probe route: /${doc0.module}/${doc0.slug}/`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const reactRequests = new Set();
page.on('request', (req) => {
  const url = req.url();
  if (/node_modules[\\/](\.vite[\\/].*)?react|react-dom|scheduler/.test(url)) {
    reactRequests.add(url);
  }
});

const consoleLines = [];
page.on('console', (msg) => consoleLines.push(msg.text()));

async function cleanStorageAndReload(attempt = 0) {
  try {
    await page.evaluate(async () => {
      try {
        const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
        for (const r of regs) await r.unregister();
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      } catch {}
    });
    await page.reload({ waitUntil: 'load' });
    // vite 首访重优化可能再次整页 reload，留缓冲
    await page.waitForTimeout(1200);
  } catch (e) {
    if (attempt < 2) {
      await page.waitForTimeout(2000);
      return cleanStorageAndReload(attempt + 1);
    }
    throw e;
  }
}

async function gotoAndSettle(url, attempt = 0) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 180000 });
    await page.waitForTimeout(2500);
    await page.waitForSelector('[data-theme-toggle]', { timeout: 30000 });
    await cleanStorageAndReload();
    await page.waitForFunction(
      () => {
        const b = document.querySelector('[data-theme-toggle]');
        return b && !b.hasAttribute('aria-hidden');
      },
      { timeout: 15000 },
    );
  } catch (e) {
    if (attempt < 2) {
      await page.waitForTimeout(2500);
      return gotoAndSettle(url, attempt + 1);
    }
    throw e;
  }
}

async function retryAsync(fn, label, attempt = 0) {
  try {
    return await fn();
  } catch (e) {
    if (attempt < 2) {
      await page.waitForTimeout(2000);
      return retryAsync(fn, label, attempt + 1);
    }
    throw new Error(`${label}: ${e.message}`);
  }
}

const probe = () =>
  page.evaluate(() => {
    const b = document.querySelector('[data-theme-toggle]');
    if (!b) return null;
    const icons = [...b.querySelectorAll('[data-theme-icon]')];
    const visible = icons.filter((i) => i.classList.contains('is-visible')).map((i) => i.getAttribute('data-theme-icon'));
    return {
      ready: b.classList.contains('fndx-theme-toggle--ready'),
      ariaHidden: b.hasAttribute('aria-hidden'),
      tabindex: b.getAttribute('tabindex'),
      visibleIcons: visible,
      tooltip: b.getAttribute('data-tooltip'),
      aria: b.getAttribute('aria-label'),
      dataTheme: document.documentElement.getAttribute('data-theme'),
      savedTheme: localStorage.getItem('fandex-theme'),
      lang: document.documentElement.getAttribute('data-lang'),
    };
  });

// ============ 首页 ============
await gotoAndSettle(BASE);

let p = await probe();
check(
  'home: 按钮就绪态（--ready / aria-hidden 移除 / tabindex 0）',
  p && p.ready && !p.ariaHidden && p.tabindex === '0',
  JSON.stringify(p),
);
check('home: 无偏好时 system 态（system 图标唯一可见，tooltip 指向 light）', !!p && p.visibleIcons.join(',') === 'system' && p.tooltip === '亮色模式', JSON.stringify(p));

// 三态循环 system -> light -> dark -> system
await page.click('[data-theme-toggle]');
p = await probe();
check(
  'click1 -> light：存储/数据主题/月亮图标/tooltip 指向 dark',
  !!p && p.savedTheme === 'light' && p.dataTheme === 'light' && p.visibleIcons.join(',') === 'moon' && p.tooltip === '暗色模式' && p.aria === '切换到暗色模式',
  JSON.stringify(p),
);
await page.click('[data-theme-toggle]');
p = await probe();
check(
  'click2 -> dark：存储/数据主题/太阳图标/tooltip 指向 system',
  !!p && p.savedTheme === 'dark' && p.dataTheme === 'dark' && p.visibleIcons.join(',') === 'sun' && p.tooltip === '跟随系统' && p.aria === '切换到跟随系统模式',
  JSON.stringify(p),
);
await page.screenshot({ path: resolve(SHOTS, 's4-header-dark.png'), clip: { x: 0, y: 0, width: 1440, height: 120 } });
await page.click('[data-theme-toggle]');
p = await probe();
check(
  'click3 -> system：存储 system/解析主题回 light/system 图标/tooltip 指向 light',
  !!p && p.savedTheme === 'system' && p.dataTheme === 'light' && p.visibleIcons.join(',') === 'system' && p.tooltip === '亮色模式',
  JSON.stringify(p),
);

// system 跟随（真实 matchMedia change：CDP 媒体仿真）
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(150);
p = await probe();
check('system 跟随 -> OS dark：data-theme=dark，存储仍 system，图标仍 system', !!p && p.dataTheme === 'dark' && p.savedTheme === 'system' && p.visibleIcons.join(',') === 'system', JSON.stringify(p));
await page.emulateMedia({ colorScheme: 'light' });
await page.waitForTimeout(150);
p = await probe();
check('system 跟随 -> OS light：data-theme=light', !!p && p.dataTheme === 'light', JSON.stringify(p));

// 明暗两套截图（亮色）
await page.screenshot({ path: resolve(SHOTS, 's4-header-light.png'), clip: { x: 0, y: 0, width: 1440, height: 120 } });

// 语言切换联动 tooltip/aria
await page.click('[data-lang-toggle]');
await page.waitForTimeout(150);
p = await probe();
check('lang->en：data-lang=en，system 态 tooltip=Light mode aria=Switch to light mode', !!p && p.lang === 'en' && p.tooltip === 'Light mode' && p.aria === 'Switch to light mode', JSON.stringify(p));
// 切到 dark 态再验英文键
await page.click('[data-theme-toggle]');
p = await probe();
check('lang=en + click -> light：tooltip=Dark mode', !!p && p.tooltip === 'Dark mode' && p.aria === 'Switch to dark mode', JSON.stringify(p));
await page.click('[data-lang-toggle]');
await page.waitForTimeout(150);
p = await probe();
check('lang->zh 回切：tooltip 回中文（暗色模式）', !!p && p.lang === 'zh' && p.tooltip === '暗色模式', JSON.stringify(p));
// 复位到 system
await page.click('[data-theme-toggle]');
await page.click('[data-theme-toggle]');

// fallback face 生效性：dev 站点上 'Inter' 应回退面按 Plex 度量渲染
const fontProbe = await page.evaluate(async () => {
  await document.fonts.ready;
  const hasFallbackFace = [...document.fonts].some((f) => f.family.replace(/['"]/g, '') === 'Inter');
  const span = (family, weight) => {
    const el = document.createElement('span');
    el.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;font-family:${family};font-weight:${weight}`;
    el.textContent = 'The quick brown fox jumps over the lazy dog 0123456789';
    document.body.appendChild(el);
    const w = el.getBoundingClientRect().width;
    el.remove();
    return w;
  };
  const interW = span('Inter', 400);
  const plexW = span("'IBM Plex Sans'", 400);
  return { hasFallbackFace, interW, plexW };
});
check(
  'fallback face：@font-face Inter 已注册且 400 宽度与 Plex 实测一致（<2%）',
  fontProbe.hasFallbackFace && Math.abs(fontProbe.interW - fontProbe.plexW) / fontProbe.plexW < 0.02,
  JSON.stringify(fontProbe),
);

// ============ 文档页（ClientRouter 换页后接线）============
await gotoAndSettle(`${BASE}${doc0.module}/${doc0.slug}/`);
await page.click('[data-theme-toggle]');
p = await probe();
check(
  'doc 页：按钮接线正常，click -> light',
  !!p && p.savedTheme === 'light' && p.dataTheme === 'light' && p.visibleIcons.join(',') === 'moon',
  JSON.stringify(p),
);

// 文档页 -> 首页（ClientRouter swap），按钮需重新接线且可继续循环
await retryAsync(async () => {
  await page.click('a.nav-logo');
  await page.waitForFunction(() => location.pathname === '/FANDEX/' || location.pathname === '/FANDEX', { timeout: 30000 });
  await page.waitForSelector('[data-theme-toggle]', { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const b = document.querySelector('[data-theme-toggle]');
      return b && !b.hasAttribute('aria-hidden');
    },
    { timeout: 15000 },
  );
}, 'swap-nav');
await page.click('[data-theme-toggle]');
p = await probe();
check(
  'ClientRouter swap 后：按钮重新接线，click -> dark（自 light 循环）',
  !!p && p.savedTheme === 'dark' && p.dataTheme === 'dark' && p.visibleIcons.join(',') === 'sun',
  JSON.stringify(p),
);
// 复位
await page.click('[data-theme-toggle]');
await page.click('[data-theme-toggle]');

// ============ reduced-motion：无中间态 ============
await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
await cleanStorageAndReload();
await page.waitForFunction(
  () => {
    const b = document.querySelector('[data-theme-toggle]');
    return b && !b.hasAttribute('aria-hidden');
  },
  { timeout: 15000 },
);
const rmProbe = await page.evaluate(() => {
  const icon = document.querySelector('[data-theme-icon]');
  const dur = icon ? getComputedStyle(icon).transitionDuration : 'unknown';
  const btn = document.querySelector('[data-theme-toggle]');
  const bDur = btn ? getComputedStyle(btn).transitionDuration : 'unknown';
  return { iconTransition: dur, btnTransition: bDur };
});
const isNearZero = (v) => parseFloat(v) < 0.001; // 0.01ms 会以 1e-05s 科学计数法返回
check('reduced-motion：图标/按钮 transition-duration 被全局兜底归零', isNearZero(rmProbe.iconTransition) && isNearZero(rmProbe.btnTransition), JSON.stringify(rmProbe));

for (let i = 0; i < 3; i++) {
  await page.click('[data-theme-toggle]');
  const rp = await probe();
  const oneIcon = !!rp && rp.visibleIcons.length === 1;
  const themeMatch = !!rp && (rp.savedTheme === 'system' ? rp.visibleIcons[0] === 'system' : rp.dataTheme === rp.savedTheme);
  check(`reduced-motion click${i + 1}：有且仅一个图标可见且主题态一致（无中间态）`, oneIcon && themeMatch, JSON.stringify(rp));
}

// ============ web-vitals ============
const consoleVitals = consoleLines.filter((l) => l.includes('[WebVitals]'));
check('web-vitals：DEV console 出现 [WebVitals] 诊断输出', consoleVitals.length > 0, `count=${consoleVitals.length}, first=${consoleVitals[0] ?? 'none'}`);
const vitalsProbe = await page.evaluate(() => {
  const raw = localStorage.getItem('fandex-web-vitals');
  let records = [];
  try {
    records = JSON.parse(raw ?? '[]');
  } catch {}
  let exported = [];
  try {
    exported = JSON.parse(window.__fandexExportVitals?.() ?? '[]');
  } catch {}
  return { recordCount: records.length, exportCount: exported.length, names: records.map((r) => r.name) };
});
check(
  'web-vitals：localStorage 记录与 __fandexExportVitals 导出均有指标',
  vitalsProbe.recordCount > 0 && vitalsProbe.exportCount > 0,
  JSON.stringify(vitalsProbe),
);

// ============ react 模块请求监测（dev 域内）============
const reactOnProbedPages = [...reactRequests].filter((u) => u.includes('localhost:3000'));
check('home/doc 页 dev 网络零 react/react-dom/scheduler 模块请求', reactOnProbedPages.length === 0, [...reactOnProbedPages].slice(0, 5).join(' | ') || 'none');

const failed = results.filter((r) => !r.ok);
console.log(`\n=== 结果：${results.length - failed.length}/${results.length} 通过 ===`);
if (failed.length > 0) {
  console.log('FAILED:', failed.map((f) => f.name).join(' ; '));
}

await browser.close();
process.exit(failed.length > 0 ? 1 : 0);
