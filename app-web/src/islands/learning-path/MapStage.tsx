import type { ReactNode } from 'react';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';
import type { StageVM } from './types';
import { LAYOUT } from './map-layout';

interface Props {
  stage: StageVM;
  index: number;
  x: number;
  y: number;
  color: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}

export default function MapStage({
  stage,
  index,
  x,
  y,
  color,
  collapsed,
  onToggle,
  children,
}: Props) {
  const lang = useLang();
  const nodeCount = stage.nodes.length;
  return (
    <g transform={`translate(${x} ${y})`} className={`lp-stage${collapsed ? ' lp-stage--collapsed' : ''}`}>
      {/* 折叠热区：整行可点击 */}
      <g
        role="button"
        tabIndex={0}
        aria-label={t(
          collapsed ? 'lpMap.stageExpand' : 'lpMap.stageCollapse',
          { title: stage.title, n: nodeCount },
          lang,
        )}
        onClick={() => onToggle(stage.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle(stage.id);
          }
        }}
        className="lp-stage__toggle"
      >
        {/* 阶段标题背景 */}
        <rect
          className="lp-stage__rect"
          x={0}
          y={0}
          width={LAYOUT.nodeWidth}
          height={LAYOUT.headerHeight}
          rx={2}
        />
        {/* 序号块 */}
        <text className="lp-stage__num" x={10} y={18}>
          {String(index).padStart(2, '0')}
        </text>
        <text className="lp-stage__title" x={34} y={19}>
          {stage.title}
        </text>
        {stage.subtitle && (
          <text className="lp-stage__subtitle" x={34} y={34}>
            {stage.subtitle}
          </text>
        )}
        {/* 节点数徽标：直角小圆角，垂直居中于标题栏右侧 */}
        <g transform={`translate(${LAYOUT.nodeWidth - 56} 15)`}>
          <rect className="lp-stage__count-rect" width={30} height={26} rx={2} />
          <text className="lp-stage__count" x={15} y={17} textAnchor="middle">
            {nodeCount}
          </text>
        </g>
        {/* 折叠箭头：位于徽标右侧，与徽标同一垂直中心线 */}
        <g transform={`translate(${LAYOUT.nodeWidth - 21} 21)`}>
          <path
            className={`lp-stage__chevron${collapsed ? ' lp-stage__chevron--collapsed' : ''}`}
            d="M 0 0 L 7 7 L 0 14"
            fill="none"
          />
        </g>
      </g>
      {/* 阶段内知识点链 */}
      {!collapsed && children}
      {/* 阶段主题色装饰线（列顶横线） */}
      <line
        className="lp-stage__accent"
        x1={0}
        y1={0}
        x2={LAYOUT.nodeWidth}
        y2={0}
        stroke={color}
      />
    </g>
  );
}
