/**
 * 前端实验运行时：预览文档构建与控制台桥接
 *
 * 功能概述：
 *   - 将用户 HTML/CSS/JS 拼装为沙箱 iframe 的 srcdoc 文档
 *   - 注入控制台桥接脚本：捕获 console 与未处理错误，通过 postMessage 回传主页面
 *   - 提供消息校验，仅接受来自当前预览 iframe 的日志消息
 *
 * 安全设计：
 *   - iframe 使用 sandbox 属性，无 allow-same-origin，预览运行在独立不透明源
 *   - 用户代码中的 `</script>` 与 `</style>` 序列被转义，防止提前闭合注入脚本
 *   - 日志文本长度受限，避免超大对象拖垮主线程
 */

import type { ConsoleEntry, FrontendPen } from './types';

/** 预览日志单条文本最大长度（字符） */
const MAX_LOG_TEXT = 2000;
/** 预览桥接消息标识 */
const BRIDGE_SOURCE = 'fandex-preview';

/**
 * 转义可能提前闭合 <script>/<style> 的序列
 * srcdoc 内容由 iframe 内部解析，用户代码中的闭合标签会中断注入脚本
 * @param code - 用户代码
 * @returns 转义后的安全文本
 */
function escapeCloser(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script').replace(/<\/style/gi, '<\\/style');
}

/**
 * 将任意值格式化为可读文本（桥接脚本与主页面共用逻辑的简化版）
 * @param value - 待格式化值
 * @returns 文本表示
 */
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

/**
 * 控制台桥接脚本（注入预览文档）
 * 捕获 console.log/info/warn/error、window error 与未处理 Promise 拒绝，
 * 统一以 { source, kind, text } 消息发送给父页面
 */
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

/**
 * 构建预览 iframe 的 srcdoc 文档
 * 结构：HTML 头部放入用户 CSS，body 放入用户 HTML，末尾注入桥接脚本与用户 JS
 * 签名接受最小接口：编辑器作品与灵感画廊成品都可直接传入
 * @param pen - 含 html/css/js 三段源码的对象
 * @returns 完整 HTML 文档字符串
 */
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
    pen.html,
    CONSOLE_BRIDGE,
    '<script>',
    js,
    '<\/script>',
    '</body>',
    '</html>',
  ].join('\n');
}

/**
 * 校验并解析来自预览 iframe 的日志消息
 * @param event - MessageEvent
 * @param source - 当前预览 iframe 的 contentWindow
 * @returns 解析成功的日志条目；无效消息返回 null
 */
export function parsePreviewMessage(
  event: MessageEvent,
  source: Window | null,
): ConsoleEntry | null {
  // 仅接受来自当前预览 iframe 的消息
  if (!source || event.source !== source) return null;
  const data = event.data as { source?: unknown; kind?: unknown; text?: unknown };
  if (!data || data.source !== BRIDGE_SOURCE) return null;
  const kind = data.kind;
  if (kind !== 'log' && kind !== 'info' && kind !== 'warn' && kind !== 'error') return null;
  const text = typeof data.text === 'string' ? data.text.slice(0, MAX_LOG_TEXT) : '';
  return { kind, text, time: Date.now() };
}

/**
 * 获取当前作品内容的字节估算（用于存储占用提示）
 * @param pen - 前端实验作品
 * @returns UTF-8 字节数
 */
export function estimatePenBytes(pen: FrontendPen): number {
  const payload = `${pen.title}\n${pen.html}\n${pen.css}\n${pen.js}`;
  return new TextEncoder().encode(payload).length;
}

/** 格式化日志文本（供控制台展示复用） */
export { formatValue };
