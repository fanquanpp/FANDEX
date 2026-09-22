function initAlgoExtGroups(): void {
  const groups = document.querySelectorAll<HTMLElement>('[data-ext-group]');
  groups.forEach((group, index) => {
    if (group.dataset.extBound === 'true') return;
    group.dataset.extBound = 'true';

    // 渐进增强：SSR 全部展开，脚本就绪后收起首组以外的分组；
    // 未加载 JS 时按钮不可用但内容完整可见
    if (index > 0) group.classList.add('collapsed');

    const toggle = group.querySelector<HTMLButtonElement>('[data-ext-toggle]');
    if (!toggle) return;

    const syncAria = (): void => {
      toggle.setAttribute(
        'aria-expanded',
        group.classList.contains('collapsed') ? 'false' : 'true',
      );
    };
    syncAria();

    toggle.addEventListener('click', () => {
      group.classList.toggle('collapsed');
      syncAria();
    });
  });
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initAlgoExtGroups);
}
