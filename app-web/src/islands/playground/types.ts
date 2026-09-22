
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
}
