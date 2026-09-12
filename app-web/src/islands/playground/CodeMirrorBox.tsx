/**
 * CodeMirror 6 编辑器封装组件
 *
 * 功能概述：
 *   - 基于 CodeMirror 6 的轻量编辑器，支持 HTML/CSS/JS/TS/Python/C/C++ 语法高亮
 *   - 自定义 FANDEX 主题：颜色全部引用设计令牌变量，随亮/暗主题自动切换
 *   - 受控 value 设计：外部更新且内容不一致时替换文档，输入过程中不打断光标
 *
 * 性能设计：
 *   - 编辑器实例仅创建一次，语言切换通过 Compartment 重配置，不重建 DOM
 *   - 文档同步使用 diff 式替换，避免高频全量 setState 造成卡顿
 */

import { useEffect, useMemo, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { StreamLanguage } from '@codemirror/language';
// legacy-modes 提供多语言流式高亮（Java/Go/Rust/C#/Kotlin/Lua/SQL/Shell 等），
// 无需为每种语言引入完整解析器，保持打包体积可控
import { java, csharp, kotlin } from '@codemirror/legacy-modes/mode/clike';
import { go } from '@codemirror/legacy-modes/mode/go';
import { rust } from '@codemirror/legacy-modes/mode/rust';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { standardSQL } from '@codemirror/legacy-modes/mode/sql';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { tags } from '@lezer/highlight';

/** 编辑器支持的语言类型 */
export type EditorLanguage =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'c'
  | 'cpp'
  | 'java'
  | 'kotlin'
  | 'go'
  | 'rust'
  | 'csharp'
  | 'lua'
  | 'sql'
  | 'shell';

/** 组件 Props */
export interface CodeMirrorBoxProps {
  /** 当前文档内容 */
  value: string;
  /** 内容变化回调 */
  onChange: (value: string) => void;
  /** 语法语言 */
  language: EditorLanguage;
  /** 无障碍标签 */
  ariaLabel?: string;
}

/**
 * 语言扩展工厂：将业务语言映射为 CodeMirror LanguageSupport
 * @param language - 业务语言标识
 */
function languageSupport(language: EditorLanguage) {
  switch (language) {
    case 'html':
      return html();
    case 'css':
      return css();
    case 'typescript':
      // 浏览器内不做类型检查，但语法高亮按 TS 处理
      return javascript({ typescript: true });
    case 'python':
      return python();
    case 'c':
    case 'cpp':
      return cpp();
    case 'java':
      return StreamLanguage.define(java);
    case 'kotlin':
      return StreamLanguage.define(kotlin);
    case 'go':
      return StreamLanguage.define(go);
    case 'rust':
      return StreamLanguage.define(rust);
    case 'csharp':
      return StreamLanguage.define(csharp);
    case 'lua':
      return StreamLanguage.define(lua);
    case 'sql':
      return StreamLanguage.define(standardSQL);
    case 'shell':
      return StreamLanguage.define(shell);
    case 'javascript':
    default:
      return javascript();
  }
}

/**
 * FANDEX 编辑器主题
 * 所有颜色引用设计令牌，亮/暗主题由全局 CSS 变量驱动
 */
const fandexEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      fontSize: '13px',
      // 编辑器背景使用代码块专用令牌；浅色模式下比普通凹陷背景更深，保证文字可读
      backgroundColor: 'var(--cm-bg, var(--color-bg-code, var(--color-bg-sunken)))',
      color: 'var(--color-fg-primary)',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-family-code)',
      lineHeight: '1.65',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: '10px 0',
      caretColor: 'var(--color-accent-base)',
    },
    '.cm-line': {
      padding: '0 12px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--cm-bg, var(--color-bg-code, var(--color-bg-sunken)))',
      color: 'var(--color-text-tertiary)',
      border: 'none',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '34px',
      padding: '0 8px 0 6px',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--color-bg-hover)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-bg-hover)',
      color: 'var(--color-text-secondary)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      // 选中态使用中性色，避免彩色遮罩干扰代码类型识别
      backgroundColor: 'var(--cm-selection-bg, rgba(125, 135, 150, 0.28))',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--color-accent-base)',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'var(--color-primary-100)',
      outline: '1px solid var(--color-primary-400)',
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--color-fg-primary)',
      boxShadow: 'var(--shadow-md)',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: 'var(--color-bg-hover)',
      color: 'var(--color-fg-primary)',
    },
    '.cm-foldGutter .cm-gutterElement': {
      color: 'var(--color-text-tertiary)',
    },
    '.cm-placeholder': {
      color: 'var(--color-text-tertiary)',
    },
  },
  { dark: false },
);

/**
 * FANDEX 语法高亮样式
 * 复用全局代码令牌变量，保证与站点代码块视觉一致
 */
const fandexHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--fandex-color-code-keyword)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--fandex-color-code-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--fandex-color-code-number)' },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.definition(tags.variableName)],
    color: 'var(--fandex-color-code-function)',
  },
  { tag: [tags.variableName, tags.propertyName, tags.definition(tags.propertyName)], color: 'var(--fandex-color-code-variable)' },
  { tag: tags.comment, color: 'var(--color-text-tertiary)', fontStyle: 'italic' },
  { tag: tags.operator, color: 'var(--color-fg-primary)' },
  { tag: tags.punctuation, color: 'var(--color-text-secondary)' },
  { tag: [tags.typeName, tags.className], color: 'var(--fandex-color-code-function)' },
  { tag: tags.tagName, color: 'var(--fandex-color-code-keyword)' },
  { tag: tags.attributeName, color: 'var(--fandex-color-code-function)' },
  { tag: tags.link, color: 'var(--color-accent-base)' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.heading, fontWeight: 'bold', color: 'var(--fandex-color-code-function)' },
]);

/**
 * CodeMirror 编辑器组件
 * 受控组件：value 由外部维护，onChange 即时回传
 */
export function CodeMirrorBox({ value, onChange, language, ariaLabel }: CodeMirrorBoxProps) {
  /** 容器 DOM 引用 */
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** 编辑器视图实例（仅创建一次） */
  const viewRef = useRef<EditorView | null>(null);
  /** 语言扩展隔间（用于热切换语言而不重建编辑器） */
  const languageCompartment = useMemo(() => new Compartment(), []);
  /** onChange 最新引用（避免重建编辑器实例） */
  const onChangeRef = useRef(onChange);

  // 保持 onChange 引用最新，供 updateListener 闭包读取
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 创建编辑器实例（仅挂载一次）
  useEffect(() => {
    if (!containerRef.current || viewRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        languageCompartment.of(languageSupport(language)),
        syntaxHighlighting(fandexHighlightStyle),
        fandexEditorTheme,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // 组件挂载时只执行一次，后续语言/内容变化通过独立 effect 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部 value 变化时同步文档（仅在内容不一致时替换，避免打断输入）
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  // 语言切换时通过 Compartment 重配置
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: languageCompartment.reconfigure(languageSupport(language)),
    });
  }, [language, languageCompartment]);

  return <div className="pg-cm-box" ref={containerRef} aria-label={ariaLabel} role="textbox" />;
}

export default CodeMirrorBox;
