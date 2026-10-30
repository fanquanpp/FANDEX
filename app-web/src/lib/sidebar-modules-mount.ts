
// React 与 react-dom/client 必须与岛屿同一懒加载边界：
// 此前顶层静态 import 会把 createRoot 渲染路径打进文档页必经的 Sidebar 脚本 chunk，
// 使「全部模块」面板的 React 依赖成为首屏静态图的一部分；islands/SidebarModules
// 内联的 doc-index.json（约 187KB 原始 / 70KB gzip）也只在用户切到该面板时才有意义。
// 改为动态 import 后，React 渲染运行时与数据 JSON 都延迟到面板真正可见时才加载，
// 从不打开该面板的用户全程零成本。
type ReactModule = typeof import('react');
type ReactDomClientModule = typeof import('react-dom/client');
type SidebarModulesModule = typeof import('@/islands/SidebarModules');

const ROOT_SELECTOR = '#sidebar-all-modules-scroll';
const PANEL_SELECTOR = '#sidebar-all-modules-panel';
const MOUNTED_ATTR = 'data-sidebar-modules-mounted';

let rootInstance: import('react-dom/client').Root | null = null;

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

async function loadSidebarModules(): Promise<{
  react: ReactModule;
  client: ReactDomClientModule;
  SidebarModules: SidebarModulesModule['default'];
} | null> {
  try {
    const [react, client, island] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('@/islands/SidebarModules'),
    ]);
    return { react, client, SidebarModules: island.default };
  } catch (err: unknown) {
    console.error('[sidebar-modules-mount] 挂载失败:', err);
    return null;
  }
}

let loaded: Promise<{
  react: ReactModule;
  client: ReactDomClientModule;
  SidebarModules: SidebarModulesModule['default'];
} | null> | null = null;

function loadOnce(): Promise<{
  react: ReactModule;
  client: ReactDomClientModule;
  SidebarModules: SidebarModulesModule['default'];
} | null> {
  loaded ??= loadSidebarModules();
  return loaded;
}

export function mountSidebarModules(): void {
  const container = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  if (!container || container.hasAttribute(MOUNTED_ATTR)) return;

  const props = parseProps(container);
  if (!props) return;

  container.setAttribute(MOUNTED_ATTR, 'true');
  loadOnce().then((mods) => {
    if (!mods) {
      container.removeAttribute(MOUNTED_ATTR);
      return;
    }
    //astro:page-load 导航后容器可能已被替换，挂载前再确认一次
    const target = document.querySelector<HTMLElement>(ROOT_SELECTOR);
    if (!target) return;
    rootInstance = mods.client.createRoot(target);
    rootInstance.render(mods.react.createElement(mods.SidebarModules, props));
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
