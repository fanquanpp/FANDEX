
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
import { java, csharp, kotlin } from '@codemirror/legacy-modes/mode/clike';
import { go } from '@codemirror/legacy-modes/mode/go';
import { rust } from '@codemirror/legacy-modes/mode/rust';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { standardSQL } from '@codemirror/legacy-modes/mode/sql';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { tags } from '@lezer/highlight';

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

export interface CodeMirrorBoxProps {
  value: string;
  onChange: (value: string) => void;
  language: EditorLanguage;
  ariaLabel?: string;
}

function languageSupport(language: EditorLanguage) {
  switch (language) {
    case 'html':
      return html();
    case 'css':
      return css();
    case 'typescript':
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

const fandexEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      fontSize: '13px',
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
      // 插入符保持浏览器原生渲染（不指定粗细与色彩）
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

export function CodeMirrorBox({ value, onChange, language, ariaLabel }: CodeMirrorBoxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useMemo(() => new Compartment(), []);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

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
