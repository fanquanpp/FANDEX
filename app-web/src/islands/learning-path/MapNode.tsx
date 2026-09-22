import { useLang } from '@/lib/use-lang';
import { t, type Lang } from '@/lib/i18n';
import type { NodeProgress, NodeVM } from './types';

interface Props {
  node: NodeVM;
  x: number;
  y: number;
  index: number;
  width: number;
  height: number;
  selected: boolean;
  hovered: boolean;
  progress: NodeProgress | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

const LINE_CHARS = 17;

const PROGRESS_LABEL_KEY: Record<Exclude<NodeProgress, null>, string> = {
  learning: 'lpMap.statusLearning',
  done: 'lpMap.statusDone',
};

function wrapTitle(title: string): string[] {
  if (title.length <= LINE_CHARS) return [title];
  const first = title.slice(0, LINE_CHARS);
  const rest = title.slice(LINE_CHARS);
  return [first, rest.length > LINE_CHARS ? `${rest.slice(0, LINE_CHARS - 1)}…` : rest];
}

function statusText(node: NodeVM, progress: NodeProgress | null, lang: Lang): string {
  if (progress) return t(PROGRESS_LABEL_KEY[progress], undefined, lang);
  return node.href
    ? t('lpMap.statusPublished', undefined, lang)
    : t('lpMap.statusPlanned', undefined, lang);
}

function NodeBody({ node, index, width, height, progress }: Props) {
  const lang = useLang();
  const lines = wrapTitle(node.title);
  const planned = !node.href;
  return (
    <>
      <rect
        className={`lp-node__rect${planned ? ' lp-node__rect--planned' : ''}`}
        x={0}
        y={0}
        width={width}
        height={height}
        rx={2}
      />
      {/* 序号 */}
      <text className="lp-node__seq" x={width - 10} y={16} textAnchor="end">
        {String(index).padStart(2, '0')}
      </text>
      {/* 标题（1-2 行） */}
      {lines.map((line, i) => (
        <text
          key={i}
          className={`lp-node__title${progress === 'done' ? ' lp-node__title--done' : ''}`}
          x={12}
          y={i === 0 ? 20 : 37}
        >
          {line}
        </text>
      ))}
      {/* 元信息：难度竖条 + 状态 + 序号 */}
      <rect
        className={`lp-node__bar lp-node__bar--${node.difficulty ?? 'intermediate'}`}
        x={10}
        y={height - 19}
        width={4}
        height={10}
        rx={1}
      />
      {/* 进度标记竖条：学习中为青色刻度，已完成不显示（由对勾表达） */}
      {progress === 'learning' && (
        <rect className="lp-node__progress-mark" x={22} y={height - 19} width={3} height={10} rx={1} />
      )}
      {/* 已完成对勾：绘制于序号左侧（右上角区域） */}
      {progress === 'done' && (
        <g className="lp-node__check" transform={`translate(${width - 32} 8)`}>
          <polyline points="1 5 4 8 9 2" />
        </g>
      )}
      <text
        className={`lp-node__status${
          progress === 'done' ? ' lp-node__status--done' : ''
        }${progress === 'learning' ? ' lp-node__status--learning' : ''}`}
        x={21}
        y={height - 11}
      >
        {statusText(node, progress, lang)}
      </text>
    </>
  );
}

export default function MapNode(props: Props) {
  const { node, x, y, selected, hovered, progress, onSelect, onHover } = props;
  const lang = useLang();
  const commonProps = {
    transform: `translate(${x} ${y})`,
    className: `lp-node${selected ? ' lp-node--selected' : ''}${
      hovered ? ' lp-node--hovered' : ''
    }${progress ? ` lp-node--${progress}` : ''}`,
    onPointerEnter: () => onHover(node.id),
    onPointerLeave: () => onHover(null),
  };

  const stateText = statusText(node, progress, lang);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={t('lpMap.nodeAria', { title: node.title, state: stateText }, lang)}
      onClick={() => onSelect(node.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(node.id);
        }
      }}
      {...commonProps}
    >
      {/* 悬停抬升层：CSS transform 只作用于内层 g，避免覆盖外层定位 transform 导致节点跳位 */}
      <g className="lp-node__lift">
        <NodeBody {...props} />
      </g>
    </g>
  );
}
