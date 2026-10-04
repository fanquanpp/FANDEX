import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

/**
 * 为 sitemap-*.xml 的每个 <url> 补写 <lastmod>。
 *
 * 文档 frontmatter 均带 updated（最后更新时间），SEO.astro 已把它输出为
 * JSON-LD 的 dateModified；官方 @astrojs/sitemap 3.x 的 lastmod 选项只支持
 * 单一全局日期，无法逐页取值。本集成在 astro:build:done（排在 sitemap 集成
 * 之后注册，确保 sitemap 文件已生成）扫描 dist HTML，把 dateModified 回填到
 * 对应 <loc> 的 <lastmod>，搜索引擎可据此做增量抓取。没有 dateModified 的
 * 页面（首页、专题页等）保持无 lastmod，符合协议对可选字段的定义。
 *
 * 与 astro.config.ts 的 SITE_BASE 同源：桌面变体（DESKTOP_BUILD=1）base 为 /
 */
const BASE = process.env.DESKTOP_BUILD === '1' ? '/' : '/FANDEX/';

const DATE_MODIFIED = /"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2}[^"]*)"/;

async function walkHtml(dir: string, acc: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walkHtml(full, acc);
    else if (entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

/** dist 内 HTML 文件路径 -> 站点路径（带 base 前缀，与 sitemap <loc> 的 pathname 一致） */
function htmlToSitePath(root: string, file: string): string {
  const rel = relative(root, file).split(sep).join('/');
  if (rel === 'index.html') return BASE;
  if (rel.endsWith('/index.html')) return `${BASE}${rel.slice(0, -'index.html'.length)}`;
  return `${BASE}${rel}`;
}

export function integrationSitemapLastmod(): AstroIntegration {
  return {
    name: 'fandex-sitemap-lastmod',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const sitemaps = (await readdir(root)).filter(
          (name) => /^sitemap-\d+\.xml$/.test(name),
        );
        if (sitemaps.length === 0) {
          logger.warn('sitemap-*.xml not found, skip lastmod injection');
          return;
        }

        const lastmodByPath = new Map<string, string>();
        for (const file of await walkHtml(root)) {
          const content = await readFile(file, 'utf-8');
          const matched = content.match(DATE_MODIFIED);
          if (matched?.[1]) lastmodByPath.set(htmlToSitePath(root, file), matched[1]);
        }
        if (lastmodByPath.size === 0) return;

        let injected = 0;
        for (const name of sitemaps) {
          const path = join(root, name);
          if (!existsSync(path)) continue;
          const xml = await readFile(path, 'utf-8');
          const updated = xml.replace(
            /<url>(<loc>([^<]+)<\/loc>)(?!<lastmod>)/g,
            (_match, locTag: string, loc: string) => {
              let pathname: string;
              try {
                pathname = new URL(loc).pathname;
              } catch {
                return locTag;
              }
              const lastmod = lastmodByPath.get(pathname);
              if (!lastmod) return locTag;
              injected += 1;
              return `${locTag}<lastmod>${lastmod}</lastmod>`;
            },
          );
          if (updated !== xml) await writeFile(path, updated);
        }
        logger.info(`sitemap lastmod: injected ${injected} entries from frontmatter updated dates`);
      },
    },
  };
}
