import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent, Parents, Properties } from 'hast';

/**
 * rehype 表格包裹处理器
 *
 * 核心执行流程：
 *   1. 遍历 HAST 树中的 element 节点，定位 tagName === 'table' 的表格元素。
 *   2. 跳过已经被 .table-wrap 包裹（即父节点为 div.table-wrap）的表格，避免重复包裹。
 *   3. 将命中的 table 节点替换为 <div class="table-wrap"> 包裹层，原表格作为其唯一子节点。
 *
 * 设计目的：
 *   将 .prose table 的 display:table 与横向滚动能力（overflow-x:auto）解耦——
 *   滚动由外层 .table-wrap 承担，规避同元素同时设置 display:table 与 overflow-x:auto
 *   时浏览器无法生成滚动容器的样式冲突问题。
 *
 * 输入参数：无（标准 rehype 插件签名）。
 * 返回值：HAST 转换函数，接收 tree 并就地修改。
 */
export function rehypeWrapTables() {
  return (tree: Root) => {
    // 自顶向下遍历，visitor 在父节点层面替换子节点；index/parent 在根节点访问时为 undefined
    visit(
      tree,
      'element',
      (node: Element, index: number | undefined, parent: Parents | undefined) => {
        if (node.tagName !== 'table') return;
        if (index === undefined || parent === undefined) return;
        // 限定父节点为 Element（Root 不应直接包含 table），便于后续读取 tagName 与 properties
        if (parent.type !== 'element') return;

        // 父节点已是 table-wrap 包裹层则跳过，防止二次包裹
        const parentProps = (parent as Element).properties as Properties | undefined;
        if (
          (parent as Element).tagName === 'div' &&
          parentProps !== undefined &&
          Array.isArray(parentProps.className) &&
          (parentProps.className as Array<string>).includes('table-wrap')
        ) {
          return;
        }

        // 构造包裹层节点：<div class="table-wrap">原表格</div>
        const wrapNode: Element = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['table-wrap'] },
          children: [node as ElementContent],
        };

        // 用包裹层替换原表格在父级 children 数组中的位置
        parent.children[index] = wrapNode;
      }
    );
  };
}
