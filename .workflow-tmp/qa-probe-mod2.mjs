import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:4321/FANDEX/', { waitUntil: 'domcontentloaded' });
const out = await page.evaluate(async () => {
  const res = await import('/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=f62a2767');
  const d = res.default;
  const desc = Object.getOwnPropertyDescriptor(d, 'jsxDEV');
  const frag = Object.getOwnPropertyDescriptor(d, 'Fragment');
  let call = null;
  try { call = typeof d.jsxDEV; } catch (e) { call = 'THROW ' + e.message; }
  const own = Object.getOwnPropertyNames(d);
  return {
    ctor: d.constructor?.name,
    ownNames: own,
    desc_jsxDEV: desc ? { get: typeof desc.get, value: typeof desc.value, enumerable: desc.enumerable } : null,
    desc_Fragment: frag ? { get: typeof frag.get, value: typeof frag.value } : null,
    typeofAccess: call,
    stringified: (() => { try { return JSON.stringify(Object.keys(d)); } catch (e) { return 'err'; } })(),
    protoKeys: Object.getOwnPropertyNames(Object.getPrototypeOf(d) || {}).slice(0, 10),
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
