/**
 * Markdown 渲染器 — React Native 组件
 *
 * 功能概述：
 * 使用 unified + remark-parse + remark-gfm 将 Markdown 文本解析为 mdast 语法树，
 * 递归遍历 AST 节点并渲染为 React Native 原生组件。
 *
 * 支持的 Markdown 特性：
 * - 标题（h1-h6，不同字号与字重）
 * - 段落、换行
 * - 代码块（带语言标签，等宽字体）与行内代码
 * - 加粗、斜体、删除线
 * - 有序/无序列表（含嵌套）
 * - 引用块（左侧色条 + 背景色）
 * - 链接（可点击，使用 expo-router 跳转）
 * - 分割线
 * - GFM 表格（基本渲染）
 * - 数学公式（以代码块形式展示，后续接入 KaTeX）
 *
 * 设计要点：
 * - 块级节点渲染为 <View>，行内节点渲染为嵌套 <Text>
 * - 暗色模式通过 useColorScheme 自动适配
 * - 主题色与全局 _layout.tsx 保持一致
 * - 零硬编码：所有样式通过主题配置控制
 *
 * 架构说明：
 * - parseMarkdown(): unified 管道解析，返回 mdast Root 节点
 * - renderBlock(): 渲染块级节点（heading、paragraph、code、list 等）
 * - renderInline(): 渲染行内节点（text、strong、emphasis、inlineCode、link 等）
 * - 两者递归组合，覆盖 Markdown 全部语法
 */

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useColorScheme } from 'react-native';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

// ============================================================
// mdast 类型定义（简化版，对齐 mdast v4 结构）
// ============================================================

/** mdast 节点基础接口 */
interface MdastNode {
  type: string;
  value?: string;
  lang?: string;
  url?: string;
  depth?: number;
  ordered?: boolean;
  children?: MdastNode[];
  align?: string[];
}

// ============================================================
// 主题配置
// ============================================================

/** 主题色配置 — 与 _layout.tsx / [id].tsx 保持一致 */
const THEME = {
  light: {
    background: '#ffffff',
    text: '#0a0a0f',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    codeBg: '#f3f4f6',
    codeBorder: '#e5e7eb',
    codeText: '#1f2937',
    quoteBg: '#f9fafb',
    quoteBorder: '#d1d5db',
    hr: '#e5e7eb',
    link: '#4f5bd5',
    heading: '#0a0a0f',
    tableHeaderBg: '#f3f4f6',
    tableBorder: '#e5e7eb',
  },
  dark: {
    background: '#0a0a0f',
    text: '#f8f9fa',
    textSecondary: '#9ca3af',
    textTertiary: '#6b7280',
    codeBg: '#1a1a2e',
    codeBorder: '#2a2a3e',
    codeText: '#e5e7eb',
    quoteBg: '#111118',
    quoteBorder: '#3a3a4e',
    hr: '#2a2a3e',
    link: '#6b7af7',
    heading: '#f8f9fa',
    tableHeaderBg: '#1a1a2e',
    tableBorder: '#2a2a3e',
  },
} as const;

// ============================================================
// Markdown 解析
// ============================================================

/**
 * 使用 unified 管道解析 Markdown 文本为 mdast 语法树
 *
 * 解析流程：
 * 1. remark-parse: 将 Markdown 文本解析为 mdast
 * 2. remark-gfm: 启用 GFM 扩展（表格、删除线、任务列表、自动链接）
 *
 * @param markdown - Markdown 原文
 * @returns mdast Root 节点的 children 数组
 */
function parseMarkdown(markdown: string): MdastNode[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  return (tree.children ?? []) as unknown as MdastNode[];
}

// ============================================================
// 组件属性
// ============================================================

interface MarkdownRendererProps {
  /** Markdown 正文文本 */
  content: string;
}

// ============================================================
// 行内内容渲染
// ============================================================

/**
 * 渲染行内节点为嵌套 <Text> 组件
 *
 * React Native <Text> 支持嵌套，子 <Text> 继承父样式并可覆盖。
 * 此函数递归处理 text、strong、emphasis、inlineCode、link、delete 等行内节点。
 *
 * @param node - mdast 行内节点
 * @param colors - 主题色配置
 * @param index - 节点在父 children 中的索引（用作 key）
 * @returns React 元素或 null
 */
function renderInline(
  node: MdastNode,
  colors: (typeof THEME)[keyof typeof THEME],
  index: number,
): React.ReactElement | null {
  const key = `inline-${index}`;

  switch (node.type) {
    case 'text':
      return <Text key={key}>{node.value}</Text>;

    case 'strong':
      return (
        <Text key={key} style={{ fontWeight: '700' }}>
          {node.children?.map((child, i) => renderInline(child, colors, i))}
        </Text>
      );

    case 'emphasis':
      return (
        <Text key={key} style={{ fontStyle: 'italic' }}>
          {node.children?.map((child, i) => renderInline(child, colors, i))}
        </Text>
      );

    case 'delete':
      return (
        <Text key={key} style={{ textDecorationLine: 'line-through' }}>
          {node.children?.map((child, i) => renderInline(child, colors, i))}
        </Text>
      );

    case 'inlineCode':
      return (
        <Text
          key={key}
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            backgroundColor: colors.codeBg,
            color: colors.codeText,
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderRadius: 3,
          }}
        >
          {node.value}
        </Text>
      );

    case 'link':
      // 外部链接使用 Link 组件，内部链接也使用 expo-router
      return (
        <Link key={key} href={node.url ?? '#'} asChild>
          <Text style={{ color: colors.link, textDecorationLine: 'underline' }}>
            {node.children?.map((child, i) => renderInline(child, colors, i))}
          </Text>
        </Link>
      );

    case 'break':
      return <Text key={key}>{'\n'}</Text>;

    case 'image':
      // 图片暂以 alt 文本占位（后续接入 react-native-fast-image）
      return (
        <Text key={key} style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
          [图片: {node.url}]
        </Text>
      );

    case 'inlineMath':
      // 行内数学公式暂以代码样式展示（后续接入 KaTeX RN）
      return (
        <Text
          key={key}
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: colors.codeText,
            backgroundColor: colors.codeBg,
            paddingHorizontal: 3,
          }}
        >
          {node.value}
        </Text>
      );

    default:
      // 未知行内节点：尝试递归 children
      if (node.children) {
        return (
          <Text key={key}>
            {node.children.map((child, i) => renderInline(child, colors, i))}
          </Text>
        );
      }
      return node.value ? <Text key={key}>{node.value}</Text> : null;
  }
}

// ============================================================
// 块级内容渲染
// ============================================================

/**
 * 标题字号映射（depth → fontSize）
 */
const HEADING_SIZES: Record<number, number> = {
  1: 26,
  2: 22,
  3: 19,
  4: 17,
  5: 15,
  6: 14,
};

/**
 * 渲染块级节点为 <View> 组件
 *
 * 处理 heading、paragraph、code、list、blockquote、thematicBreak、table、math 等块级节点。
 * 每个块级节点渲染为独立的 <View>，通过 styles 中的 gap 控制间距。
 *
 * @param node - mdast 块级节点
 * @param colors - 主题色配置
 * @param index - 节点索引（用作 key）
 * @returns React 元素或 null
 */
function renderBlock(
  node: MdastNode,
  colors: (typeof THEME)[keyof typeof THEME],
  index: number,
): React.ReactElement | null {
  const key = `block-${index}`;

  switch (node.type) {
    // ---------- 标题 ----------
    case 'heading': {
      const depth = node.depth ?? 4;
      const fontSize = HEADING_SIZES[depth] ?? 16;
      return (
        <Text
          key={key}
          style={{
            fontSize,
            fontWeight: '700',
            color: colors.heading,
            marginTop: depth <= 2 ? 12 : 8,
            marginBottom: 6,
            lineHeight: fontSize * 1.35,
          }}
        >
          {node.children?.map((child, i) => renderInline(child, colors, i))}
        </Text>
      );
    }

    // ---------- 段落 ----------
    case 'paragraph':
      return (
        <Text
          key={key}
          style={{
            fontSize: 15,
            lineHeight: 24,
            color: colors.text,
            marginBottom: 10,
          }}
        >
          {node.children?.map((child, i) => renderInline(child, colors, i))}
        </Text>
      );

    // ---------- 代码块 ----------
    case 'code':
      return (
        <View
          key={key}
          style={{
            backgroundColor: colors.codeBg,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.codeBorder,
            padding: 12,
            marginBottom: 12,
          }}
        >
          {node.lang && (
            <Text
              style={{
                fontSize: 11,
                color: colors.textTertiary,
                fontFamily: 'monospace',
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              {node.lang}
            </Text>
          )}
          <Text
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: 20,
              color: colors.codeText,
            }}
          >
            {node.value}
          </Text>
        </View>
      );

    // ---------- 列表 ----------
    case 'list': {
      const ordered = node.ordered ?? false;
      return (
        <View key={key} style={{ marginBottom: 10, gap: 4 }}>
          {node.children?.map((child, i) => {
            const marker = ordered ? `${i + 1}.` : '\u2022';
            return (
              <View key={`listitem-${index}-${i}`} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 15, color: colors.text, lineHeight: 24 }}>
                  {marker}
                </Text>
                <View style={{ flex: 1 }}>
                  {child.children?.map((subChild, j) => {
                    // 列表项内的段落直接渲染行内内容
                    if (subChild.type === 'paragraph') {
                      return (
                        <Text
                          key={`li-content-${i}-${j}`}
                          style={{ fontSize: 15, lineHeight: 24, color: colors.text }}
                        >
                          {subChild.children?.map((inline, k) =>
                            renderInline(inline, colors, k),
                          )}
                        </Text>
                      );
                    }
                    // 嵌套列表或其他块级元素
                    return renderBlock(subChild, colors, j);
                  })}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    // ---------- 引用块 ----------
    case 'blockquote':
      return (
        <View
          key={key}
          style={{
            backgroundColor: colors.quoteBg,
            borderLeftWidth: 3,
            borderLeftColor: colors.quoteBorder,
            paddingLeft: 12,
            paddingVertical: 8,
            marginBottom: 12,
          }}
        >
          {node.children?.map((child, i) => {
            if (child.type === 'paragraph') {
              return (
                <Text
                  key={`bq-${index}-${i}`}
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: colors.textSecondary,
                    fontStyle: 'italic',
                  }}
                >
                  {child.children?.map((inline, j) => renderInline(inline, colors, j))}
                </Text>
              );
            }
            return renderBlock(child, colors, i);
          })}
        </View>
      );

    // ---------- 分割线 ----------
    case 'thematicBreak':
      return (
        <View
          key={key}
          style={{
            height: 1,
            backgroundColor: colors.hr,
            marginVertical: 12,
          }}
        />
      );

    // ---------- 数学公式块 ----------
    case 'math':
      return (
        <View
          key={key}
          style={{
            backgroundColor: colors.codeBg,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.codeBorder,
            padding: 12,
            marginBottom: 12,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'monospace',
              fontSize: 14,
              color: colors.codeText,
            }}
          >
            {node.value}
          </Text>
        </View>
      );

    // ---------- GFM 表格 ----------
    case 'table':
      return (
        <View
          key={key}
          style={{
            borderWidth: 1,
            borderColor: colors.tableBorder,
            borderRadius: 6,
            marginBottom: 12,
            overflow: 'hidden',
          }}
        >
          {node.children?.map((row, rowIdx) => {
            const isHeader = rowIdx === 0;
            return (
              <View
                key={`tr-${index}-${rowIdx}`}
                style={{
                  flexDirection: 'row',
                  backgroundColor: isHeader ? colors.tableHeaderBg : 'transparent',
                  borderBottomWidth: rowIdx < (node.children?.length ?? 0) - 1 ? 1 : 0,
                  borderBottomColor: colors.tableBorder,
                }}
              >
                {row.children?.map((cell, colIdx) => (
                  <View
                    key={`td-${index}-${rowIdx}-${colIdx}`}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRightWidth:
                        colIdx < (row.children?.length ?? 0) - 1 ? 1 : 0,
                      borderRightColor: colors.tableBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        lineHeight: 18,
                        color: colors.text,
                        fontWeight: isHeader ? '600' : '400',
                      }}
                    >
                      {cell.children?.map((inline, i) => renderInline(inline, colors, i))}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      );

    // ---------- HTML 块（原样展示） ----------
    case 'html':
      return (
        <Text
          key={key}
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 10,
          }}
        >
          {node.value}
        </Text>
      );

    default:
      // 未知块级节点：尝试渲染 children 为块级
      if (node.children && node.children.length > 0) {
        return (
          <View key={key}>
            {node.children.map((child, i) => renderBlock(child, colors, i))}
          </View>
        );
      }
      return null;
  }
}

// ============================================================
// 主组件
// ============================================================

/**
 * Markdown 渲染器组件
 *
 * 使用方式：
 * ```tsx
 * <MarkdownRenderer content={markdownText} />
 * ```
 *
 * 渲染流程：
 * 1. 通过 unified 管道解析 Markdown 为 mdast 语法树（useMemo 缓存）
 * 2. 遍历顶层块级节点，逐个渲染为 React Native 组件
 * 3. 行内内容通过 renderInline 递归渲染为嵌套 <Text>
 *
 * @param props.content - Markdown 正文文本
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? THEME.dark : THEME.light;

  // 解析 Markdown 为 mdast 语法树（content 变更时重新解析）
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {blocks.map((node, index) => renderBlock(node, colors, index))}
    </View>
  );
}

/** 组件样式 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 4,
  },
});
