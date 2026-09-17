/**
 * 算法题图鉴本机进度（localStorage）
 * -----------------------------------------------------------------------------
 * 职责：
 * - 每题两个独立标记：已掌握（solved）/ 待复习（review），存 localStorage
 * - 结构损坏时自愈为空表，绝不抛错（隐私模式等场景静默降级）
 * - 供列表页（卡片角标 + 状态筛选 + 分类计数）与详情页（进度按钮）共用
 *
 * 存储格式：
 * { "two-sum": { "solved": true, "review": true }, ... }
 * 仅记录显式标记的题目，未标记即"未掌握"，控制存储体积。
 */

/** localStorage 存储键 */
const STORAGE_KEY = 'fandex-ap-progress';

/** 单题标记集合 */
export interface ProblemMarks {
  /** 已掌握 */
  solved?: boolean;
  /** 待复习 */
  review?: boolean;
}

/** 全量进度表：题目 slug -> 标记集合 */
type ProgressStore = Record<string, ProblemMarks>;

/** 会话存储键：题图鉴列表页 -> 详情页回传筛选上下文（返回时恢复原筛选视图） */
const FILTER_CONTEXT_KEY = 'fandex-ap-filter';

/**
 * 读取全量进度表（损坏自愈）
 */
function readStore(): ProgressStore {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 写入全量进度表（失败静默降级）
 */
function writeStore(store: ProgressStore): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 存储不可用（隐私模式/容量满）时放弃持久化，内存态仍然生效 */
  }
}

/**
 * 读取单题标记
 * @param slug - 题目 slug
 */
export function readProblemMarks(slug: string): ProblemMarks {
  return readStore()[slug] ?? {};
}

/**
 * 切换单题的一个标记位
 * @param slug - 题目 slug
 * @param mark - 标记位（solved / review）
 * @returns 切换后的标记集合
 */
export function toggleProblemMark(slug: string, mark: keyof ProblemMarks): ProblemMarks {
  const store = readStore();
  const marks = { ...(store[slug] ?? {}) };
  if (marks[mark]) {
    delete marks[mark];
  } else {
    marks[mark] = true;
  }
  if (Object.keys(marks).length === 0) {
    delete store[slug];
  } else {
    store[slug] = marks;
  }
  writeStore(store);
  return marks;
}

/**
 * 统计两个标记位的全库数量（供状态筛选 chip 计数）
 */
export function countMarks(): { solved: number; review: number } {
  const store = readStore();
  let solved = 0;
  let review = 0;
  for (const marks of Object.values(store)) {
    if (marks.solved) solved += 1;
    if (marks.review) review += 1;
  }
  return { solved, review };
}

/**
 * 保存当前筛选上下文（列表页 -> 详情页跳转前调用）
 * 详情页"返回题图鉴"链接据此恢复精确的筛选视图（URL 即状态）
 * @param search - 当前列表页 location.search（含 ? 前缀，可为空串）
 */
export function saveFilterContext(search: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(FILTER_CONTEXT_KEY, search);
  } catch {
    /* 会话存储不可用时静默放弃，返回链接回退到默认全量视图 */
  }
}

/**
 * 读取筛选上下文（详情页渲染返回链接时调用）
 * @returns 查询串（含 ? 前缀）；无上下文时返回空串
 */
export function readFilterContext(): string {
  if (typeof sessionStorage === 'undefined') return '';
  try {
    return sessionStorage.getItem(FILTER_CONTEXT_KEY) ?? '';
  } catch {
    return '';
  }
}
