
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import {
  categoryColors,
  getModulesByCategory,
  getPrimaryCategory,
  type Module,
} from '@/lib/modules';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';
import { getCategories, type CategoryInfo } from '@/services/module-service';

interface SidebarModulesProps {
  moduleId: string;
  currentSlug?: string;
  /** SSR 注入的各模块文档计数（Sidebar.astro data-module-doc-counts），决定展开箭头显隐 */
  moduleDocCounts?: Record<string, number>;
}

/** public/data/doc-index/{module}.json 分块形状（scripts/build-stats.mjs 产出） */
interface ModuleDocChunk {
  module: string;
  docs: Array<{ slug: string; title: string; order: number }>;
}

type ChunkState =
  | { status: 'loading' }
  | { status: 'ready'; docs: ModuleDocChunk['docs'] }
  | { status: 'error' };

const MODULE_EXPANDED_KEY = 'fandex-sidebar-expanded';

// 会话级分块缓存：astro:page-load 会卸载重挂岛屿，缓存避免已看过的模块列表重复请求
const chunkCache = new Map<string, ModuleDocChunk['docs']>();

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

function writeExpandedSet(set: Set<string>): void {
  try {
    localStorage.setItem(MODULE_EXPANDED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

function moduleColor(m: Module | undefined): string {
  if (!m) return categoryColors.tools ?? '';
  return categoryColors[getPrimaryCategory(m)] ?? categoryColors.tools ?? '';
}

function moduleColorStyle(m: Module | undefined): string | undefined {
  const color = moduleColor(m);
  return color ? `--module-color:${color}` : undefined;
}

export default function SidebarModules({
  moduleId,
  currentSlug,
  moduleDocCounts,
}: SidebarModulesProps) {
  const base = import.meta.env.BASE_URL;
  const categories = getCategories();
  const lang = useLang();

  const [chunkStates, setChunkStates] = useState<Record<string, ChunkState>>(() => {
    const initial: Record<string, ChunkState> = {};
    for (const [id, docs] of chunkCache) initial[id] = { status: 'ready', docs };
    return initial;
  });

  const [expanded, setExpanded] = useState<Set<string>>(() => readExpandedSet());

  const loadChunk = useCallback(
    (id: string): void => {
      setChunkStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
      fetch(`${base}data/doc-index/${id}.json`)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const chunk = (await res.json()) as ModuleDocChunk;
          const docs = Array.isArray(chunk?.docs) ? chunk.docs : [];
          chunkCache.set(id, docs);
          setChunkStates((prev) => ({ ...prev, [id]: { status: 'ready', docs } }));
        })
        .catch((err: unknown) => {
          console.warn(`[sidebar-modules] 文档分块加载失败（${id}）:`, err);
          setChunkStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
        });
    },
    [base],
  );

  // 展开时才按需拉取该模块分块；覆盖挂载时已处于展开态的模块（localStorage 恢复）
  useEffect(() => {
    expanded.forEach((id) => {
      if (!chunkCache.has(id)) loadChunk(id);
    });
  }, [expanded, loadChunk]);

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
                const hasDocs = (moduleDocCounts?.[m.id] ?? 0) > 0;
                const isExpanded = expanded.has(m.id);
                const chunkState = chunkStates[m.id];
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
                        {isExpanded &&
                          chunkState?.status === 'ready' &&
                          chunkState.docs.map((doc) => {
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
                        {isExpanded && chunkState?.status === 'error' && (
                          <li>
                            <button
                              type="button"
                              className="fndx-sidebar__link fndx-sidebar__link--sub"
                              style={
                                {
                                  width: '100%',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  background: 'none',
                                  border: 'none',
                                  font: 'inherit',
                                  color: 'inherit',
                                } as CSSProperties
                              }
                              onClick={() => loadChunk(m.id)}
                            >
                              <span className="fndx-sidebar__link-text">
                                {lang === 'en'
                                  ? 'Failed to load list, tap to retry'
                                  : '列表加载失败，点击重试'}
                              </span>
                            </button>
                          </li>
                        )}
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
