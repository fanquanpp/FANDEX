import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:4321/FANDEX/', { waitUntil: 'domcontentloaded' });
const txt = await page.evaluate(async () => {
  const r = await fetch('/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=f62a2767');
  return { status: r.status, text: await r.text() };
});
writeFileSync('C:/Atian/Project/FANDEX/.workflow-tmp/served-jsx-dev-runtime.js', txt.text);
console.log('status', txt.status, 'len', txt.text.length);
console.log('contains exports.jsxDEV =:', txt.text.includes('exports.jsxDEV ='));
console.log('contains exports.Fragment =:', txt.text.includes('exports.Fragment'));
await browser.close();
