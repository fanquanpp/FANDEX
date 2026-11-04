import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const out = await page.evaluate(() => {
  const svgs = [...document.querySelectorAll('svg')].slice(0, 200);
  const kebab = svgs.filter((s) => s.hasAttribute('stroke-width'));
  const sample = kebab[0];
  return {
    svgTotal: svgs.length,
    kebabCount: kebab.length,
    sampleKebabApplied: sample ? sample.getAttribute('stroke-width') : null,
    sampleStrokeComputed: sample ? getComputedStyle(sample).strokeWidth : null,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
