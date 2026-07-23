import { visit } from 'unist-util-visit';
import type { Root, Blockquote, Paragraph, Text } from 'mdast';

/**
 * 自定义提示块解析器（remark 插件）
 * 识别 Markdown 引用块开头的 [!TYPE] 标记，将其转换为带类名的 div 元素。
 * 支持类型：note、tip、warning、danger、info、caution、important
 */
export function remarkAdmonition() {
  const types = ['note', 'tip', 'warning', 'danger', 'info', 'caution', 'important'];

  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      if (!node.children || node.children.length === 0) return;

      // noUncheckedIndexedAccess：node.children[0] 类型为 Paragraph | undefined
      // 显式 nullish 检查收窄类型，避免后续 .type 访问报错
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;

      const firstTextChild = firstChild.children?.[0];
      if (!firstTextChild || firstTextChild.type !== 'text') return;

      const match = firstTextChild.value.match(/^\[!(\w+)\]\s*/i);
      if (!match) return;

      // noUncheckedIndexedAccess：match[1] 类型为 string | undefined，提供兜底
      const admType = (match[1] || '').toLowerCase();
      if (!admType || !types.includes(admType)) return;

      // 移除 [!TYPE] 标记文本
      firstTextChild.value = firstTextChild.value.replace(/^\[!\w+\]\s*/, '');

      // 若标记后无剩余文本且段落仅含此文本节点，则移除空段落
      if (firstTextChild.value.trim() === '' && firstChild.children.length === 1) {
        node.children.shift();
      }

      // 构建标题段落节点
      const titleNode: Paragraph = {
        type: 'paragraph',
        data: { hProperties: { className: 'admonition-title' } },
        children: [
          {
            type: 'text',
            value: admType.charAt(0).toUpperCase() + admType.slice(1),
          } as Text,
        ],
      };

      node.children.unshift(titleNode);

      // 将引用块渲染为带类名的 div
      node.data = {
        hName: 'div',
        hProperties: { className: `admonition admonition-${admType}` },
      };
    });
  };
}
