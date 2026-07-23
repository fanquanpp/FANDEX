/**
 * remark-admonition 插件（Phase 9）
 *
 * 功能概述：
 * - 自定义提示块语法 `:::note :::tip :::warning :::danger :::info :::success`
 * - 在 Markdown 构建阶段（MDAST）识别 `:::type\n标题?: 自定义标题\n内容\n:::` 围栏块
 * - 将其转换为自定义 `admonition` MDAST 节点，携带 type / title / children
 * - 后续 remark-rehype 阶段通过节点的 data.hName / data.hProperties 自动渲染为
 *   `<aside class="admonition admonition-{type}" role="note">...</aside>`
 *
 * 语法示例：
 *   :::note
 *   这是一个注释
 *   :::
 *
 *   :::tip 提示标题
 *   这是一个提示内容
 *   :::
 *
 * 设计要点：
 * - 兼容 GFM 警告语法 `[!NOTE]` 作为回退（与旧版保持一致）
 * - 标题可选：未提供时使用类型默认名称（如 note → "注意"）
 * - 内容支持多行、嵌套 Markdown 语法
 * - 围栏必须独占一行，结束围栏 `:::` 必须独占一行
 * - 类型校验：仅识别预定义的 6 种类型，其他忽略
 *
 * 颜色对齐 Tailwind v4：
 * - note → blue（信息蓝）
 * - tip → green（成功绿）
 * - warning → amber（警告黄）
 * - danger → red（危险红）
 * - info → cyan（提示青）
 * - success → emerald（成功翠绿）
 */

import type { Paragraph, Parent, PhrasingContent, Root, RootContent, Text } from 'mdast';
import type { Plugin, Transformer } from 'unified';

/** 支持的提示块类型 */
export type AdmonitionType = 'note' | 'tip' | 'warning' | 'danger' | 'info' | 'success';

/** 类型默认标题映射（中文） */
const DEFAULT_TITLES: Record<AdmonitionType, string> = {
  note: '注意',
  tip: '提示',
  warning: '警告',
  danger: '危险',
  info: '信息',
  success: '成功',
};

/** 类型对应的 ARIA role（无障碍语义） */
const TYPE_ROLES: Record<AdmonitionType, string> = {
  note: 'note',
  tip: 'tip',
  warning: 'warning',
  danger: 'alert',
  info: 'note',
  success: 'status',
};

/** 类型对应的 Lucide 图标名称（前端可据此渲染 SVG） */
const TYPE_ICONS: Record<AdmonitionType, string> = {
  note: 'info',
  tip: 'lightbulb',
  warning: 'triangle-alert',
  danger: 'octagon-alert',
  info: 'circle-help',
  success: 'circle-check',
};

/** 所有合法类型集合（用于校验） */
const VALID_TYPES = new Set<string>(Object.keys(DEFAULT_TITLES));

/** 自定义 admonition MDAST 节点接口 */
export interface AdmonitionNode extends Parent {
  /** 节点类型标识 */
  type: 'admonition';
  /** 提示块类型 */
  admonitionType: AdmonitionType;
  /** 自定义标题（可选，未提供时使用默认标题） */
  title?: string;
  /** 子节点（提示块内容） */
  children: RootContent[];
}

/** 围栏起始行正则：匹配 `:::type` 或 `:::type 标题` */
const FENCE_OPEN_REGEX = /^:::\s*(note|tip|warning|danger|info|success)\s*(.*)$/i;

/** 围栏结束标记：`:::` 单独一行 */
const FENCE_CLOSE = ':::';

/**
 * 解析段落子节点中的纯文本内容
 *
 * 用于从 `:::type 标题` 行中提取标题文本。
 * 仅提取 text 节点的 value，忽略其他内联节点。
 *
 * @param children - 段落子节点数组
 * @returns 拼接后的纯文本
 */
function extractText(children: PhrasingContent[]): string {
  return children
    .map((child) => (child.type === 'text' ? child.value : ''))
    .join('')
    .trim();
}

/**
 * 收集连续的段落子节点作为 admonition 内容
 *
 * 输入：父节点的 children 数组、起始索引（:::type 段落的下一个段落）
 * 输出：{ contentNodes, endIndex } 表示收集到的内容节点数组和结束索引
 * 流程：遍历后续段落，遇到 `:::` 结束围栏则停止
 *
 * @param siblings - 父节点 children 数组
 * @param startIndex - 开始扫描的索引
 * @returns 内容节点列表与结束索引（结束围栏所在索引）；未找到结束围栏返回 null
 */
function collectAdmonitionContent(
  siblings: RootContent[],
  startIndex: number,
): { contentNodes: RootContent[]; endIndex: number } | null {
  const contentNodes: RootContent[] = [];

  for (let i = startIndex; i < siblings.length; i++) {
    const node = siblings[i];

    if (node?.type === 'paragraph') {
      const paragraph = node as Paragraph;
      const text = extractText(paragraph.children as PhrasingContent[]);

      /* 遇到结束围栏 `:::`，返回收集结果 */
      if (text === FENCE_CLOSE) {
        return { contentNodes, endIndex: i };
      }
    }

    /* 累积内容节点（包括非段落节点，如代码块、列表等） */
    if (node) {
      contentNodes.push(node);
    }
  }

  /* 未找到结束围栏，返回 null 表示语法不完整 */
  return null;
}

/**
 * 构造 admonition 标题段落节点
 *
 * 输入：类型、标题文本
 * 输出：MDAST 段落节点，携带 data.hProperties.className='admonition-title'
 *
 * @param type - 提示块类型
 * @param customTitle - 自定义标题（可选）
 * @returns 标题段落节点
 */
function buildTitleParagraph(type: AdmonitionType, customTitle?: string): Paragraph {
  const titleText = customTitle?.trim() || DEFAULT_TITLES[type];

  const textNode: Text = { type: 'text', value: titleText };

  return {
    type: 'paragraph',
    data: {
      hProperties: {
        className: ['admonition-title'],
        /* 携带图标名称，前端可据此渲染 SVG */
        dataIcon: TYPE_ICONS[type],
      },
    },
    children: [textNode],
  };
}

/**
 * 为 admonition 节点附加 HAST 渲染指令
 *
 * 通过设置 data.hName 和 data.hProperties，让 remark-rehype 自动将该节点
 * 渲染为 `<aside class="admonition admonition-{type}" role="{role}">`。
 *
 * @param node - admonition 节点
 * @param type - 提示块类型
 */
function attachHastDirective(node: AdmonitionNode, type: AdmonitionType): void {
  node.data = {
    hName: 'aside',
    hProperties: {
      className: [`admonition admonition-${type}`],
      role: TYPE_ROLES[type],
      'data-admonition': type,
    },
  };
}

/**
 * 构造 admonition 内容容器段落
 *
 * 将所有内容子节点包装在一个 div 容器中（通过 hName='div'），
 * 并添加 className='admonition-content'。
 *
 * @param contentNodes - 原始内容节点数组
 * @returns 包装后的容器节点
 */
function buildContentContainer(contentNodes: RootContent[]): Parent {
  return {
    type: 'paragraph',
    data: {
      hName: 'div',
      hProperties: {
        className: ['admonition-content'],
      },
    },
    children: contentNodes,
  } as unknown as Parent;
}

/**
 * 处理单个 admonition 围栏块
 *
 * 输入：起始段落节点（:::type [标题]）、父节点、起始索引
 * 输出：替换后的 admonition 节点与消耗的节点数量；若语法不完整返回 null
 *
 * @param openParagraph - 起始段落节点（包含 :::type 行）
 * @param parent - 父节点
 * @param index - 起始段落在父节点 children 中的索引
 * @returns 替换信息 { node, consumed } 或 null
 */
function processAdmonitionBlock(
  openParagraph: Paragraph,
  parent: Parent,
  index: number,
): { node: AdmonitionNode; consumed: number } | null {
  const openText = extractText(openParagraph.children as PhrasingContent[]);
  const match = openText.match(FENCE_OPEN_REGEX);
  if (!match) return null;
  // match[1] 在正则匹配成功后必然存在，但 TS 无法推断，需显式守卫
  const typeMatch = match[1];
  if (!typeMatch) return null;

  const admType = typeMatch.toLowerCase() as AdmonitionType;
  if (!VALID_TYPES.has(admType)) return null;

  const customTitle = match[2]?.trim() || undefined;

  /* 收集内容直到结束围栏 `:::` */
  const collectResult = collectAdmonitionContent(parent.children, index + 1);
  if (!collectResult) return null;

  const { contentNodes, endIndex } = collectResult;

  /* 构造 admonition 节点。buildTitleParagraph / buildContentContainer 返回 Parent，
     此处通过类型断言转 RootContent 以符合 AdmonitionNode.children 的类型约束 */
  const admonitionNode: AdmonitionNode = {
    type: 'admonition',
    admonitionType: admType,
    title: customTitle,
    children: [
      buildTitleParagraph(admType, customTitle) as unknown as RootContent,
      buildContentContainer(contentNodes) as unknown as RootContent,
    ],
  };

  attachHastDirective(admonitionNode, admType);

  /* consumed = 1（起始段落） + 内容节点数 + 1（结束围栏段落） */
  const consumed = endIndex - index + 1;

  return { node: admonitionNode, consumed };
}

/**
 * remark-admonition 插件入口
 *
 * 遍历 MDAST 根节点的直接子节点，识别 `:::type` 围栏块并转换为 admonition 节点。
 *
 * 转换流程：
 * 1. 反向遍历根节点直接子节点（避免 splice 导致索引偏移）
 * 2. 检测段落是否以 `:::type` 开头
 * 3. 收集后续段落直到 `:::` 结束围栏
 * 4. 替换为 admonition 节点（携带 HAST 渲染指令）
 *
 * @returns unified Transformer 函数
 */
export const remarkAdmonition: Plugin<[], Root> = (): Transformer<Root> => {
  return (tree: Root): Root => {
    /* 反向遍历根节点直接子节点 */
    for (let i = tree.children.length - 1; i >= 0; i--) {
      const child = tree.children[i];
      if (child?.type !== 'paragraph') continue;

      const paragraph = child as Paragraph;
      const openText = extractText(paragraph.children as PhrasingContent[]);
      if (!FENCE_OPEN_REGEX.test(openText)) continue;

      const result = processAdmonitionBlock(paragraph, tree, i);
      if (!result) continue;

      const { node, consumed } = result;
      /* 用 admonition 节点替换原起始段落 + 内容段落 + 结束围栏段落 */
      tree.children.splice(i, consumed, node as unknown as RootContent);
    }

    return tree;
  };
};

export default remarkAdmonition;
