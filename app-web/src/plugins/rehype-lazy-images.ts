import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

export function rehypeLazyImages() {
  return (tree: Root) => {
    let imgCount = 0;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return;
      if (!node.properties) node.properties = {};

      if (!node.properties.width) node.properties.width = 800;
      if (!node.properties.height) node.properties.height = 450;

      if (!node.properties.decoding) {
        node.properties.decoding = 'async';
      }

      if (imgCount === 0) {
        node.properties.loading = 'eager';
        node.properties.fetchpriority = 'high';
      } else if (!node.properties.loading) {
        node.properties.loading = 'lazy';
      }
      imgCount++;
    });
  };
}
