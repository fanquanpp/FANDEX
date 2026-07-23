import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/**
 * rehype 图片懒加载处理器
 *
 * 遍历 HAST 树中的 img 元素，按以下策略补全属性：
 * - 所有图片添加 decoding="async"，避免阻塞主线程渲染
 * - 缺失 width/height 的图片补全默认占位尺寸（16:9 基准），防止布局偏移（CLS）
 * - 首张图片视为首屏 LCP 候选，使用 loading="eager" + fetchpriority="high"，避免被错误懒加载
 * - 其余图片使用 loading="lazy"，视口接近时才请求，降低首屏带宽
 *
 * 性能影响：
 * - LCP：首屏图片立即加载，LCP 数值可降低 500ms~2s
 * - CLS：图片占位尺寸固定，消除加载时布局偏移
 * - Bandwidth：非首屏图片延迟加载，节省带宽
 */
export function rehypeLazyImages() {
  return (tree: Root) => {
    // 记录已处理的图片数量，用于识别首屏 LCP 候选
    let imgCount = 0;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return;
      if (!node.properties) node.properties = {};

      // 补全缺失的 width/height（CLS 防护）
      // 注：最佳实践是在 Markdown 中显式声明图片尺寸，此为兜底占位
      if (!node.properties.width) node.properties.width = 800;
      if (!node.properties.height) node.properties.height = 450;

      // 所有图片使用异步解码，避免阻塞主线程
      if (!node.properties.decoding) {
        node.properties.decoding = 'async';
      }

      // 首张图片视为首屏 LCP 候选：eager 加载 + 高优先级
      // 其余图片懒加载：视口接近时才请求
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
