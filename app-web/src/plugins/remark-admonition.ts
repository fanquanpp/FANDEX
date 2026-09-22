import { visit } from 'unist-util-visit';
import type { Root, Blockquote, Paragraph, Text } from 'mdast';

export function remarkAdmonition() {
  const types = ['note', 'tip', 'warning', 'danger', 'info', 'caution', 'important'];

  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      if (!node.children || node.children.length === 0) return;

      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;

      const firstTextChild = firstChild.children?.[0];
      if (!firstTextChild || firstTextChild.type !== 'text') return;

      // 兼容 GitHub 可折叠标记 [!TIP]+ / [!TIP]-，避免 +/- 残留在正文
      const match = firstTextChild.value.match(/^\[!(\w+)\][+-]?\s*/i);
      if (!match) return;

      const admType = (match[1] || '').toLowerCase();
      if (!admType || !types.includes(admType)) return;

      firstTextChild.value = firstTextChild.value.replace(/^\[!\w+\][+-]?\s*/, '');

      if (firstTextChild.value.trim() === '' && firstChild.children.length === 1) {
        node.children.shift();
      }

      const titleNode: Paragraph = {
        type: 'paragraph',
        data: { hProperties: { className: ['admonition-title'] } },
        children: [
          {
            type: 'text',
            value: admType.charAt(0).toUpperCase() + admType.slice(1),
          } as Text,
        ],
      };

      node.children.unshift(titleNode);

      node.data = {
        hName: 'div',
        hProperties: { className: ['admonition', `admonition-${admType}`] },
      };
    });
  };
}
