import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

export function rehypeLazyImages() {
  return (tree: Root) => {
    let imgCount = 0;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return;
      if (!node.properties) node.properties = {};

      // 不伪造 width/height：错误的 16:9 占位在真实图片比例不符时反而造成二次回流。
      // 保持浏览器按图片比例自然布局，避免错误预留尺寸带来的 CLS。

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
