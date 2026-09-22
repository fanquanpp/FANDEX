
import { useMemo, useState, type CSSProperties } from 'react';
import {
  categoryColors,
  getModulesByCategory,
  getPrimaryCategory,
  type Module,
} from '@/lib/modules';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';
import { getCategories, type CategoryInfo } from '@/services/module-service';
import docIndexData from '@/data/doc-index.json';
import type { DocIndexItem } from '@/services';

interface SidebarModulesProps {
  moduleId: string;
  currentSlug?: string;
}

const MODULE_EXPANDED_KEY = 'fandex-sidebar-expanded';

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

export default function SidebarModules({ moduleId, currentSlug }: SidebarModulesProps) {
  const base = import.meta.env.BASE_URL;
  const categories = getCategories();
  const lang = useLang();

  const docsByModule = useMemo(() => {
    const map = new Map<string, DocIndexItem[]>();
    for (const doc of docIndexData as DocIndexItem[]) {
      const list = map.get(doc.module) ?? [];
      list.push(doc);
      map.set(doc.module, list);
    }
    return map;
  }, []);

  const [expanded, setExpanded] = useState<Set<string>>(() => readExpandedSet());

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
