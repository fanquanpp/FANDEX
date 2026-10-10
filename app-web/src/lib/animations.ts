export function initAnimations(): void {
  document.querySelectorAll<HTMLElement>('.module-card').forEach((card) => {
    if (card.dataset.bound === '1') return;
    card.dataset.bound = '1';
    card.addEventListener('mouseenter', () => card.classList.add('card-hovered'));
    card.addEventListener('mouseleave', () => card.classList.remove('card-hovered'));
  });

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    // 独立标记，避免与 TOC 链接的 dataset.bound 冲突（两者都会绑定 a[href^="#"]）
    if (anchor.dataset.smoothBound === '1') return;
    anchor.dataset.smoothBound = '1';

    anchor.addEventListener('click', (e) => {
      // TOC 链接与标题 # 锚点各自有带偏移/复制逻辑的专属处理器，
      // 放行给它们处理（preventDefault 由各自处理器负责）
      if (anchor.classList.contains('fndx-toc__link')) return;
      if (anchor.classList.contains('heading-anchor')) return;

      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      // 标题 id 可能以数字开头（如 "#1-问题引入"），这类字符串不是合法的
      // CSS 选择器，querySelector 会直接抛 TypeError；getElementById
      // 按字面 id 匹配，无此限制。中文与百分号编码也一并兼容。
      let id = href.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        /* 保留原样（编码残缺时按字面匹配） */
      }
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      // scrollIntoView 会按目标的 scroll-margin-top 计算落点，
      // 避免标题被置顶的文档标题栏遮住
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', href);
    });
  });
}
