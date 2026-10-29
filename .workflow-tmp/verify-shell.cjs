/* shell 域视检脚本（约束 4 协议）：明暗两套 + 三态主题 + z 探针 + 截图留档
   运行：cwd = app-web（脚本从 app-web/node_modules 解析 playwright） */
const path = require('node:path');
const { chromium } = require(path.join(process.cwd(), 'node_modules', 'playwright'));
const fs = require('node:fs');

const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const BASE = 'http://localhost:4321/FANDEX/';
const PAGES = [
  { name: 'home', url: BASE, headerSel: '.home-nav' },
  { name: 'doc', url: BASE + 'algorithm/290-NetworkFlow/', headerSel: '.app-nav' },
];

async function purgeSw(page) {
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    for (const r of regs) await r.unregister();
    const keys = await caches.keys();
    for (const k of keys) await caches.delete(k);
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);
}

(async () => {
  const userDataDir = path.join(SHOTS, 'pw-profile');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok, detail: String(detail) });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} :: ${detail}`);
  };

  for (const target of PAGES) {
    await page.goto(target.url, { waitUntil: 'load' });
    await purgeSw(page);

    // 探针 1：唯一背景层 fx-backdrop z-index 必须 -1
    const fx = await page.evaluate(() => {
      const el = document.querySelector('.fx-backdrop');
      if (!el) return { exists: false };
      const cs = getComputedStyle(el);
      return { exists: true, z: cs.zIndex, pos: cs.position, count: document.querySelectorAll('.fx-backdrop').length };
    });
    check(`${target.name}: fx-backdrop 唯一且 z=-1`, fx.exists && fx.z === '-1' && fx.count === 1, JSON.stringify(fx));

    // 探针 2：统一顶栏（data-site-header）+ 关键按钮标记
    const header = await page.evaluate((sel) => {
      const h = document.querySelector(sel);
      if (!h) return { exists: false };
      return {
        exists: true,
        variant: h.dataset.siteHeader,
        z: getComputedStyle(h).zIndex,
        pos: getComputedStyle(h).position,
        search: !!h.querySelector('[data-search-trigger]'),
        install: !!h.querySelector('[data-install-app][hidden]'),
        lang: !!h.querySelector('[data-lang-toggle]'),
        theme: !!h.querySelector('.fndx-theme-toggle'),
      };
    }, target.headerSel);
    check(
      `${target.name}: 顶栏统一标记`,
      header.exists && !!header.variant && header.search && header.install && header.lang && header.theme,
      JSON.stringify(header),
    );

    // 探针 3：变体专属按钮
    const variantBtns = await page.evaluate(() => ({
      top: !!document.getElementById('nav-back-to-top'),
      github: !!document.querySelector('.nav-github-link'),
      homeFs: !!document.getElementById('home-fullscreen-btn'),
    }));
    if (target.name === 'doc') {
      check('doc: Top 按钮在 / github+全屏不在', variantBtns.top && !variantBtns.github && !variantBtns.homeFs, JSON.stringify(variantBtns));
    } else {
      check('home: github+全屏在 / Top 不在', variantBtns.github && variantBtns.homeFs && !variantBtns.top, JSON.stringify(variantBtns));
    }

    // 探针 4：性能悬浮窗（dev 专属，仅 doc 壳挂载）z 应为 1000
    if (target.name === 'doc') {
      const perfZ = await page.evaluate(() => {
        const el = document.getElementById('fandex-perf-monitor');
        return el ? getComputedStyle(el).zIndex : 'absent';
      });
      check(`doc: perf-monitor z=1000`, perfZ === '1000', perfZ);
    }

    // 明暗两套截图
    await page.evaluate(() => localStorage.setItem('fandex-theme', 'light'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    const lightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check(`${target.name}: light 存储生效`, lightTheme === 'light', lightTheme);
    await page.screenshot({ path: path.join(SHOTS, `shell-${target.name}-light-1280.png`) });

    await page.evaluate(() => localStorage.setItem('fandex-theme', 'dark'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    const darkTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check(`${target.name}: dark 存储生效`, darkTheme === 'dark', darkTheme);
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.screenshot({ path: path.join(SHOTS, `shell-${target.name}-dark-1280.png`) });

    // 三态循环：dark -> click -> system -> click -> light -> click -> dark
    // system 解析值取决于本机 OS 偏好（dev 机为 light 时 applied=light）
    const cycle = [];
    await page.waitForSelector('.fndx-theme-toggle.fndx-theme-toggle--ready', { timeout: 5000 });
    const osDark = await page.evaluate(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
    const systemResolved = osDark ? 'dark' : 'light';
    for (let i = 0; i < 3; i++) {
      await page.click('.fndx-theme-toggle');
      await page.waitForTimeout(250);
      cycle.push(
        await page.evaluate(() => ({
          pref: localStorage.getItem('fandex-theme'),
          applied: document.documentElement.getAttribute('data-theme'),
        })),
      );
    }
    // 初始 dark：三次点击应得 system(按 OS 解析) -> light -> dark
    check(
      `${target.name}: 三态循环 dark->system->light->dark`,
      cycle[0].pref === 'system' && cycle[0].applied === systemResolved &&
      cycle[1].pref === 'light' && cycle[1].applied === 'light' &&
      cycle[2].pref === 'dark' && cycle[2].applied === 'dark',
      JSON.stringify({ cycle, systemResolved }),
    );

    // system 态跟随 OS：emulateMedia 翻转 prefers-color-scheme（真实 change 事件）
    await page.evaluate(() => localStorage.setItem('fandex-theme', 'system'));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const follow = { before, after };
    check(
      `${target.name}: system 态跟随 OS 偏好翻转`,
      follow.before !== follow.after,
      JSON.stringify(follow),
    );

    // 移动端 375px：doc 壳底栏 z=40；home 壳按设计无底栏；两壳均无横向滚动
    await page.setViewportSize({ width: 375, height: 834 });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const mobile = await page.evaluate(() => {
      const nav = document.querySelector('.mobile-nav');
      return {
        navZ: nav ? getComputedStyle(nav).zIndex : 'absent',
        navDisplay: nav ? getComputedStyle(nav).display : 'absent',
        hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    if (target.name === 'doc') {
      check(
        `doc: 移动底栏 z=40 显示且无横向滚动`,
        mobile.navZ === '40' && mobile.navDisplay === 'flex' && !mobile.hScroll,
        JSON.stringify(mobile),
      );
    } else {
      check(
        `home: 设计无底栏且无横向滚动`,
        mobile.navZ === 'absent' && !mobile.hScroll,
        JSON.stringify(mobile),
      );
    }
    await page.screenshot({ path: path.join(SHOTS, `shell-${target.name}-dark-375.png`) });

    // 恰 768px：顶栏在；底栏仅 doc 壳且应隐藏（规范档 768 归桌面）
    await page.setViewportSize({ width: 768, height: 900 });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const at768 = await page.evaluate(() => {
      const nav = document.querySelector('.mobile-nav');
      return {
        navDisplay: nav ? getComputedStyle(nav).display : 'absent',
        headerVisible: !!document.querySelector('[data-site-header]'),
        hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    const expect768Nav = target.name === 'doc' ? 'none' : 'absent';
    check(
      `${target.name}: 恰 768 底栏=${expect768Nav} 无横向滚动`,
      at768.navDisplay === expect768Nav && at768.headerVisible && !at768.hScroll,
      JSON.stringify(at768),
    );
    await page.setViewportSize({ width: 1280, height: 800 });
  }

  await page.close();
  await ctx.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\nTOTAL ${results.length} / FAILED ${failed.length}`);
  process.exit(failed.length > 0 ? 1 : 0);
})().catch((err) => {
  console.error('SCRIPT_ERROR', err);
  process.exit(2);
});
