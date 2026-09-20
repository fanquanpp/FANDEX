/**
 * 全部模块侧栏面板（客户端按需渲染）
 * =============================================================================
 * 背景：
 * - 旧实现由 Sidebar.astro 在服务端把全站 2274 篇文档的导航链接内联到每个页面，
 *   单页重复输出约 500KB HTML，导致 dist 超 GitHub Pages 1GB 软限制；
 * - 本组件改为按需挂载：用户首次切换到"全部模块"视图时才加载并渲染，
 *   数据来自预构建的 doc-index.json（轻量索引，无文档正文），
 *   一次加载后由浏览器缓存，全站共享。
 *
 * 与既有交互的兼容：
 * - 渲染结构与旧服务端版本完全一致（fndx-sidebar__* 类），直接复用全局样式；
 * - 模块展开状态读写同一个 localStorage 键（fandex-sidebar-expanded），
 *   与 sidebar-interactions.ts 的持久化格式保持一致；
 * - 视图切换（章节/全部）仍由 sidebar-interactions.ts 与 Layout 事件驱动，
 *   本组件只负责面板内容。
 */

import { useMemo, useState, type CSSProperties } from 'react';
import {
  categoryColors,
  getModulesByCategory,
  getPrimaryCategory,
  type Module,
} from '@/lib/modules';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';
// 直接导入 module-service（不经过 services 桶文件），
// 避免把 doc-service（含 astro:content）拉进客户端包
import { getCategories, type CategoryInfo } from '@/services/module-service';
// 预构建轻量索引（scripts/build-stats.mjs 生成），仅含 slug/module/title/order
import docIndexData from '@/data/doc-index.json';
import type { DocIndexItem } from '@/services';

/** SidebarModules 组件入参 */
interface SidebarModulesProps {
  /** 当前模块 ID（用于高亮激活态） */
  moduleId: string;
  /** 当前文档 slug（用于高亮激活态） */
  currentSlug?: string;
}

/** localStorage 键名：已展开的模块 ID 集合（与 sidebar-interactions.ts 共用） */
const MODULE_EXPANDED_KEY = 'fandex-sidebar-expanded';

/**
 * 读取已展开模块集合
 * @returns 已展开的 moduleId 集合；localStorage 不可用时返回空集
 */
function readExpandedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(MODULE_EXPANDED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * 写入已展开模块集合
 * @param set - 已展开的 moduleId 集合
 */
function writeExpandedSet(set: Set<string>): void {
  try {
    localStorage.setItem(MODULE_EXPANDED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

/**
 * 获取模块主分类颜色（用于色条/圆点）
 * @param m - 模块元数据
 * @returns 颜色字符串，未知分类回退到 tools 色
 */
function moduleColor(m: Module | undefined): string {
  if (!m) return categoryColors.tools ?? '';
  return categoryColors[getPrimaryCategory(m)] ?? categoryColors.tools ?? '';
}

/**
 * 生成 --module-color 的 inline style 字符串
 * 仅在颜色非空时设置，避免空串导致 var() fallback 失效
 * @param m - 模块元数据
 * @returns style 字符串或 undefined
 */
function moduleColorStyle(m: Module | undefined): string | undefined {
  const color = moduleColor(m);
  return color ? `--module-color:${color}` : undefined;
}

/**
 * 全部模块面板组件
 * 渲染结构复刻旧服务端版本，保证样式与无障碍语义不变。
 */
export default function SidebarModules({ moduleId, currentSlug }: SidebarModulesProps) {
  const base = import.meta.env.BASE_URL;
  const categories = getCategories();
  /** 界面语言（展开/收起 aria 文案双语） */
  const lang = useLang();

  // 将轻量索引按模块分组（构建期已按 module + order 排序，分组后顺序稳定）
  const docsByModule = useMemo(() => {
    const map = new Map<string, DocIndexItem[]>();
    for (const doc of docIndexData as DocIndexItem[]) {
      const list = map.get(doc.module) ?? [];
      list.push(doc);
      map.set(doc.module, list);
    }
    return map;
  }, []);

  // 模块展开状态（与全局脚本共用 localStorage，页面切换后恢复）
  const [expanded, setExpanded] = useState<Set<string>>(() => readExpandedSet());

  /** 切换模块子文档列表展开/收起 */
  const toggleModule = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      writeExpandedSet(next);
      return next;
    });
  };

  return (
    <>
      {categories.map((category: CategoryInfo) => {
        const modulesInCategory = getModulesByCategory(category.id);
        if (modulesInCategory.length === 0) return null;
        return (
          <div className="fndx-sidebar__group" key={category.id}>
            <h3
              className="fndx-sidebar__group-title"
              style={
                category.color
                  ? ({ '--module-color': category.color } as CSSProperties)
                  : undefined
              }
            >
              {category.label}
            </h3>
            <ul className="fndx-sidebar__list">
              {modulesInCategory.map((m: Module) => {
                const moduleDocs = docsByModule.get(m.id) ?? [];
                const hasDocs = moduleDocs.length > 0;
                const isExpanded = expanded.has(m.id);
                return (
                  <li className="fndx-sidebar__module" data-module={m.id} key={m.id}>
                    <div className="fndx-sidebar__module-row">
                      <a
                        href={`${base}${m.id}/`}
                        className={`fndx-sidebar__link${m.id === moduleId ? ' is-active' : ''}`}
                        style={
                          moduleColorStyle(m)
                            ? ({ '--module-color': moduleColor(m) } as CSSProperties)
                            : undefined
                        }
                        aria-current={m.id === moduleId ? 'page' : undefined}
                      >
                        <span className="fndx-sidebar__link-text">{m.title}</span>
                      </a>
                      {hasDocs && (
                        <button
                          type="button"
                          className="fndx-sidebar__module-arrow"
                          aria-label={t(
                            isExpanded ? 'sidebar.moduleToggle.collapse' : 'sidebar.moduleToggle.expand',
                            { title: m.title },
                            lang,
                          )}
                          aria-expanded={isExpanded}
                          data-module-toggle={m.id}
                          onClick={() => toggleModule(m.id)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="fndx-sidebar__module-arrow-icon"
                            aria-hidden="true"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {hasDocs && (
                      <ul
                        className={`fndx-sidebar__module-docs${isExpanded ? '' : ' is-collapsed'}`}
                        data-module={m.id}
                      >
                        {moduleDocs.map((doc: DocIndexItem) => {
                          // doc.slug 已是与 docSlug(collectionId) 等价的 slug
                          const docIsActive = m.id === moduleId && currentSlug === doc.slug;
                          return (
                            <li key={doc.slug}>
                              <a
                                href={`${base}${m.id}/${doc.slug}/`}
                                className={`fndx-sidebar__link fndx-sidebar__link--sub${docIsActive ? ' is-active' : ''}`}
                                style={
                                  moduleColorStyle(m)
                                    ? ({ '--module-color': moduleColor(m) } as CSSProperties)
                                    : undefined
                                }
                                aria-current={docIsActive ? 'page' : undefined}
                              >
                                <span className="fndx-sidebar__link-text">{doc.title}</span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}
