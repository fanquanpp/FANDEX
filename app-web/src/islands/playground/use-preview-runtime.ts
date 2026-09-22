import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildPreviewDoc, parsePreviewMessage } from './pg-frontend-runtime';
import type { ConsoleEntry, FrontendPen } from './types';

const AUTORUN_MS = 600;
const CONSOLE_LIMIT = 200;

interface UsePreviewRuntimeOptions {
  pen: FrontendPen;
}

interface UsePreviewRuntimeResult {
  previewDoc: string;
  runId: number;
  consoleEntries: ConsoleEntry[];
  setConsoleEntries: React.Dispatch<React.SetStateAction<ConsoleEntry[]>>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  handleRun: () => void;
  resetPreview: (pen: FrontendPen) => void;
}

export function usePreviewRuntime({ pen }: UsePreviewRuntimeOptions): UsePreviewRuntimeResult {
  const [previewDoc, setPreviewDoc] = useState<string>(() => buildPreviewDoc(pen));
  const [runId, setRunId] = useState(0);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const previewContent = useMemo(
    () => ({ html: pen.html, css: pen.css, js: pen.js }),
    [pen.html, pen.css, pen.js],
  );
  useEffect(() => {
    if (!pen.autoRun) return;
    const timer = setTimeout(() => {
      setPreviewDoc(buildPreviewDoc(previewContent));
      setRunId((n) => n + 1);
    }, AUTORUN_MS);
    return () => clearTimeout(timer);
  }, [previewContent, pen.autoRun]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setPreviewDoc(buildPreviewDoc(pen));
        setRunId((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pen]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const entry = parsePreviewMessage(e, iframeRef.current?.contentWindow ?? null);
      if (!entry) return;
      setConsoleEntries((prev) => [...prev.slice(-(CONSOLE_LIMIT - 1)), entry]);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleRun = useCallback(() => {
    setPreviewDoc(buildPreviewDoc(pen));
    setRunId((n) => n + 1);
  }, [pen]);

  const resetPreview = useCallback((next: FrontendPen) => {
    setPreviewDoc(buildPreviewDoc(next));
    setRunId((n) => n + 1);
    setConsoleEntries([]);
  }, []);

  return {
    previewDoc,
    runId,
    consoleEntries,
    setConsoleEntries,
    iframeRef,
    handleRun,
    resetPreview,
  };
}
