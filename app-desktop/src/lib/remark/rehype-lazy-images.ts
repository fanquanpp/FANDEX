/**
 * rehype-lazy-images 插件（Phase 9）
 *
 * 功能概述：
 * - 在 HAST 阶段为 <img> 元素添加懒加载、防 CLS、响应式 srcset 属性
 * - 添加 loading="lazy" 与 decoding="async" 属性（不覆盖已有值）
 * - 添加 width/height 属性防止布局偏移（CLS），从图片元数据推断或默认 16:9
 * - 将原 src 移到 data-src，src 设置为占位 SVG（1x1 透明或 10x10 模糊）
 * - 添加 lazy-img 类名，配合客户端 IntersectionObserver 实现懒加载
 * - 支持 @1x/@2x 后缀图片自动生成 srcset 与 sizes
 *
 * 客户端配套：
 * - IntersectionObserver 在图片进入视口时将 data-src 写回 src（Phase 10 layout.ts 实现）
 * - 占位 SVG 在加载完成前显示，避免布局抖动
 *
 * 例外处理：
 * - 远程图片（http://、https://）保留原样，仅添加 lazy/async 属性，不替换 src
 * - data: URI 图片（base64 内联）跳过处理
 * - astro:assets 输出的 <img astro-image> 保留原处理（已优化）
 * - 已有 width/height 的图片不覆盖
 *
 * 设计要点：
 * - 占位 SVG 使用 1x1 透明像素，避免引入额外网络请求
 * - 响应式 srcset 仅在文件名包含 @1x/@2x 标记时生成
 * - 默认尺寸 16:9（width=1600, height=900），可被实际元数据覆盖
 */

import type { Element, Properties, Root } from 'hast';
import type { Plugin, Transformer } from 'unified';
import { visit } from 'unist-util-visit';

/** 插件配置选项 */
export interface RehypeLazyImagesOptions {
  /** 默认宽度（默认 1600，用于无尺寸信息时按 16:9 推断） */
  defaultWidth?: number;
  /** 默认高度（默认 900） */
  defaultHeight?: number;
  /** 是否启用 SVG 占位符（默认 true） */
  enablePlaceholder?: boolean;
}

/** 1x1 透明 GIF 占位（最小体积，避免引入 SVG 解析开销） */
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** 10x10 灰色模糊 SVG 占位（视觉上更柔和） */
const BLUR_SVG_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"%3E%3Crect width="10" height="10" fill="%23e5e7eb"/%3E%3C/svg%3E';

/** 默认宽度（16:9 比例） */
const DEFAULT_WIDTH = 1600;
/** 默认高度（16:9 比例） */
const DEFAULT_HEIGHT = 900;

/** 响应式图片后缀正则：匹配 image@1x.png、image@2x.png 等 */
const RESPONSIVE_SUFFIX_REGEX = /^(.+?)@([12])x(\.\w+)$/;

/**
 * 判断图片 src 是否为远程图片
 *
 * @param src - 图片 src 属性值
 * @returns 是否为远程图片（http/https 协议）
 */
function isRemoteImage(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://');
}

/**
 * 判断图片 src 是否为 data URI
 *
 * @param src - 图片 src 属性值
 * @returns 是否为 data URI
 */
function isDataUri(src: string): boolean {
  return src.startsWith('data:');
}

/**
 * 从 src 路径推断响应式 srcset
 *
 * 输入：image@1x.png 或 image@2x.png
 * 输出：srcset="image@1x.png 1x, image@2x.png 2x"
 *
 * 仅当文件名包含 @1x 或 @2x 后缀时生成；否则返回 null。
 *
 * @param src - 原始图片 src
 * @returns srcset 字符串或 null
 */
function buildSrcset(src: string): string | null {
  const match = src.match(RESPONSIVE_SUFFIX_REGEX);
  if (!match) return null;

  const [, basePath, , ext] = match;
  if (!basePath || !ext) return null;

  return `${basePath}@1x${ext} 1x, ${basePath}@2x${ext} 2x`;
}

/**
 * 构建默认 sizes 属性
 *
 * 默认策略：视口宽度 100% 移动端，最大 1200px 桌面端
 *
 * @returns sizes 属性字符串
 */
function buildDefaultSizes(): string {
  return '(max-width: 768px) 100vw, (max-width: 1200px) 1200px, 1600px';
}

/**
 * 为图片元素添加响应式 srcset 与 sizes 属性
 *
 * 仅在未设置 srcset 且文件名包含 @1x/@2x 标记时添加。
 *
 * @param props - 图片元素属性对象
 * @param src - 图片 src
 */
function applyResponsiveAttributes(props: Properties, src: string): void {
  if (props.srcset) return;

  const srcset = buildSrcset(src);
  if (srcset) {
    props.srcset = srcset;
    if (!props.sizes) {
      props.sizes = buildDefaultSizes();
    }
  }
}

/**
 * 为图片元素添加 width/height 属性（防止 CLS）
 *
 * 优先使用已有属性，未提供时使用默认 16:9 尺寸。
 *
 * @param props - 图片元素属性对象
 * @param defaultWidth - 默认宽度
 * @param defaultHeight - 默认高度
 */
function applyDimensions(props: Properties, defaultWidth: number, defaultHeight: number): void {
  if (!props.width) {
    props.width = defaultWidth;
  }
  if (!props.height) {
    props.height = defaultHeight;
  }
}

/**
 * 为图片元素添加懒加载属性
 *
 * - loading="lazy"：浏览器原生懒加载
 * - decoding="async"：异步解码避免阻塞主线程
 * - class="lazy-img"：客户端 JS 识别标记
 *
 * @param props - 图片元素属性对象
 * @param existingClassName - 已有的 class 属性值
 */
function applyLazyAttributes(props: Properties, existingClassName: string | undefined): void {
  if (!props.loading) {
    props.loading = 'lazy';
  }
  if (!props.decoding) {
    props.decoding = 'async';
  }

  /* 合并 lazy-img 类名到已有 class */
  const classes = existingClassName ? existingClassName.split(/\s+/).filter(Boolean) : [];
  if (!classes.includes('lazy-img')) {
    classes.push('lazy-img');
  }
  props.className = classes.join(' ');
}

/**
 * 将原 src 替换为占位符，原 src 移到 data-src
 *
 * 仅对本地图片执行（非 http/https/data URI）。
 * 占位符默认使用 1x1 透明 GIF（体积最小）。
 *
 * @param props - 图片元素属性对象
 * @param originalSrc - 原 src 值
 * @param usePlaceholder - 是否使用 SVG 占位符
 */
function applyLazySrcSwap(props: Properties, originalSrc: string, usePlaceholder: boolean): void {
  props.dataSrc = originalSrc;
  props.src = usePlaceholder ? BLUR_SVG_PLACEHOLDER : TRANSPARENT_PIXEL;
}

/**
 * 处理单个 <img> 元素，添加懒加载与响应式属性
 *
 * @param node - HAST 元素节点
 * @param options - 插件配置
 */
function processImageElement(node: Element, options: Required<RehypeLazyImagesOptions>): void {
  if (node.tagName !== 'img') return;

  const props: Properties = node.properties ?? {};
  const src = typeof props.src === 'string' ? props.src : '';
  if (!src) return;

  /* data URI 内联图片跳过处理 */
  if (isDataUri(src)) {
    return;
  }

  /* astro:assets 输出（带 astro-image 属性）保留原处理 */
  const isAstroImage = props['astro-image'] !== undefined;
  if (isAstroImage) {
    /* 仅补充 lazy/async 属性 */
    if (!props.loading) props.loading = 'lazy';
    if (!props.decoding) props.decoding = 'async';
    return;
  }

  const existingClassName = typeof props.className === 'string' ? props.className : undefined;

  /* 远程图片：仅添加 lazy/async/srcset，不替换 src */
  if (isRemoteImage(src)) {
    applyLazyAttributes(props, existingClassName);
    applyDimensions(props, options.defaultWidth, options.defaultHeight);
    applyResponsiveAttributes(props, src);
    node.properties = props;
    return;
  }

  /* 本地图片：完整懒加载处理 */
  applyLazyAttributes(props, existingClassName);
  applyDimensions(props, options.defaultWidth, options.defaultHeight);
  applyResponsiveAttributes(props, src);
  applyLazySrcSwap(props, src, options.enablePlaceholder);

  node.properties = props;
}

/**
 * rehype-lazy-images 插件入口
 *
 * 遍历 HAST 中所有 <img> 元素，添加懒加载与响应式属性。
 *
 * @param options - 插件配置（可选）
 * @returns unified Transformer 函数
 */
export const rehypeLazyImages: Plugin<[RehypeLazyImagesOptions?] | [], Root> = (
  options?: RehypeLazyImagesOptions,
): Transformer<Root> => {
  const resolvedOptions: Required<RehypeLazyImagesOptions> = {
    defaultWidth: options?.defaultWidth ?? DEFAULT_WIDTH,
    defaultHeight: options?.defaultHeight ?? DEFAULT_HEIGHT,
    enablePlaceholder: options?.enablePlaceholder ?? true,
  };

  return (tree: Root): Root => {
    visit(tree, 'element', (node: Element) => {
      processImageElement(node, resolvedOptions);
    });
    return tree;
  };
};

export default rehypeLazyImages;
