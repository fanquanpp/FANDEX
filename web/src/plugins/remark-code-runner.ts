/**
 * 代码运行器 Markdown 解析插件（remark 插件）
 *
 * 功能概述：
 * 遍历 Markdown AST 中的 code 节点，检测 lang 字段是否包含 `runnable` 标记
 * （如 `python runnable`、`js runnable`），将符合条件的代码块替换为带
 * data 属性的容器 div，供客户端脚本扫描并动态挂载 CodeRunner Vue 组件。
 *
 * 设计原则：
 * - 不破坏 Shiki 代码高亮：仅处理带 runnable 标记的代码块，普通代码块不受影响
 * - 安全转义：代码内容通过 encodeURIComponent 编码，避免 HTML 注入风险
 * - 类型严格：使用 mdast 类型定义，无 any/unknown
 *
 * 标记格式：
 *   ```python runnable
 *   print("hello")
 *   ```
 *   ```js runnable
 *   console.log("hello")
 *   ```
 *
 * 输出 HTML 结构：
 *   <div data-code-runner data-lang="python" data-editable="true"
 *        data-code="print(%22hello%22)">
 *   </div>
 *
 * 客户端扫描：
 *   src/lib/code-runner-mount.ts 会扫描 [data-code-runner] 元素，
 *   使用 Vue createApp 动态挂载 CodeRunner.vue 组件
 */

import { visit } from 'unist-util-visit';
import type { Root, Code, Html } from 'mdast';

/** 支持运行的语言白名单（与 CodeLanguage 类型对齐） */
const RUNNABLE_LANGUAGES = new Set([
  'javascript',
  'js',
  'typescript',
  'ts',
  'python',
  'py',
  'cpp',
  'c++',
  'c',
  'go',
]);

/** 语言别名映射：归一化为 CodeLanguage 类型 */
const LANG_ALIAS: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  'c++': 'cpp',
};

/** markdown 语言标记中的 runnable 关键字 */
const RUNNABLE_MARKER = 'runnable';

/**
 * 将 markdown 语言标识归一化为 CodeLanguage
 * @param lang - markdown 中的 lang 字段（如 'js'、'python'）
 * @returns 归一化后的语言字符串，或 null 表示不支持
 */
function normalizeLang(lang: string): string | null {
  const lower = lang.toLowerCase();
  if (RUNNABLE_LANGUAGES.has(lower)) {
    return LANG_ALIAS[lower] ?? lower;
  }
  return null;
}

/**
 * 对代码内容进行 URL 编码，确保安全嵌入 data 属性
 * 使用 encodeURIComponent 处理所有特殊字符（<, >, &, ", ' 等）
 * @param code - 原始代码字符串
 * @returns URL 编码后的字符串
 */
function encodeCode(code: string): string {
  return encodeURIComponent(code);
}

/**
 * 构建 CodeRunner 容器的 HTML 字符串
 * @param lang - 归一化后的语言
 * @param code - 原始代码内容
 * @param editable - 是否允许编辑
 * @returns HTML 字符串
 */
function buildRunnerHtml(lang: string, code: string, editable: boolean): string {
  const encodedCode = encodeCode(code);
  const editableAttr = editable ? 'true' : 'false';
  // 使用 data 属性传递配置，客户端脚本通过 dataset 读取
  return `<div data-code-runner data-lang="${lang}" data-editable="${editableAttr}" data-code="${encodedCode}"></div>`;
}

/**
 * remark-code-runner 插件工厂函数
 *
 * 核心执行流程：
 *   1. 遍历 MDAST 中所有 code 节点
 *   2. 解析 lang 字段，检测是否包含 `runnable` 标记
 *   3. 若包含且语言在白名单内，将 code 节点替换为 html 节点
 *   4. html 节点内容为带 data 属性的容器 div
 *
 * @returns remark 插件函数
 */
export function remarkCodeRunner() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      // 跳过无父节点或无索引的节点（理论上不会发生，TS 类型保护）
      if (!parent || typeof index !== 'number') return;

      // 解析 lang 字段：格式为 `lang runnable`（空格分隔多个标记）
      const rawLang = node.lang || '';
      const parts = rawLang.split(/\s+/).filter((part) => part.length > 0);

      // 检测是否包含 runnable 标记
      if (!parts.includes(RUNNABLE_MARKER)) return;

      // 提取实际语言（runnable 之前的部分）
      const langPart = parts.find((part) => part !== RUNNABLE_MARKER);
      if (!langPart) return;

      // 归一化语言并校验白名单
      const normalizedLang = normalizeLang(langPart);
      if (!normalizedLang) return;

      // 构建替换的 html 节点
      // mdast 的 html 节点会被 Astro 原样输出到最终 HTML
      const htmlContent = buildRunnerHtml(normalizedLang, node.value, true);
      const htmlNode: Html = {
        type: 'html',
        value: htmlContent,
      };

      // 用 html 节点替换原 code 节点
      parent.children.splice(index, 1, htmlNode);
    });
  };
}
