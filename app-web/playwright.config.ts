import { defineConfig } from '@playwright/test';

// 4173 在本机被另一项目的静态服务长期占用（约束文件第 2 节，豁免勿杀）。
// webServer.reuseExistingServer 为 true 时 Playwright 会静默复用该错误服务，
// 冒烟全部打到对方站点上（2026-11-05 实测 20/20 超时，页面快照只有 "404"）。
// 默认端口改为本项目冒烟专用 4321（本机无监听），SMOKE_PORT / LHCI_PORT 可覆盖；
// 端口同时注入 webServer 子进程，保证 lhci-server.mjs 的 LHCI_PORT 与本值一致。
// CI 与 LHCI 不受影响：CI 无 4173 占用且无既有冒烟步；lighthouserc.json 走
// LHCI_PORT=4190 覆盖跑法（约束第 2 节），不读本文件。
const PORT = Number(process.env.SMOKE_PORT || process.env.LHCI_PORT || 4321);

export default defineConfig({
  testDir: './tests',
  retries: 0,
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/lhci-server.mjs',
    port: PORT,
    env: { LHCI_PORT: String(PORT) },
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
