import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

interface Options {
  base: string;
}

function toPrefix(base: string): string {
  return base !== '/' ? base.replace(/^\/|\/$/g, '') : '';
}

// 视为“文件”的扩展名：其余以点结尾的路径（如版本号 slug v2.0）仍按目录补全尾斜杠
const FILE_EXT_PATTERN = /\.(md|mdx|html?|xml|txt|json|pdf|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf)$/i;

export function remarkInternalLinks({ base }: Options) {
  const PREFIX = toPrefix(base);
  return (tree: Root) => {
    if (!PREFIX) return;
    visit(tree, (node) => {
      if (node.type !== 'link' && node.type !== 'image' && node.type !== 'definition') {
        return;
      }
      const url = node.url;
      if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return;
      if (url === `/${PREFIX}` || url.startsWith(`/${PREFIX}/`)) return;

      let rewritten = `/${PREFIX}${url}`;
      // hash 与 query 需要在补尾斜杠前剥离，否则会产出 /path/?q=1/ 这类畸形链接
      const hashIndex = rewritten.indexOf('#');
      const queryIndex = rewritten.indexOf('?');
      const splitAt = [hashIndex, queryIndex].filter((i) => i >= 0).sort((a, b) => a - b)[0];
      const pathPart = splitAt !== undefined ? rewritten.slice(0, splitAt) : rewritten;
      const suffixPart = splitAt !== undefined ? rewritten.slice(splitAt) : '';
      if (!pathPart.endsWith('/') && !FILE_EXT_PATTERN.test(pathPart)) {
        rewritten = `${pathPart}/${suffixPart}`;
      }
      node.url = rewritten;
    });
  };
}
