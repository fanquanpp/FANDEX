/**
 * CodeMirrorBox 懒加载包装
 * -----------------------------------------------------------------------------
 * CodeMirror 全家桶体积较大（视图/命令/语言/搜索数个包），
 * 通过 React.lazy 把它切分为独立 chunk：工具栏与布局先水合可交互，
 * 编辑器内核在空闲时按需载入，缩短工作台首帧可交互时间。
 * Suspense 兜底 UI 与面板底色一致，加载中不产生布局跳动。
 */
import { lazy, Suspense, type ComponentProps } from 'react';

const CodeMirrorBox = lazy(() => import('./CodeMirrorBox'));

/** 编辑器内核加载占位：与 pane-body 同底色的静默骨架 */
function EditorFallback() {
  return <div className="pg-cm-fallback" aria-hidden="true" />;
}

/** 透传 props 的懒加载包装（与 CodeMirrorBox props 完全一致） */
export default function CodeMirrorBoxLoader(props: ComponentProps<typeof CodeMirrorBox>) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <CodeMirrorBox {...props} />
    </Suspense>
  );
}
