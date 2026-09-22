import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

interface Options {
  base: string;
}

function toPrefix(base: string): string {
  return base !== '/' ? base.replace(/^\/|\/$/g, '') : '';
}

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
      const hashIndex = rewritten.indexOf('#');
      const pathPart = hashIndex >= 0 ? rewritten.slice(0, hashIndex) : rewritten;
      const hashPart = hashIndex >= 0 ? rewritten.slice(hashIndex) : '';
      if (!pathPart.endsWith('/') && !/\.[a-zA-Z0-9]+$/.test(pathPart)) {
        rewritten = `${pathPart}/${hashPart}`;
      }
      node.url = rewritten;
    });
  };
}
