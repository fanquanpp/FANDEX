
import type { ConsoleEntry, FrontendPen } from './types';

const MAX_LOG_TEXT = 2000;
const BRIDGE_SOURCE = 'fandex-preview';

function escapeCloser(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script').replace(/<\/style/gi, '<\\/style');
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const CONSOLE_BRIDGE = `
<script>
(function () {
  var fmt = function (v) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return v;
    if (typeof v === 'function') return '[Function ' + (v.name || 'anonymous') + ']';
    if (typeof v === 'object') {
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    }
    return String(v);
  };
  var send = function (kind, parts) {
    var text = parts.map(fmt).join(' ').slice(0, 2000);
    try {
      parent.postMessage({ source: 'fandex-preview', kind: kind, text: text }, '*');
    } catch (e) { /* 忽略桥接失败 */ }
  };
  ['log', 'info', 'warn', 'error'].forEach(function (k) {
    var original = console[k];
    console[k] = function () {
      send(k, Array.prototype.slice.call(arguments));
      if (original) original.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (e) {
    var line = e.lineno ? ' (行 ' + e.lineno + ')' : '';
    send('error', [e.message + line]);
  });
  window.addEventListener('unhandledrejection', function (e) {
    send('error', ['未处理的 Promise 拒绝: ' + fmt(e.reason)]);
  });
})();
<\/script>`;

export function buildPreviewDoc(pen: Pick<FrontendPen, 'html' | 'css' | 'js'>): string {
  const css = escapeCloser(pen.css);
  const js = escapeCloser(pen.js);
  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<style>',
    css,
    '</style>',
    '</head>',
    '<body>',
    // 桥接脚本必须先于用户 HTML 注入，否则用户内联 <script> 的早期日志与报错无法捕获
    CONSOLE_BRIDGE,
    pen.html,
    '<script>',
    js,
    '<\/script>',
    '</body>',
    '</html>',
  ].join('\n');
}

let consoleEntrySeq = 0;

export function parsePreviewMessage(
  event: MessageEvent,
  source: Window | null,
): ConsoleEntry | null {
  if (!source || event.source !== source) return null;
  const data = event.data as { source?: unknown; kind?: unknown; text?: unknown };
  if (!data || data.source !== BRIDGE_SOURCE) return null;
  const kind = data.kind;
  if (kind !== 'log' && kind !== 'info' && kind !== 'warn' && kind !== 'error') return null;
  const text = typeof data.text === 'string' ? data.text.slice(0, MAX_LOG_TEXT) : '';
  consoleEntrySeq += 1;
  return { kind, text, time: Date.now(), id: consoleEntrySeq };
}

export function estimatePenBytes(pen: FrontendPen): number {
  const payload = `${pen.title}\n${pen.html}\n${pen.css}\n${pen.js}`;
  return new TextEncoder().encode(payload).length;
}

export { formatValue };
