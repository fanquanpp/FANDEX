export function initAnimations() {
  // Card hover effect via CSS class
  document.querySelectorAll<HTMLElement>('.module-card').forEach((card) => {
    card.addEventListener('mouseenter', () => card.classList.add('card-hovered'));
    card.addEventListener('mouseleave', () => card.classList.remove('card-hovered'));
  });

  // Smooth scroll for anchor links within #app-main
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      e.preventDefault();
      const main = document.getElementById('app-main');
      if (main) {
        const mainRect = main.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        main.scrollTo({
          top: main.scrollTop + targetRect.top - mainRect.top - 20,
          behavior: 'smooth',
        });
      }
    });
  });

  // 注：侧边栏过渡动画已由 layout-components.css 中 .fndx-sidebar 的 transition 属性直接控制，
  // 不再需要通过 JS 添加 sidebar-animated 类。旧 module-sidebar ID 已迁移为 app-sidebar。
}
