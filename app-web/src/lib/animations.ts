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
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;

      // TOC 链接与标题 # 锚点各自有带偏移/复制逻辑的专属处理器
      if (anchor.classList.contains('fndx-toc__link')) return;
      if (anchor.classList.contains('heading-anchor')) return;

      e.preventDefault();
      // scrollIntoView 会按目标的 scroll-margin-top 计算落点，
      // 避免标题被置顶的文档标题栏遮住
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', href);
    });
  });
}
