import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

const targets = [
  'syntax/',
  'algorithms/',
  'playground/',
  'learning-path/',
  'learning-path/javascript/',
  'ai/',
  'disclaimer/',
  '404',
  '404/',
];

for (const slug of targets) {
  const page = await ctx.newPage();
  const msgs = [];
  page.on('console', (m) => { if (m.type() === 'error') msgs.push(m.text().slice(0, 150)); });
  page.on('pageerror', (e) => msgs.push('PE ' + e.message.slice(0, 120)));
  await page.goto('http://localhost:4321/FANDEX/' + slug, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const dom = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const header = q('[data-site-header]');
    const footer = q('footer.fndx-footer, footer');
    return {
      status: undefined,
      headerPresent: !!header,
      headerVisible: header ? header.getBoundingClientRect().height : -1,
      footerPresent: !!footer,
      footerH: footer ? footer.getBoundingClientRect().height : -1,
      footerHTMLLen: footer ? footer.outerHTML.length : 0,
      backdrop: !!q('.fx-backdrop'),
      glitch: !!q('[data-fx="letter-glitch"]'),
      dataTheme: document.documentElement.getAttribute('data-theme'),
      title: document.title.slice(0, 40),
      bodyLen: document.body.innerText.length,
    };
  });
  dom.status = msgs.length ? msgs.join(' || ') : 'clean';
  console.log(slug.padEnd(28), JSON.stringify(dom));
  await page.close();
}
await browser.close();
