import type { ReactNode } from 'react';

/**
 * Playground 自绘 SVG 图标集
 *
 * 设计说明：
 *   - 按项目规范不使用位图与 emoji，图形一律使用自绘 SVG
 *   - 统一 24x24 视图、2px 描边、圆角端点，与 FANDEX 几何风格一致
 *   - 颜色继承 currentColor，跟随主题切换
 */

interface PgIconProps {
  /** 图标名称 */
  name: PgIconName;
  /** 尺寸（px），默认 16 */
  size?: number;
  /** 附加类名 */
  className?: string;
}

/** 可用图标名称 */
export type PgIconName =
  | 'play'
  | 'stop'
  | 'copy'
  | 'trash'
  | 'folder'
  | 'layout-top'
  | 'layout-left'
  | 'terminal'
  | 'refresh'
  | 'check'
  | 'close'
  | 'arrow-left'
  | 'code'
  | 'cpu'
  | 'clock'
  | 'alert'
  | 'plus'
  | 'spark'
  | 'gallery'
  ;

/** 图标路径表：每个图标包含若干 path/形状定义 */
const PATHS: Record<PgIconName, ReactNode> = {
  play: (
    <>
      <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.2-6.5a1 1 0 0 0 0-1.72L9.52 4.64A1 1 0 0 0 8 5.5Z" />
    </>
  ),
  stop: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l1-12" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  folder: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </>
  ),
  'layout-top': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </>
  ),
  'layout-left': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9l3 3-3 3" />
      <path d="M13 15h4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 3v5h-5" />
    </>
  ),
  check: (
    <>
      <path d="M4 12.5l5 5L20 6.5" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="M11 18l-6-6 6-6" />
    </>
  ),
  code: (
    <>
      <path d="M8.5 7 4 12l4.5 5" />
      <path d="M15.5 7 20 12l-4.5 5" />
      <path d="M13.5 4.5l-3 15" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21 20H3L12 3.5Z" />
      <path d="M12 9.5V14" />
      <path d="M12 17h.01" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z" />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
};

/**
 * 自绘 SVG 图标组件
 * 所有图标使用 currentColor，可通过 color 样式控制颜色
 */
export function PgIcon({ name, size = 16, className }: PgIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
