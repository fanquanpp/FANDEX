import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:4321/FANDEX/', { waitUntil: 'domcontentloaded' });
const out = await page.evaluate(async () => {
  const res = await import('/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=f62a2767');
  const d = res.default;
  const react = await import('/node_modules/.vite/deps/react.js?v=f62a2767');
  return {
    nsKeys: Object.keys(res),
    defType: typeof d,
    defKeys: d ? Object.keys(d).slice(0, 20) : null,
    jsxDEVtypeof: d ? typeof d.jsxDEV : 'no-default',
    reactKeys: Object.keys(react).slice(0, 20),
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
