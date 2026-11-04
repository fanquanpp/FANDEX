const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto('http://localhost:4321/FANDEX/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  // 检查常滚动引擎是否把卡片移走了：pointer down hover 暂停？直接 mouse click 到卡片中心
  const box = await p.locator('a.module-card[href="/FANDEX/start/"]').first().boundingBox();
  console.log('box:', JSON.stringify(box));
  if (!box) return;
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(300);
  const box2 = await p.locator('a.module-card[href="/FANDEX/start/"]').first().boundingBox();
  console.log('box2 after hover:', JSON.stringify(box2));
  await p.mouse.down();
  await p.waitForTimeout(80);
  const box3 = await p.locator('a.module-card[href="/FANDEX/start/"]').first().boundingBox();
  console.log('box3 after pointerdown:', JSON.stringify(box3));
  await p.mouse.up();
  await p.waitForTimeout(2500);
  console.log('after full click url:', p.url());
  // 检查 suppressClick 路径：pointerdown 引擎 isDragging=true, up 后没有 move => suppress 不该触发
  // 再试 keyboard Enter 激活
  await p.locator('a.module-card[href="/FANDEX/start/"]').first().focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(2200);
  console.log('after Enter url:', p.url());
  await b.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
