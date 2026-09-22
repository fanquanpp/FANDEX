
export type FrontendLayout = 'top' | 'left';

export interface FrontendPen {
  id: string;
  title: string;
  html: string;
  css: string;
  js: string;
  autoRun: boolean;
  layout: FrontendLayout;
  showHtml: boolean;
  showCss: boolean;
  showJs: boolean;
  paneWeights: { html: number; css: number; js: number };
  split?: number;
  showConsole: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
}

export interface ConsoleEntry {
  kind: 'log' | 'info' | 'warn' | 'error';
  text: string;
  time: number;
  /** 单调递增 id，用作列表 key（同毫秒多条日志时 time 会重复） */
  id: number;
}
