import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent, Parents, Properties } from 'hast';

export function rehypeWrapTables() {
  return (tree: Root) => {
    visit(
      tree,
      'element',
      (node: Element, index: number | undefined, parent: Parents | undefined) => {
        if (node.tagName !== 'table') return;
        if (index === undefined || parent === undefined) return;
        if (parent.type !== 'element' && parent.type !== 'root') return;

        const parentProps =
          parent.type === 'element'
            ? ((parent as Element).properties as Properties | undefined)
            : undefined;
        if (
          parent.type === 'element' &&
          (parent as Element).tagName === 'div' &&
          parentProps !== undefined &&
          Array.isArray(parentProps.className) &&
          (parentProps.className as Array<string>).includes('table-wrap')
        ) {
          return;
        }

        const wrapNode: Element = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['table-wrap'], tabIndex: 0 },
          children: [node as ElementContent],
        };

        parent.children[index] = wrapNode;
      }
    );
  };
}
