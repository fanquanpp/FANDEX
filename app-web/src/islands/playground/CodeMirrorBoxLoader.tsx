import { lazy, Suspense, type ComponentProps } from 'react';

const CodeMirrorBox = lazy(() => import('./CodeMirrorBox'));

function EditorFallback() {
  return <div className="pg-cm-fallback" aria-hidden="true" />;
}

export default function CodeMirrorBoxLoader(props: ComponentProps<typeof CodeMirrorBox>) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <CodeMirrorBox {...props} />
    </Suspense>
  );
}
