/**
 * ShortcutHelp 快捷键帮助面板组件（React Island）
 *
 * 功能概述：
 * - 按 Ctrl+/ 或 Cmd+/ 打开快捷键帮助弹窗
 * - 按类别分组展示所有可用快捷键
 * - 每条记录：快捷键 / 描述 / 是否在输入框内可用
 * - 支持搜索过滤（输入关键词过滤快捷键）
 * - 基于 shadcn/ui Dialog + 原生 table（Table 组件未创建）
 * - Motion 淡入动画 + stagger 行入场
 * - 集成 useShortcut hook 注册全局快捷键
 *
 * 使用方式（Astro island）：
 *   <ShortcutHelp client:idle />
 *
 * 数据流：
 * 1. 组件挂载时注册 Ctrl+/ 快捷键
 * 2. 用户按下 Ctrl+/ → setOpen(true) 打开 Dialog
 * 3. 用户在 Dialog 内输入关键词 → 过滤快捷键列表
 * 4. 用户按 ESC 或点击外部 → 关闭 Dialog
 */

import { Keyboard, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { useShortcut } from '@/lib/keyboard';

/** ShortcutHelp 组件 Props 类型 */
export interface ShortcutHelpProps {
  /** 额外类名 */
  className?: string;
  /** 是否启用 Ctrl+/ 触发（默认 true） */
  enableShortcut?: boolean;
  /** 默认是否打开（默认 false） */
  defaultOpen?: boolean;
}

/** 快捷键条目类型 */
interface ShortcutEntry {
  /** 快捷键描述（标准化形式，如 'Ctrl+K'） */
  keys: string;
  /** 功能描述 */
  description: string;
  /** 是否在输入框内仍可用（默认 false） */
  worksInInput?: boolean;
}

/** 快捷键分类类型 */
interface ShortcutCategory {
  /** 分类 ID */
  id: string;
  /** 分类名 */
  name: string;
  /** 分类图标 */
  Icon: typeof Keyboard;
  /** 该分类下的快捷键列表 */
  entries: ShortcutEntry[];
}

/** 平台修饰键（macOS 显示 Cmd，其他显示 Ctrl） */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** 将快捷键描述转换为平台显示形式 */
function formatKeys(keys: string, mac: boolean): string {
  return keys
    .split('+')
    .map((part) => {
      const trimmed = part.trim();
      if (trimmed.toLowerCase() === 'ctrl') return mac ? '⌃' : 'Ctrl';
      if (trimmed.toLowerCase() === 'meta') return mac ? '⌘' : 'Win';
      if (trimmed.toLowerCase() === 'shift') return mac ? '⇧' : 'Shift';
      if (trimmed.toLowerCase() === 'alt') return mac ? '⌥' : 'Alt';
      if (trimmed === '/') return '/';
      if (trimmed === 'ArrowLeft') return '←';
      if (trimmed === 'ArrowRight') return '→';
      if (trimmed === 'ArrowUp') return '↑';
      if (trimmed === 'ArrowDown') return '↓';
      if (trimmed === 'Escape') return 'Esc';
      if (trimmed === 'Enter') return '↵';
      if (trimmed === 'Space') return 'Space';
      // 单字符大写
      if (trimmed.length === 1) return trimmed.toUpperCase();
      return trimmed;
    })
    .join(mac ? '' : '+');
}

/** 默认快捷键分类数据（与 keyboard.ts 的 initDefaultShortcuts 对齐） */
const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    id: 'global',
    name: '全局',
    Icon: Keyboard,
    entries: [
      { keys: 'Ctrl+K', description: '打开全局搜索', worksInInput: false },
      { keys: 'Ctrl+/', description: '打开快捷键帮助', worksInInput: false },
      { keys: 'Escape', description: '关闭当前弹窗', worksInInput: true },
    ],
  },
  {
    id: 'navigation',
    name: '导航',
    Icon: Keyboard,
    entries: [
      { keys: 'G H', description: '跳转到首页', worksInInput: false },
      { keys: 'G D', description: '跳转到仪表盘', worksInInput: false },
      { keys: 'ArrowLeft', description: '上一篇文档', worksInInput: false },
      { keys: 'ArrowRight', description: '下一篇文档', worksInInput: false },
    ],
  },
  {
    id: 'browser',
    name: '浏览器',
    Icon: Keyboard,
    entries: [
      { keys: 'Ctrl+F', description: '页面内查找（浏览器原生）', worksInInput: false },
      { keys: 'Ctrl+D', description: '添加书签（浏览器原生）', worksInInput: false },
      { keys: 'Ctrl+Plus', description: '放大页面', worksInInput: true },
      { keys: 'Ctrl+Minus', description: '缩小页面', worksInInput: true },
      { keys: 'Ctrl+0', description: '恢复默认缩放', worksInInput: true },
    ],
  },
];

/**
 * ShortcutHelp 快捷键帮助面板组件
 *
 * @param props.className - 外部类名
 * @param props.enableShortcut - 是否启用 Ctrl+/ 触发
 * @param props.defaultOpen - 默认是否打开
 */
export function ShortcutHelp({
  className,
  enableShortcut = true,
  defaultOpen = false,
}: ShortcutHelpProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');

  /** 平台标识（仅客户端有效，避免 SSR 不一致） */
  const mac = typeof navigator !== 'undefined' ? isMac() : false;

  /** 打开 / 关闭处理 */
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      // 关闭时清空搜索
      setQuery('');
    }
  }, []);

  // 注册 Ctrl+/ 与 Cmd+/ 全局快捷键
  useShortcut('ctrl+/', handleOpen, [handleOpen, enableShortcut], {
    enabled: enableShortcut,
    ignoreInInput: true,
  });
  useShortcut('meta+/', handleOpen, [handleOpen, enableShortcut], {
    enabled: enableShortcut,
    ignoreInInput: true,
  });

  /** 按关键词过滤分类 + 条目 */
  const filteredCategories = useMemo<ShortcutCategory[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHORTCUT_CATEGORIES;
    return SHORTCUT_CATEGORIES.map((category) => {
      const filteredEntries = category.entries.filter(
        (entry) =>
          entry.description.toLowerCase().includes(q) || entry.keys.toLowerCase().includes(q),
      );
      return { ...category, entries: filteredEntries };
    }).filter((category) => category.entries.length > 0);
  }, [query]);

  /** 清空搜索 */
  const handleClear = useCallback(() => setQuery(''), []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('max-w-2xl gap-0 p-0 overflow-hidden', className)}>
        {/* 头部 */}
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            快捷键帮助
          </DialogTitle>
          <DialogDescription>
            使用以下快捷键提升浏览效率。macOS 用户请将 Ctrl 替换为 ⌘ Command。
          </DialogDescription>
        </DialogHeader>

        {/* 搜索框 */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索快捷键或功能描述..."
              className="pl-9 pr-9"
              aria-label="搜索快捷键"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                aria-label="清空搜索"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 分类列表 */}
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
          {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
              <p className="text-sm font-medium">未找到匹配的快捷键</p>
              <p className="mt-1 text-xs text-muted-foreground">
                尝试搜索"搜索"、"导航"、"快捷键"等关键词
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={query || 'all'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {filteredCategories.map((category, catIndex) => {
                  const { Icon } = category;
                  return (
                    <motion.section
                      key={category.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: catIndex * 0.06, duration: 0.2 }}
                    >
                      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {category.name}
                      </h3>
                      <div className="overflow-hidden rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/40">
                            <tr>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-32"
                              >
                                快捷键
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                              >
                                功能
                              </th>
                              <th
                                scope="col"
                                className="hidden sm:table-cell px-3 py-2 text-right text-xs font-medium text-muted-foreground w-24"
                              >
                                输入框内
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {category.entries.map((entry, entryIndex) => (
                              <motion.tr
                                key={`${category.id}-${entry.keys}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  delay: catIndex * 0.06 + entryIndex * 0.03,
                                  duration: 0.18,
                                }}
                                className="transition-colors hover:bg-muted/30"
                              >
                                <td className="px-3 py-2">
                                  <kbd
                                    className={cn(
                                      'inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 font-mono text-xs font-medium shadow-sm',
                                    )}
                                  >
                                    {formatKeys(entry.keys, mac)}
                                  </kbd>
                                </td>
                                <td className="px-3 py-2 text-foreground">{entry.description}</td>
                                <td className="hidden sm:table-cell px-3 py-2 text-right">
                                  {entry.worksInInput ? (
                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                      可用
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">禁用</span>
                                  )}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.section>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* 底部提示 */}
        <div className="border-t bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
          <p>
            提示：在 macOS 上，Ctrl 键对应 ⌘ Command 键。快捷键在输入框聚焦时可能被禁用以避免冲突。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutHelp;
