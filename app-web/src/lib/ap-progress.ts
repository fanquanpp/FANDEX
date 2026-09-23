
const STORAGE_KEY = 'fandex-ap-progress';

export interface ProblemMarks {
  solved?: boolean;
  review?: boolean;
}

type ProgressStore = Record<string, ProblemMarks>;

const FILTER_CONTEXT_KEY = 'fandex-ap-filter';

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

function writeStore(store: ProgressStore): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 存储不可用（隐私模式/容量满）时放弃持久化，内存态仍然生效 */
  }
}

export function readProblemMarks(slug: string): ProblemMarks {
  return readStore()[slug] ?? {};
}

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
 * 按当前题表的有效题目修剪本地标记：题库重组后，存储里会残留已下线
 * 题目的标记（既不显示也无法清除）。题库页挂载时以本次有效题号集合
 * 为准修剪并回写，状态计数随之自愈。
 */
export function pruneProblemMarks(validSlugs: ReadonlySet<string>): void {
  const store = readStore();
  let changed = false;
  for (const slug of Object.keys(store)) {
    if (!validSlugs.has(slug)) {
      delete store[slug];
      changed = true;
    }
  }
  if (changed) writeStore(store);
}

export function saveFilterContext(search: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(FILTER_CONTEXT_KEY, search);
  } catch {
    /* 会话存储不可用时静默放弃，返回链接回退到默认全量视图 */
  }
}

export function readFilterContext(): string {
  if (typeof sessionStorage === 'undefined') return '';
  try {
    return sessionStorage.getItem(FILTER_CONTEXT_KEY) ?? '';
  } catch {
    return '';
  }
}
