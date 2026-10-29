/* 首页与工作台门面 视检脚本（运行约束 4 协议） */
const { createRequire } = require('module');
const req = createRequire('C:/Atian/Project/FANDEX/app-web/package.json');
const { chromium } = req('playwright');
const fs = require('fs');

const BASE = 'http://localhost:4321/FANDEX/';
const OUT = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/home';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const report = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  const fresh = async (url) => {
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(async () => {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      for (const k of await caches.keys()) await caches.delete(k);
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(600);
  };

  // ============ 首页 亮色 ============
  await page.goto(BASE);
  await page.evaluate(() => localStorage.setItem('fandex-theme', 'light'));
  await fresh(BASE);

  report('theme=light', await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light');

  const fx = await page.evaluate(() => {
    const el = document.querySelector('.fx-backdrop, [class*="fx-backdrop"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { pos: cs.position, z: cs.zIndex };
  });
  report('fx-backdrop fixed + z=-1', !!fx && fx.pos === 'fixed' && fx.z === '-1', JSON.stringify(fx));

  const cta = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.entry-btn--cta')];
    if (els.length !== 1) return { count: els.length };
    const btn = els[0];
    const name = btn.querySelector('.entry-name');
    const arrow = btn.querySelector('.entry-cta-arrow');
    const tick = btn.querySelector('.entry-cta-tick');
    const cs = getComputedStyle(btn);
    return {
      count: 1,
      label: name ? name.textContent.trim() : null,
      arrow: arrow ? arrow.textContent.trim() : null,
      hasTick: !!tick,
      radius: cs.borderRadius,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle,
      waveHidden: getComputedStyle(btn.querySelector('.entry-border')).display === 'none',
    };
  });
  report('CTA 唯一且结构齐', cta.count === 1 && cta.label === '学习路线' && cta.arrow === '→' && cta.hasTick, JSON.stringify(cta));
  report('CTA radius=--radius-control + 1px 边框', cta.radius !== '0px' && cta.border.startsWith('1px'), `radius=${cta.radius} border=${cta.border}`);

  const scroll0 = await page.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    return s ? s.scrollLeft : -1;
  });
  await page.waitForTimeout(3800); // 越过 2600ms 启动延迟
  const scroll1 = await page.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    return s ? s.scrollLeft : -1;
  });
  report('常滚动在跑（scrollLeft 递增）', scroll1 > scroll0, `${scroll0} -> ${scroll1}`);

  const scrollerCss = await page.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    if (!s) return null;
    const cs = getComputedStyle(s);
    const card = s.querySelector('.feature-track .module-card');
    return {
      overflowX: cs.overflowX,
      snapType: cs.scrollSnapType,
      align: card ? getComputedStyle(card).scrollSnapAlign : null,
      scrollable: s.scrollWidth > s.clientWidth,
      scrollbarWidth: cs.scrollbarWidth,
      maskImage: cs.maskImage !== 'none' ? cs.maskImage.slice(0, 40) : 'none',
    };
  });
  report('横滑器 overflow-x:auto + snap proximity', !!scrollerCss && scrollerCss.overflowX === 'auto' && scrollerCss.snapType.includes('proximity'), JSON.stringify(scrollerCss));
  report('卡片 scroll-snap-align:start', !!scrollerCss && scrollerCss.align === 'start');
  report('两端 mask 渐隐已移除', !!scrollerCss && scrollerCss.maskImage === 'none', String(scrollerCss && scrollerCss.maskImage));

  // hover 暂停 -> quiet(260ms) -> settle(<=180ms) -> snap 恢复且位置在栅格上
  const box = await page.locator('.feature-scroller').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(900);
  const settled = await page.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    const first = s.querySelector('.feature-track .module-card');
    const stride = first.getBoundingClientRect().width + parseFloat(getComputedStyle(s.querySelector('.feature-track')).gap || '16');
    const inline = s.style.scrollSnapType;
    const mod = ((s.scrollLeft % stride) + stride) % stride;
    const nearGrid = Math.min(mod, stride - mod) < 2;
    return { inline, stride: Math.round(stride), scrollLeft: Math.round(s.scrollLeft), nearGrid };
  });
  report('hover 暂停后 snap 恢复且吸附在卡片栅格', settled.inline === '' && settled.nearGrid, JSON.stringify(settled));

  await page.screenshot({ path: OUT + '/home-light-1440.png' });

  // nav 按钮：点击后落在栅格（间隔 2 卡步长）
  const navBtn = page.locator('.category-section').first().locator('.category-nav-btn[data-nav="1"]');
  await navBtn.click();
  await page.waitForTimeout(700);
  const afterNav = await page.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    const first = s.querySelector('.feature-track .module-card');
    const stride = first.getBoundingClientRect().width + parseFloat(getComputedStyle(s.querySelector('.feature-track')).gap || '16');
    const mod = ((s.scrollLeft % stride) + stride) % stride;
    return { scrollLeft: Math.round(s.scrollLeft), nearGrid: Math.min(mod, stride - mod) < 2, snapInline: s.style.scrollSnapType };
  });
  report('nav 翻页吸附栅格 + snap 恢复', afterNav.nearGrid && afterNav.snapInline === '', JSON.stringify(afterNav));

  // ============ 首页 暗色 ============
  await page.evaluate(() => localStorage.setItem('fandex-theme', 'dark'));
  await fresh(BASE);
  report('theme=dark', await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark');
  const darkCta = await page.evaluate(() => {
    const btn = document.querySelector('.entry-btn--cta');
    return btn ? getComputedStyle(btn).borderTopColor : null;
  });
  report('暗色下 CTA 边框有值', !!darkCta && darkCta !== 'rgba(0, 0, 0, 0)', String(darkCta));
  await page.screenshot({ path: OUT + '/home-dark-1440.png' });

  // ============ reduced-motion ============
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE);
  await p2.evaluate(() => localStorage.setItem('fandex-theme', 'light'));
  await p2.reload({ waitUntil: 'load' });
  await p2.waitForTimeout(1200);
  const rm1 = await p2.evaluate(() => document.querySelector('.feature-scroller').scrollLeft);
  await p2.waitForTimeout(1200);
  const rm2 = await p2.evaluate(() => document.querySelector('.feature-scroller').scrollLeft);
  report('reduced-motion 下常滚动静止', rm1 === rm2, `${rm1} vs ${rm2}`);
  const rmHero = await p2.evaluate(() => {
    const t = document.querySelector('.hero-title');
    const num = document.querySelector('.stat-num');
    return { heroText: t ? t.textContent.replace(/\s/g, '') : null, heroVisible: t ? getComputedStyle(t).opacity : null, stat: num ? num.textContent : null };
  });
  report('reduced-motion 下 hero 终态直接呈现', rmHero.heroText === 'FANDEX' && rmHero.heroVisible === '1', JSON.stringify(rmHero));
  await p2.close();
  await ctx2.close();

  // ============ 子页回归（home-shared 契约） ============
  await page.goto(BASE + 'syntax/');
  await fresh(BASE + 'syntax/');
  const sub = await page.evaluate(() => {
    const h = document.querySelector('.home-page--sub .hero-title');
    const link = document.querySelector('.fndx-footer__link');
    const entries = document.querySelectorAll('.entry-btn').length;
    return {
      heroSize: h ? getComputedStyle(h).fontSize : null,
      entryBtns: entries,
      underlineBase: link ? getComputedStyle(link, '::after').content : null,
      underlineH: link ? getComputedStyle(link, '::before').height : null,
    };
  });
  report('子页 hero 标题 2.1rem 契约不变', sub.heroSize === '33.6px', String(sub.heroSize));
  report('子页 FeatureNav 入口按钮渲染', sub.entryBtns >= 5, String(sub.entryBtns));
  report('页脚双层下划线伪元素存在', sub.underlineBase === '""' && sub.underlineH === '1px', JSON.stringify(sub));
  await page.screenshot({ path: OUT + '/syntax-light-1440.png' });

  // 子页暗色
  await page.evaluate(() => localStorage.setItem('fandex-theme', 'dark'));
  await fresh(BASE + 'syntax/');
  await page.screenshot({ path: OUT + '/syntax-dark-1440.png' });

  // ============ 窄视口 ============
  const ctx3 = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const p3 = await ctx3.newPage();
  await p3.goto(BASE);
  await p3.evaluate(() => localStorage.setItem('fandex-theme', 'light'));
  await p3.reload({ waitUntil: 'load' });
  await p3.waitForTimeout(800);
  await p3.screenshot({ path: OUT + '/home-light-768.png' });
  const overflow768 = await p3.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  report('恰 768px 无横向溢出', !overflow768);
  await p3.close();
  await ctx3.close();

  const ctx4 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
  const p4 = await ctx4.newPage();
  await p4.goto(BASE);
  await p4.evaluate(() => localStorage.setItem('fandex-theme', 'dark'));
  await p4.reload({ waitUntil: 'load' });
  await p4.waitForTimeout(800);
  // 触屏探针：手指按住横滑器拖动应改变 scrollLeft（原生滚动接管）
  const touchDrag = await p4.evaluate(async () => {
    const s = document.querySelector('.feature-scroller');
    const before = s.scrollLeft;
    const rect = s.getBoundingClientRect();
    const opts = { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: rect.left + 200, clientY: rect.top + 40, buttons: 1 };
    s.dispatchEvent(new PointerEvent('pointerdown', opts));
    for (let x = 200; x > 60; x -= 20) {
      s.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: rect.left + x }));
      await new Promise((r) => setTimeout(r, 16));
    }
    s.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: rect.left + 60 }));
    await new Promise((r) => setTimeout(r, 50));
    // 原生滚动不由合成 pointer 事件触发，直接验证 userHold 暂停 + 原生可滚性
    return { before, after: s.scrollLeft, touchAction: getComputedStyle(s).touchAction, scrollable: s.scrollWidth > s.clientWidth };
  });
  report('触屏路径就绪（可滚 + touch-action 默认）', touchDrag.scrollable && touchDrag.touchAction === 'auto', JSON.stringify(touchDrag));
  await p4.screenshot({ path: OUT + '/home-dark-375.png' });
  await p4.close();
  await ctx4.close();

  // console 错误汇总
  report('无 console/page 错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n==== ${results.length - failed.length}/${results.length} passed ====`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(2); });
