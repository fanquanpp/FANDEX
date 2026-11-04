const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto('http://localhost:4321/FANDEX/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    return new Promise((res) => {
      const sc = document.querySelector('[data-scroller]');
      const card = sc.querySelector('a.module-card[href="/FANDEX/start/"]');
      const rect = card.getBoundingClientRect();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      const clicked = [];
      card.addEventListener('click', () => clicked.push('card-click'), { once: true });
      sc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 9, pointerType: 'mouse', isPrimary: true }));
      sc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 9, pointerType: 'mouse', isPrimary: true }));
      card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      setTimeout(() => res({ clicked, url: location.href }), 500);
    });
  });
  console.log('synthetic direct card click:', JSON.stringify(r));
  await b.close();
})().catch(e => { console.error('ERR', String(e).slice(0, 300)); process.exit(1); });
