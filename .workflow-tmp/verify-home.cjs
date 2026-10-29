/* 首页门面视检脚本（运行约束 4 协议） */
const { createRequire } = require('module');
const req = createRequire('C:/Atian/Project/FANDEX/app-web/package.json');
const { chromium } = req('playwright');
const fs = require('fs');

const BASE = 'http://localhost:4321/FANDEX/';
const OUT = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/home';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const report = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  const fresh = async (url) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'load' });
        await page.evaluate(async () => {
          if (navigator.serviceWorker) {
            for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
          }
          for (const k of await caches.keys()) await caches.delete(k);
        });
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(600);
        return;
      } catch (e) {
        if (attempt === 2) throw e;
        await page.waitForTimeout(2500);
      }
    }
  };

  // 预热：让 Vite 完成依赖重优化，避免整页 reload 打断探针
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(3500);

  await page.goto(BASE);
  await page.evaluate(() => localStorage.setItem('fandex-theme', 'light'));
  await fresh(BASE);
  report('theme=light', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light');

  const fx = await page.evaluate(() => {
    const el = document.querySelector('.fx-backdrop');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { pos: cs.position, z: cs.zIndex };
  });
  report('fx-backdrop fixed z=-1', !!fx && fx.pos === 'fixed' && fx.z === '-1', JSON.stringify(fx));

  const cta = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.entry-btn--cta')];
    if (els.length !== 1) return { count: els.length, label: null };
    const btn = els[0];
    const name = btn.querySelector('.entry-name');
    const cs = getComputedStyle(btn);
    return {
      count: els.length,
      label: name ? name.textContent.trim() : null,
      arrow: btn.querySelector('.entry-cta-arrow')?.textContent.trim() || null,
      hasTick: !!btn.querySelector('.entry-cta-tick'),
      radius: cs.borderRadius,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle,
      waveHidden: getComputedStyle(btn.querySelector('.entry-border')).display === 'none',
    };
  });
  report('CTA 唯一且结构齐(学习路线/箭头/刻度)', cta.count === 1 && cta.label === '学习路线' && cta.arrow === '→' && cta.hasTick, JSON.stringify(cta));
  report('CTA 圆角与 1px 边框', cta.count === 1 && cta.radius !== '0px' && cta.border.startsWith('1px'), `radius=${cta.radius} border=${cta.border}`);

  const sl0 = await page.evaluate(() => document.querySelector('.feature-scroller').scrollLeft);
  await page.waitForTimeout(3800);
  const sl1 = await page.evaluate(() => document.querySelector('.feature-scroller').scrollLeft);
  report('常滚动运行(scrollLeft 递增)', sl1 > sl0, `${sl0} -> ${sl1}`);

  const sc = await page.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    const card = s.querySelector('.module-card');
    const cs = getComputedStyle(s);
    return {
      overflowX: cs.overflowX,
      snap: cs.scrollSnapType,
      inline: s.style.scrollSnapType,
      align: card ? getComputedStyle(card).scrollSnapAlign : null,
      scrollable: s.scrollWidth > s.clientWidth,
      mask: cs.maskImage !== 'none' ? cs.maskImage.slice(0, 30) : 'none',
    };
  });
  // 常滚动运行期 snap 被引擎设计性悬挂（inline none），静止态的 snap 断言在 reduced-motion 会话里做
  report('横滑器 overflow auto + 可滚', sc.overflowX === 'auto' && sc.scrollable, JSON.stringify(sc));
  report('卡片 snap-align start', sc.align === 'start');
  report('两端 mask 已移除', sc.mask === 'none', String(sc.mask));

  const box = await page.locator('.feature-scroller').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(900);
  const settled = await page.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    const first = s.querySelector('.module-card');
    const stride = first.getBoundingClientRect().width + 16;
    const inline = s.style.scrollSnapType;
    const mod = ((s.scrollLeft % stride) + stride) % stride;
    return { inline, nearGrid: Math.min(mod, stride - mod) < 2, sl: Math.round(s.scrollLeft), stride: Math.round(stride) };
  });
  report('hover 暂停后 snap 恢复且吸附栅格', settled.inline === '' && settled.nearGrid, JSON.stringify(settled));
  await page.screenshot({ path: OUT + '/home-light-1440.png' });

  const navBtn = page.locator('.category-section').first().locator('.category-nav-btn[data-nav="1"]');
  await navBtn.click();
  await page.waitForTimeout(700);
  const afterNav = await page.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    const first = s.querySelector('.module-card');
    const stride = first.getBoundingClientRect().width + 16;
    const mod = ((s.scrollLeft % stride) + stride) % stride;
    return { sl: Math.round(s.scrollLeft), nearGrid: Math.min(mod, stride - mod) < 2, snapInline: s.style.scrollSnapType };
  });
  // 翻页后常滚动按设计立即续跑（约 +18px/s），只做漂移容差断言；精确吸附在 reduced-motion 会话验证
  report('nav 翻页吸附栅格(含续跑漂移容差)', afterNav.nearGrid || afterNav.sl % 216 < 24, JSON.stringify(afterNav));
  // 翻页后常滚动会按设计续跑（snap 保持悬挂）；snap 恢复已在 hover 探针验证
  report('首页无 console/page 错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  await page.evaluate(() => localStorage.setItem('fandex-theme', 'dark'));
  await fresh(BASE);
  report('theme=dark', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark');
  await page.screenshot({ path: OUT + '/home-dark-1440.png' });

  const ctx2 = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE);
  await p2.evaluate(() => localStorage.setItem('fandex-theme', 'light'));
  await p2.reload({ waitUntil: 'load' });
  await p2.waitForTimeout(1400);
  const rm1 = await p2.evaluate(() => document.querySelector('.feature-scroller').scrollLeft);
  await p2.waitForTimeout(1200);
  const rm2 = await p2.evaluate(() => document.querySelector('.feature-scroller').scrollLeft);
  report('reduced-motion 常滚动静止', rm1 === rm2, `${rm1} vs ${rm2}`);
  const rmSnap = await p2.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    return { snap: getComputedStyle(s).scrollSnapType, inline: s.style.scrollSnapType };
  });
  // Chrome 把 scroll-snap-type: x proximity 序列化为 "x"（省略的 strictness 即 proximity）
  report('reduced-motion 下 CSS snap 保持生效', (rmSnap.snap.includes('proximity') || rmSnap.snap === 'x') && rmSnap.inline === '', JSON.stringify(rmSnap));
  // reduced-motion 下无常滚动干扰：nav 翻页应瞬时落在精确卡片栅格上
  await p2.locator('.category-section').first().locator('.category-nav-btn[data-nav="1"]').click();
  await p2.waitForTimeout(200);
  const rmNav = await p2.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    const first = s.querySelector('.module-card');
    const stride = first.getBoundingClientRect().width + 16;
    const mod = ((s.scrollLeft % stride) + stride) % stride;
    return { sl: Math.round(s.scrollLeft), stride: Math.round(stride), onGrid: Math.min(mod, stride - mod) < 2 };
  });
  report('reduced-motion nav 翻页精确吸附栅格', rmNav.onGrid, JSON.stringify(rmNav));
  await p2.close();
  await ctx2.close();

  await page.goto(BASE + 'syntax/');
  await fresh(BASE + 'syntax/');
  const sub = await page.evaluate(() => {
    const h = document.querySelector('.home-page--sub .hero-title');
    return {
      heroSize: h ? getComputedStyle(h).fontSize : null,
      entryBtns: document.querySelectorAll('.entry-btn').length,
    };
  });
  report('子页 hero 2.1rem 契约不变', sub.heroSize === '33.6px', String(sub.heroSize));
  report('子页 FeatureNav 渲染', sub.entryBtns >= 5, String(sub.entryBtns));
  await page.screenshot({ path: OUT + '/syntax-light-1440.png' });

  // 页脚双层下划线在 /algorithms/（该页有 Footer）
  await page.goto(BASE + 'algorithms/');
  await fresh(BASE + 'algorithms/');
  const footer = await page.evaluate(() => {
    const link = document.querySelector('.fndx-footer__link');
    if (!link) return null;
    return {
      base: getComputedStyle(link, '::after').content,
      hh: getComputedStyle(link, '::before').height,
      baseOpacity: getComputedStyle(link, '::after').opacity,
    };
  });
  report('页脚双层下划线伪元素在', !!footer && footer.base === '""' && footer.hh === '1px' && footer.baseOpacity === '0.3', JSON.stringify(footer));
  await page.screenshot({ path: OUT + '/algorithms-light-1440.png' });

  await page.evaluate(() => localStorage.setItem('fandex-theme', 'dark'));
  await fresh(BASE + 'syntax/');
  await page.screenshot({ path: OUT + '/syntax-dark-1440.png' });

  const ctx3 = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const p3 = await ctx3.newPage();
  await p3.goto(BASE);
  await p3.evaluate(() => localStorage.setItem('fandex-theme', 'light'));
  await p3.reload({ waitUntil: 'load' });
  await p3.waitForTimeout(800);
  await p3.screenshot({ path: OUT + '/home-light-768.png' });
  const ovf = await p3.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  report('恰 768px 无横向溢出', !ovf);
  await p3.close();
  await ctx3.close();

  // syntax 页的 stroke-width JSX 告警是 SyntaxExplorer 岛的存量问题（域外），只统计其余错误
  const otherErrors = errors.filter((e) => !e.includes('stroke-width'));
  report('子页无新增 console/page 错误', otherErrors.length === 0, otherErrors.slice(0, 3).join(' | '));
  await browser.close();
  const failed = results.filter((v) => !v).length;
  console.log(`\n==== ${results.length - failed}/${results.length} passed ====`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(2); });
