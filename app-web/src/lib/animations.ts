
export function initAnimations(): void {
  document.querySelectorAll<HTMLElement>('.module-card').forEach((card) => {
    if (card.dataset.bound === '1') return;
    card.dataset.bound = '1';
    card.addEventListener('mouseenter', () => card.classList.add('card-hovered'));
    card.addEventListener('mouseleave', () => card.classList.remove('card-hovered'));
  });

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    if (anchor.dataset.bound === '1') return;
    anchor.dataset.bound = '1';

    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;

      e.preventDefault();
      const main = document.getElementById('app-main');
      if (!main) return;

      const mainRect = main.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      main.scrollTo({
        top: main.scrollTop + targetRect.top - mainRect.top - 20,
        behavior: 'smooth',
      });
    });
  });
}
