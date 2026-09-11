/**
 * 思维导图知识点节点原子组件
 * -----------------------------------------------------------------------------
 * - 全部节点统一为可选中卡片：点击在右侧面板展示说明与文档入口
 * - 已发布节点由面板中的"阅读专项文档"按钮负责跳转，画布内不直接导航
 * - 标题自动换行（最多两行），尾部显示难度竖条与状态
 * - 学习进度三态：未学习（默认）/ 学习中（青色）/ 已完成（绿色对勾 + 状态文案）
 */
import type { NodeProgress, NodeVM } from './types';

interface Props {
  /** 节点视图模型 */
  node: NodeVM;
  /** 节点左上角 x */
  x: number;
  /** 节点左上角 y */
  y: number;
  /** 阶段内序号（从 1 开始） */
  index: number;
  /** 节点宽度 */
  width: number;
  /** 节点高度 */
  height: number;
  /** 是否选中 */
  selected: boolean;
  /** 是否悬停 */
  hovered: boolean;
  /** 学习进度状态（null = 未学习） */
  progress: NodeProgress | null;
  /** 点击待补充节点 */
  onSelect: (id: string) => void;
  /** 悬停/移出节点 */
  onHover: (id: string | null) => void;
}

/** 标题单行最大字符数（CJK 字符约等于字号宽度） */
const LINE_CHARS = 17;

/** 进度状态文案 */
const PROGRESS_LABEL: Record<Exclude<NodeProgress, null>, string> = {
  learning: '学习中',
  done: '已完成',
};

/**
 * 标题换行：按字符数拆分为最多两行，超出部分省略
 * @param title - 原始标题
 * @returns 行数组（1-2 行）
 */
function wrapTitle(title: string): string[] {
  if (title.length <= LINE_CHARS) return [title];
  const first = title.slice(0, LINE_CHARS);
  const rest = title.slice(LINE_CHARS);
  return [first, rest.length > LINE_CHARS ? `${rest.slice(0, LINE_CHARS - 1)}…` : rest];
}

/**
 * 节点状态文案：进度标记优先于发布状态
 * （已完成/学习中 未标记时回落到 已发布/文档待补充）
 */
function statusText(node: NodeVM, progress: NodeProgress | null): string {
  if (progress) return PROGRESS_LABEL[progress];
  return node.href ? '已发布' : '文档待补充';
}

/** 节点内容（矩形 + 文本 + 元信息） */
function NodeBody({ node, index, width, height, progress }: Props) {
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
        {statusText(node, progress)}
      </text>
    </>
  );
}

/** 知识点节点 */
export default function MapNode(props: Props) {
  const { node, x, y, selected, hovered, progress, onSelect, onHover } = props;
  const commonProps = {
    transform: `translate(${x} ${y})`,
    className: `lp-node${selected ? ' lp-node--selected' : ''}${
      hovered ? ' lp-node--hovered' : ''
    }${progress ? ` lp-node--${progress}` : ''}`,
    onPointerEnter: () => onHover(node.id),
    onPointerLeave: () => onHover(null),
  };

  const stateText = progress ? PROGRESS_LABEL[progress] : node.href ? '已发布' : '文档待补充';

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${node.title}（${stateText}，点击查看详情）`}
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
