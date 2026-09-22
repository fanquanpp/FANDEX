
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const ROOT_SELECTOR = '#sidebar-all-modules-scroll';
const PANEL_SELECTOR = '#sidebar-all-modules-panel';
const MOUNTED_ATTR = 'data-sidebar-modules-mounted';

let rootInstance: Root | null = null;

function parseProps(container: HTMLElement): {
  moduleId: string;
  currentSlug?: string;
} | null {
  const moduleId = container.getAttribute('data-module-id');
  if (!moduleId) return null;
  const currentSlug = container.getAttribute('data-current-slug') || undefined;
  const props: { moduleId: string; currentSlug?: string } = { moduleId };
  if (currentSlug) props.currentSlug = currentSlug;
  return props;
}

export function mountSidebarModules(): void {
  const container = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  if (!container || container.hasAttribute(MOUNTED_ATTR)) return;

  const props = parseProps(container);
  if (!props) return;

  container.setAttribute(MOUNTED_ATTR, 'true');
  import('@/islands/SidebarModules')
    .then(({ default: SidebarModules }) => {
      if (!document.querySelector(ROOT_SELECTOR)) return;
      rootInstance = createRoot(container);
      rootInstance.render(createElement(SidebarModules, props));
    })
    .catch((err: unknown) => {
      console.error('[sidebar-modules-mount] 挂载失败:', err);
      container.removeAttribute(MOUNTED_ATTR);
    });
}

function cleanupSidebarModules(): void {
  rootInstance?.unmount();
  rootInstance = null;
  document
    .querySelectorAll<HTMLElement>(`[${MOUNTED_ATTR}]`)
    .forEach((el) => el.removeAttribute(MOUNTED_ATTR));
}

function ensureMountedWhenVisible(): void {
  requestAnimationFrame(() => {
    const panel = document.querySelector<HTMLElement>(PANEL_SELECTOR);
    if (panel && !panel.classList.contains('is-hidden')) {
      mountSidebarModules();
    }
  });
}

document.addEventListener('fandex-switch-modules', mountSidebarModules);

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('.fndx-sidebar__view-tab[data-view="modules"]')) {
    mountSidebarModules();
  }
});

ensureMountedWhenVisible();

document.addEventListener('astro:page-load', () => {
  cleanupSidebarModules();
  ensureMountedWhenVisible();
});
