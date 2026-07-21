/**
 * code-runner 单元测试
 *
 * 测试策略：
 * runCodeInSandbox 依赖 DOM（document.createElement、iframe、postMessage），
 * 在 Node 环境下无法直接运行。本测试通过 vi.stubGlobal 注入伪造的 DOM API，
 * 拦截 iframe 创建、load 事件与 message 事件，从而模拟沙箱与主窗口的通信流程。
 *
 * 覆盖场景：
 * - 正常执行：沙箱发送 done 消息，主窗口收到日志与结果
 * - 超时：沙箱不响应，主窗口在超时后返回 timedOut
 * - console 捕获：沙箱发送多条 log 消息，主窗口按顺序收集
 * - 错误捕获：沙箱发送 error 消息，主窗口返回错误文本
 * - 沙箱逃逸防护：验证 iframe sandbox 属性安全配置、SANDBOX_HTML 模板无越权代码、
 *   模拟 window.parent.document、globalThis.eval、document.cookie、localStorage
 *   等逃逸尝试被浏览器跨域安全模型拦截后的错误处理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 通信通道标识，需与 code-runner.ts 内部保持一致 */
const CHANNEL = 'fandex-code-runner';

/** 伪 iframe 元素：持有 load 回调与 contentWindow.postMessage 桩 */
interface FakeIframe {
  setAttribute: (name: string, value: string) => void;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
  style: { cssText: string };
  srcdoc: string;
  contentWindow: { postMessage: (msg: unknown, origin: string) => void };
  parentNode: { removeChild: (node: FakeIframe) => void } | null;
}

/** 伪 document.body 容器：提供 appendChild 与 removeChild */
const fakeBody: {
  appendChild: (node: FakeIframe) => void;
  removeChild: (node: FakeIframe) => void;
} = {
  appendChild: () => {},
  removeChild: () => {},
};

/** 当前捕获的 window.message 事件处理函数 */
let messageHandler: ((event: MessageEvent) => void) | null = null;
/** 当前捕获的 iframe.load 事件处理函数 */
let loadHandler: (() => void) | null = null;
/** 当前捕获的 iframe.contentWindow.postMessage 桩函数 */
let postMessageStub: ((msg: unknown, origin: string) => void) | null = null;
/** 当前注册的 setTimeout 句柄列表 */
let timeoutCallbacks: Array<{ cb: () => void; ms: number }> = [];
/** 捕获 iframe 上通过 setAttribute 设置的属性（用于沙箱安全验证） */
const capturedAttributes: Record<string, string> = {};
/** 捕获 iframe 的 srcdoc 内容（即 SANDBOX_HTML 模板，用于安全审计） */
let capturedSrcdoc = '';

beforeEach(() => {
  messageHandler = null;
  loadHandler = null;
  postMessageStub = null;
  timeoutCallbacks = [];
  // 重置捕获的属性与 srcdoc，确保每个测试用例独立
  for (const key of Object.keys(capturedAttributes)) {
    delete capturedAttributes[key];
  }
  capturedSrcdoc = '';

  /** 伪造 document.createElement('iframe') 返回的 iframe 对象 */
  const fakeIframe: FakeIframe = {
    // 记录所有 setAttribute 调用，用于验证 sandbox 属性是否安全
    setAttribute: (name: string, value: string) => {
      capturedAttributes[name] = value;
    },
    addEventListener: (event: string, handler: () => void) => {
      if (event === 'load') loadHandler = handler;
    },
    removeEventListener: () => {},
    style: { cssText: '' },
    // 使用 getter/setter 捕获 srcdoc 赋值，用于安全审计沙箱 HTML 模板
    get srcdoc() {
      return capturedSrcdoc;
    },
    set srcdoc(value: string) {
      capturedSrcdoc = value;
    },
    contentWindow: {
      postMessage: (msg: unknown, origin: string) => {
        if (postMessageStub) postMessageStub(msg, origin);
      },
    },
    parentNode: fakeBody,
  };

  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag === 'iframe') return fakeIframe;
      throw new Error(`Unexpected createElement tag: ${tag}`);
    },
    body: fakeBody,
  });

  vi.stubGlobal('window', {
    addEventListener: (event: string, handler: (e: MessageEvent) => void) => {
      if (event === 'message') messageHandler = handler;
    },
    removeEventListener: () => {
      messageHandler = null;
    },
    setTimeout: (cb: () => void, ms: number) => {
      timeoutCallbacks.push({ cb, ms });
      return timeoutCallbacks.length;
    },
    clearTimeout: () => {
      timeoutCallbacks = [];
    },
  });
});

/**
 * 触发 iframe load 事件（模拟沙箱 HTML 加载完成）
 */
function triggerIframeLoad() {
  if (loadHandler) loadHandler();
}

/**
 * 模拟沙箱向主窗口发送消息
 * @param data - 消息体（包含 source、type 等字段）
 */
function emitSandboxMessage(data: Record<string, unknown>) {
  if (!messageHandler) throw new Error('message handler 未注册');
  messageHandler({ data } as MessageEvent);
}

/**
 * 触发超时回调（模拟 setTimeout 到期）
 */
function triggerTimeout() {
  timeoutCallbacks.forEach((t) => t.cb());
}

const { runCodeInSandbox } = await import('@/lib/code-runner');

describe('runCodeInSandbox', () => {
  it('正常执行：沙箱发送 done 消息时应返回空错误与日志', async () => {
    // 拦截主窗口发往沙箱的 run 消息，模拟沙箱立即回复 done
    postMessageStub = () => {
      // 模拟沙箱收到 run 后立即回复 done
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: '' });
    };

    const promise = runCodeInSandbox('console.log("hello")');
    triggerIframeLoad();

    const result = await promise;
    expect(result.timedOut).toBe(false);
    expect(result.error).toBeNull();
    expect(result.logs).toEqual([]);
  });

  it('console 捕获：沙箱发送多条 log 消息时应按顺序收集', async () => {
    // 模拟沙箱依次发送 log、done 消息
    postMessageStub = () => {
      emitSandboxMessage({ source: CHANNEL, type: 'log', level: 'log', text: 'first' });
      emitSandboxMessage({ source: CHANNEL, type: 'log', level: 'warn', text: 'second' });
      emitSandboxMessage({ source: CHANNEL, type: 'log', level: 'error', text: 'third' });
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: '' });
    };

    const promise = runCodeInSandbox(
      'console.log("first"); console.warn("second"); console.error("third")'
    );
    triggerIframeLoad();

    const result = await promise;
    expect(result.timedOut).toBe(false);
    expect(result.error).toBeNull();
    expect(result.logs).toHaveLength(3);
    expect(result.logs[0]).toEqual({ level: 'log', text: 'first' });
    expect(result.logs[1]).toEqual({ level: 'warn', text: 'second' });
    expect(result.logs[2]).toEqual({ level: 'error', text: 'third' });
  });

  it('console 捕获：done 携带非空 result 时应作为最后一条日志追加', async () => {
    postMessageStub = () => {
      emitSandboxMessage({ source: CHANNEL, type: 'log', level: 'log', text: 'output' });
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: 'return-value' });
    };

    const promise = runCodeInSandbox('1 + 1');
    triggerIframeLoad();

    const result = await promise;
    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]).toEqual({ level: 'log', text: 'output' });
    expect(result.logs[1]).toEqual({ level: 'log', text: 'return-value' });
  });

  it('错误捕获：沙箱发送 error 消息时应返回错误文本', async () => {
    postMessageStub = () => {
      emitSandboxMessage({
        source: CHANNEL,
        type: 'error',
        error: 'ReferenceError: x is not defined',
      });
    };

    const promise = runCodeInSandbox('x.y');
    triggerIframeLoad();

    const result = await promise;
    expect(result.timedOut).toBe(false);
    expect(result.error).toBe('ReferenceError: x is not defined');
  });

  it('超时：沙箱不响应时应返回 timedOut 标志', async () => {
    // postMessage 桩不发送任何回复，模拟沙箱卡死
    postMessageStub = () => {};

    const promise = runCodeInSandbox('while(true) {}', 100);
    triggerIframeLoad();
    // 触发超时回调
    triggerTimeout();

    const result = await promise;
    expect(result.timedOut).toBe(true);
    expect(result.error).toBe('执行超时');
    expect(result.logs).toEqual([]);
  });

  it('消息过滤：非本通道消息应被忽略', async () => {
    postMessageStub = () => {
      // 发送来源不明的消息，应被忽略
      emitSandboxMessage({ source: 'other-lib', type: 'done', result: 'ignored' });
      // 发送本通道的 done 消息
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: '' });
    };

    const promise = runCodeInSandbox('console.log("ok")');
    triggerIframeLoad();

    const result = await promise;
    expect(result.timedOut).toBe(false);
    expect(result.error).toBeNull();
  });
});

/**
 * 沙箱逃逸防护测试
 *
 * 测试策略：
 * 真实浏览器的沙箱安全由 iframe sandbox="allow-scripts" 属性保证（不含 allow-same-origin）。
 * 在 Node 测试环境中无法模拟浏览器的跨域安全模型，因此本测试组通过以下方式验证安全性：
 *
 * 1. 静态属性验证：检查 iframe 创建时 sandbox 属性是否为 "allow-scripts" 且不含 "allow-same-origin"
 * 2. 沙箱 HTML 审计：检查 srcdoc 中注入的 SANDBOX_HTML 模板是否包含危险模式
 *    （如 parent.document、parent.localStorage、parent.cookie 等越权访问代码）
 * 3. 模拟逃逸场景：模拟沙箱内代码尝试逃逸时浏览器会产生的错误消息，
 *    验证主窗口的消息处理逻辑能正确接收并上报这些错误
 */
describe('runCodeInSandbox 沙箱逃逸防护', () => {
  it('iframe sandbox 属性应为 allow-scripts 且不含 allow-same-origin', async () => {
    // 沙箱安全的核心：sandbox="allow-scripts" 不带 allow-same-origin
    // allow-scripts 允许执行 JavaScript，但不赋予同源权限
    // 缺少 allow-same-origin 使得 iframe 被视为跨域框架，无法访问父窗口 DOM
    postMessageStub = () => {
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: '' });
    };

    const promise = runCodeInSandbox('console.log("sandbox test")');
    triggerIframeLoad();
    await promise;

    // 验证 sandbox 属性设置为 allow-scripts
    expect(capturedAttributes['sandbox']).toBe('allow-scripts');
    // 关键安全断言：sandbox 属性不得包含 allow-same-origin
    // 若包含 allow-same-origin，沙箱将与父页面同源，可访问 cookie、localStorage、DOM
    expect(capturedAttributes['sandbox']).not.toContain('allow-same-origin');
  });

  it('iframe 应设置 aria-hidden 属性以避免影响无障碍访问', async () => {
    postMessageStub = () => {
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: '' });
    };

    const promise = runCodeInSandbox('1+1');
    triggerIframeLoad();
    await promise;

    expect(capturedAttributes['aria-hidden']).toBe('true');
  });

  it('沙箱 HTML 模板不应包含 parent.document 越权访问代码', async () => {
    postMessageStub = () => {
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: '' });
    };

    const promise = runCodeInSandbox('console.log("audit")');
    triggerIframeLoad();
    await promise;

    // SANDBOX_HTML 模板中不应包含直接访问 parent.document 的代码
    // 注意：parent.postMessage 是允许的安全通信通道，不在禁止之列
    expect(capturedSrcdoc).not.toMatch(/parent\.document/);
    expect(capturedSrcdoc).not.toMatch(/parent\.localStorage/);
    expect(capturedSrcdoc).not.toMatch(/parent\.sessionStorage/);
    expect(capturedSrcdoc).not.toMatch(/parent\.cookie/);
    expect(capturedSrcdoc).not.toMatch(/parent\.eval/);
  });

  it('沙箱 HTML 模板应使用 parent.postMessage 作为唯一通信通道', async () => {
    postMessageStub = () => {
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: '' });
    };

    const promise = runCodeInSandbox('console.log("channel")');
    triggerIframeLoad();
    await promise;

    // 验证沙箱内使用 parent.postMessage 与主窗口通信
    expect(capturedSrcdoc).toContain('parent.postMessage');
    // 验证通道标识存在，用于消息来源校验
    expect(capturedSrcdoc).toContain('fandex-code-runner');
  });

  it('沙箱逃逸尝试：window.parent.document 访问应因跨域被浏览器拦截', async () => {
    // 模拟用户代码尝试通过 window.parent.document 修改父页面 DOM
    // 在真实浏览器中，跨域 iframe 访问 parent.document 会抛出 SecurityError
    postMessageStub = () => {
      // 模拟浏览器抛出的跨域访问错误
      emitSandboxMessage({
        source: CHANNEL,
        type: 'error',
        error: 'Blocked a frame with origin "null" from accessing a cross-origin frame',
      });
    };

    const promise = runCodeInSandbox(
      'try { window.parent.document.body.innerHTML = "" } catch(e) { throw e }'
    );
    triggerIframeLoad();

    const result = await promise;
    expect(result.timedOut).toBe(false);
    // 错误消息应表明跨域访问被阻止
    expect(result.error).toContain('cross-origin');
  });

  it('沙箱逃逸尝试：globalThis.eval 调用 fetch 应因跨域失败', async () => {
    // 模拟用户代码尝试通过 eval + fetch 发起网络请求
    // 在沙箱中，fetch 请求会因 null origin 被浏览器同源策略拦截
    postMessageStub = () => {
      emitSandboxMessage({
        source: CHANNEL,
        type: 'error',
        error: 'Failed to fetch: NetworkError when attempting to fetch resource',
      });
    };

    const promise = runCodeInSandbox('globalThis.eval(\'fetch("/")\')');
    triggerIframeLoad();

    const result = await promise;
    expect(result.timedOut).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('沙箱逃逸尝试：document.cookie 在跨域沙箱中应不可访问', async () => {
    // 模拟用户代码尝试读取 cookie
    // 在 sandbox="allow-scripts"（无 allow-same-origin）的 iframe 中，
    // document.cookie 返回空字符串（沙箱有独立的空 cookie 存储）
    postMessageStub = () => {
      // 沙箱内 document.cookie 为空字符串
      emitSandboxMessage({ source: CHANNEL, type: 'log', level: 'log', text: '' });
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: '' });
    };

    const promise = runCodeInSandbox('console.log(document.cookie)');
    triggerIframeLoad();

    const result = await promise;
    expect(result.error).toBeNull();
    // cookie 应为空（沙箱无法访问父页面 cookie）
    // noUncheckedIndexedAccess：result.logs[0] 类型可能为 undefined，使用 ?. 链式访问
    expect(result.logs[0]?.text).toBe('');
  });

  it('沙箱逃逸尝试：localStorage 访问应被浏览器拒绝', async () => {
    // 模拟用户代码尝试访问 localStorage
    // 在 sandbox="allow-scripts" 无 allow-same-origin 的 iframe 中，
    // 访问 localStorage 会抛出 SecurityError
    postMessageStub = () => {
      emitSandboxMessage({
        source: CHANNEL,
        type: 'error',
        error:
          "Failed to read the 'localStorage' property from 'Window': Access is denied for this document",
      });
    };

    const promise = runCodeInSandbox('localStorage.setItem("x", "y")');
    triggerIframeLoad();

    const result = await promise;
    expect(result.error).toContain('localStorage');
    expect(result.error).toContain('denied');
  });

  it('沙箱逃逸尝试：window.parent.frames 跨域访问应被拦截', async () => {
    // 模拟用户代码尝试枚举父窗口的框架列表
    postMessageStub = () => {
      emitSandboxMessage({
        source: CHANNEL,
        type: 'error',
        error: 'Blocked a frame with origin "null" from accessing a cross-origin frame',
      });
    };

    const promise = runCodeInSandbox('var f = window.parent.frames.length');
    triggerIframeLoad();

    const result = await promise;
    expect(result.error).toContain('cross-origin');
  });

  it('消息通道校验：伪造的 source 字段应被忽略，防止恶意沙箱伪造消息', async () => {
    // 即使恶意代码尝试伪造消息源，通道校验也会过滤掉非本通道的消息
    postMessageStub = () => {
      // 尝试伪造非本通道的 done 消息（应被忽略）
      emitSandboxMessage({ source: 'malicious', type: 'done', result: 'hacked' });
      // 再发送本通道的 done 消息
      emitSandboxMessage({ source: CHANNEL, type: 'done', result: '' });
    };

    const promise = runCodeInSandbox('console.log("safe")');
    triggerIframeLoad();

    const result = await promise;
    expect(result.error).toBeNull();
    // 伪造的消息不应出现在日志中
    expect(result.logs).toEqual([]);
  });
});
