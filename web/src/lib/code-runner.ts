/**
 * 代码运行器
 * 使用 iframe sandbox 模式安全执行用户提供的 JS/TS 代码
 *
 * 安全设计：
 * - iframe 设置 sandbox="allow-scripts"（不含 allow-same-origin），用户代码运行在跨域沙箱中
 * - 沙箱内的 window.parent 仅可访问 postMessage，无法访问父窗口 DOM、cookie、storage
 * - 用户代码通过 postMessage 与主窗口通信，console 输出与异常均通过此通道上报
 * - 超时时间从 `RUNTIME.codeRunnerTimeoutMs` 读取（默认 5000ms），可通过环境变量 PUBLIC_CODE_RUNNER_TIMEOUT 覆盖
 *
 * 通信协议：
 * - 主窗口 -> iframe: { type: 'run', code: string }
 * - iframe -> 主窗口: { type: 'log' | 'error' | 'done', payload: ... }
 */
import { RUNTIME } from '@/config/runtime';

/** 运行按钮 SVG 图标 */
const SVG_PLAY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>运行`;

/** 运行中 SVG 图标（旋转动画） */
const SVG_LOADING = `<svg width="14" height="14" viewBox="0 0 24 24" style="animation:code-run-spin 1s linear infinite"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4" stroke-dashoffset="10"/></svg>运行中`;

/** 默认执行超时时间（毫秒），从集中配置读取 */
const DEFAULT_TIMEOUT_MS = RUNTIME.codeRunnerTimeoutMs;

/** 沙箱 iframe 注入的 HTML 模板（含 console 重写与 postMessage 通信） */
const SANDBOX_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>code-sandbox</title></head>
<body>
<script>
(function() {
  // 通信通道标识，用于校验消息来源
  var CHANNEL = 'fandex-code-runner';

  // 重写 console 方法，通过 postMessage 上报到主窗口
  var methods = ['log', 'info', 'warn', 'error'];
  methods.forEach(function(level) {
    var original = console[level];
    console[level] = function() {
      var args = Array.prototype.slice.call(arguments);
      var text = args.map(function(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
        }
        return String(arg);
      }).join(' ');
      try {
        parent.postMessage({ source: CHANNEL, type: 'log', level: level, text: text }, '*');
      } catch (e) { /* ignore */ }
      if (original) {
        try { original.apply(console, args); } catch (e) { /* ignore */ }
      }
    };
  });

  // 监听主窗口的运行指令
  window.addEventListener('message', function(event) {
    var data = event.data || {};
    if (data.source !== CHANNEL || data.type !== 'run') return;
    try {
      // 使用 Function 构造器执行用户代码（不污染沙箱全局作用域过深）
      var fn = new Function(data.code);
      var result = fn();
      // 处理返回值为 Promise 的情况
      if (result && typeof result.then === 'function') {
        result.then(function(v) {
          parent.postMessage({ source: CHANNEL, type: 'done', result: v === undefined ? '' : String(v) }, '*');
        }, function(err) {
          parent.postMessage({ source: CHANNEL, type: 'error', error: err && err.message ? err.message : String(err) }, '*');
        });
      } else {
        parent.postMessage({ source: CHANNEL, type: 'done', result: result === undefined ? '' : String(result) }, '*');
      }
    } catch (err) {
      parent.postMessage({ source: CHANNEL, type: 'error', error: err && err.message ? err.message : String(err) }, '*');
    }
  });

  // 通知主窗口沙箱已就绪
  parent.postMessage({ source: CHANNEL, type: 'ready' }, '*');
})();
</script>
</body>
</html>`;

/** 通信通道标识，需与沙箱内保持一致 */
const CHANNEL = 'fandex-code-runner';

/** 控制台日志级别 */
type LogLevel = 'log' | 'info' | 'warn' | 'error';

/** 沙箱上报的日志条目 */
interface SandboxLog {
  level: LogLevel;
  text: string;
}

/**
 * 在沙箱 iframe 中执行用户代码，并通过 postMessage 收集日志与结果
 * @param code - 待执行的用户代码字符串
 * @param timeoutMs - 超时时间（毫秒），默认取自 `RUNTIME.codeRunnerTimeoutMs`
 * @returns 执行结果：包含日志数组、可能的错误信息与是否超时标志
 */
export function runCodeInSandbox(
  code: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<{ logs: SandboxLog[]; error: string | null; timedOut: boolean }> {
  return new Promise((resolve) => {
    const logs: SandboxLog[] = [];
    let settled = false;
    let timeoutHandle: number | undefined;
    let messageHandler: ((event: MessageEvent) => void) | null = null;

    /** 清理资源：移除 iframe 与消息监听器 */
    function cleanup() {
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }
      if (messageHandler) {
        window.removeEventListener('message', messageHandler);
        messageHandler = null;
      }
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }

    /** 安全 resolve：避免重复回调 */
    function safeResolve(result: { logs: SandboxLog[]; error: string | null; timedOut: boolean }) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    }

    // 创建沙箱 iframe：sandbox 仅允许 scripts，不允许 same-origin
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    iframe.srcdoc = SANDBOX_HTML;

    // 监听沙箱消息
    messageHandler = (event: MessageEvent) => {
      const data = event.data as {
        source?: string;
        type?: string;
        level?: LogLevel;
        text?: string;
        error?: string;
        result?: string;
      };
      if (!data || data.source !== CHANNEL) return;

      if (data.type === 'log' && data.level && typeof data.text === 'string') {
        logs.push({ level: data.level, text: data.text });
      } else if (data.type === 'error' && typeof data.error === 'string') {
        safeResolve({ logs, error: data.error, timedOut: false });
      } else if (data.type === 'done') {
        // 若有返回值且非空，作为最后一条 log 追加
        if (data.result) {
          logs.push({ level: 'log', text: data.result });
        }
        safeResolve({ logs, error: null, timedOut: false });
      }
    };
    window.addEventListener('message', messageHandler);

    // 加载超时与执行超时统一处理
    timeoutHandle = window.setTimeout(() => {
      safeResolve({ logs, error: '执行超时', timedOut: true });
    }, timeoutMs);

    // iframe 加载完成后注入用户代码（沙箱会先发送 ready，此处直接在 onload 后发送 run）
    // 注意：postMessage 传递对象时使用结构化克隆，无需 JSON.stringify；
    // 沙箱内监听器按对象字段读取（data.source / data.type），发送字符串会导致匹配失败
    iframe.addEventListener('load', () => {
      try {
        iframe.contentWindow?.postMessage({ source: CHANNEL, type: 'run', code }, '*');
      } catch {
        safeResolve({ logs, error: '代码注入失败', timedOut: false });
      }
    });

    document.body.appendChild(iframe);
  });
}

/**
 * 重置运行按钮状态
 * @param btn - 待重置的按钮元素
 */
function resetButton(btn: HTMLButtonElement) {
  btn.removeAttribute('aria-busy');
  btn.innerHTML = SVG_PLAY;
}

/**
 * 初始化代码运行按钮
 * 扫描页面中所有 JS/TS 代码块，为符合条件的代码块添加运行按钮
 * 条件：代码包含 console 调用（保证有可见输出）
 */
export function initCodeRunners() {
  document.querySelectorAll('pre code.language-js, pre code.language-ts').forEach((codeBlock) => {
    const code = codeBlock.textContent?.trim() || '';
    const parent = codeBlock.parentElement;
    if (!parent) return;

    // 仅对包含 console 调用的代码块添加运行按钮（保证有可见输出）
    if (!code.includes('console.')) return;

    const wrapper = parent.closest('.code-block');
    if (!wrapper) return;

    // 避免重复添加按钮
    if (wrapper.querySelector('.code-run-btn')) return;

    const runButton = document.createElement('button');
    runButton.className = 'code-run-btn';
    runButton.setAttribute('aria-label', '运行代码');
    runButton.innerHTML = SVG_PLAY;

    wrapper.appendChild(runButton);

    runButton.addEventListener('click', async () => {
      if (runButton.getAttribute('aria-busy') === 'true') return;

      runButton.setAttribute('aria-busy', 'true');
      runButton.innerHTML = SVG_LOADING;

      try {
        const { logs, error, timedOut } = await runCodeInSandbox(code);

        resetButton(runButton);

        // 移除已有结果区域
        const existing = wrapper.querySelector('.code-result');
        if (existing) existing.remove();

        const resultEl = document.createElement('div');
        resultEl.className = 'code-result';

        if (timedOut) {
          resultEl.classList.add('code-result-error');
          resultEl.textContent = `执行超时（${DEFAULT_TIMEOUT_MS / 1000}秒）`;
        } else if (error) {
          resultEl.classList.add('code-result-error');
          resultEl.textContent = error;
        } else {
          resultEl.classList.add('code-result-success');
          resultEl.textContent = logs.length > 0 ? logs.map((l) => l.text).join('\n') : '(无输出)';
        }

        wrapper.appendChild(resultEl);
      } catch (err) {
        resetButton(runButton);
        const existing = wrapper.querySelector('.code-result');
        if (existing) existing.remove();
        const resultEl = document.createElement('div');
        resultEl.className = 'code-result code-result-error';
        resultEl.textContent = err instanceof Error ? err.message : String(err);
        wrapper.appendChild(resultEl);
      }
    });
  });
}
