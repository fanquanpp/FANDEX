const MAX_MATCHES = 50;
const GLOSSARY_URL = `${import.meta.env.BASE_URL}data/glossary-index.json`;

let glossaryData: Record<string, { module: string; def: string; slug: string }> | null = null;
let cachedRegex: RegExp | null = null;
let cachedTermsHash: string = '';

async function loadGlossary() {
  if (glossaryData !== null) return glossaryData;
  try {
    const res = await fetch(GLOSSARY_URL);
    if (!res.ok) return null;
    glossaryData = await res.json();
    return glossaryData;
  } catch {
    return null;
  }
}

function createTermRegex(terms: string[]) {
  const escapedTerms = terms
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?:^|\\W)(${escapedTerms.join('|')})(?:$|\\W)`, 'g');
}

function isMobile() {
  return window.innerWidth <= 768;
}

function closeTermModal() {
  const existing = document.querySelector('.term-modal');
  if (existing) {
    existing.remove();
    document.body.style.overflow = '';
  }
}

function showTermModal(term: string, data: { module: string; def: string; slug: string }) {
  closeTermModal();

  const modal = document.createElement('div');
  modal.className = 'term-modal';

  const overlay = document.createElement('div');
  overlay.className = 'term-modal-overlay';

  const content = document.createElement('div');
  content.className = 'term-modal-content';

  const header = document.createElement('div');
  header.className = 'term-modal-header';

  const h3 = document.createElement('h3');
  h3.className = 'term-modal-title';
  h3.textContent = term;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'term-modal-close';
  closeBtn.setAttribute('aria-label', '关闭');
  closeBtn.textContent = '✕';

  header.appendChild(h3);
  header.appendChild(closeBtn);

  const defDiv = document.createElement('div');
  defDiv.className = 'term-modal-def';
  defDiv.textContent = data.def;

  const link = document.createElement('a');
  link.className = 'term-modal-link';
  link.href = `${import.meta.env.BASE_URL}${data.slug}/`;
  link.textContent = '查看详情 →';

  content.appendChild(header);
  content.appendChild(defDiv);
  content.appendChild(link);
  modal.appendChild(overlay);
  modal.appendChild(content);
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  closeBtn.addEventListener('click', closeTermModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeTermModal();
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeTermModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function createTooltip(
  term: string,
  data: { module: string; def: string; slug: string }
): HTMLElement {
  const tip = document.createElement('span');
  tip.className = 'term-tip';
  tip.setAttribute('data-term', term);
  tip.setAttribute('tabindex', '0');

  const abbr = document.createElement('abbr');
  abbr.className = 'term-abbr';
  abbr.textContent = term;

  const popup = document.createElement('span');
  popup.className = 'term-popup';

  const defSpan = document.createElement('span');
  defSpan.className = 'term-popup-def';
  defSpan.textContent = data.def;
  popup.appendChild(defSpan);

  const link = document.createElement('a');
  link.className = 'term-popup-link';
  link.href = `${import.meta.env.BASE_URL}${data.slug}/`;
  link.textContent = '查看详情';
  popup.appendChild(link);

  tip.appendChild(abbr);
  tip.appendChild(popup);

  function positionPopup() {
    const rect = abbr.getBoundingClientRect();
    const popupWidth = Math.min(320, window.innerWidth - 16);
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + popupWidth > window.innerWidth - 8) {
      left = window.innerWidth - popupWidth - 8;
    }
    if (left < 8) left = 8;
    if (top + 200 > window.innerHeight) {
      top = rect.top - 6;
      popup.style.transform = 'translateY(-100%)';
    } else {
      popup.style.transform = '';
    }
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.maxWidth = popupWidth + 'px';
  }

  if (isMobile()) {
    tip.style.cursor = 'pointer';
    tip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showTermModal(term, data);
    });
  } else {
    tip.addEventListener('mouseenter', () => {
      positionPopup();
    });
  }

  tip.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isMobile()) {
        showTermModal(term, data);
      } else {
        positionPopup();
        popup.style.visibility = 'visible';
        popup.style.opacity = '1';
        setTimeout(() => {
          popup.style.visibility = '';
          popup.style.opacity = '';
        }, 3000);
      }
    }
  });

  return tip;
}

function processTextNode(
  textNode: Text,
  regex: RegExp,
  termsData: Map<string, { module: string; def: string; slug: string }>
) {
  const text = textNode.textContent || '';
  if (!text) return;

  regex.lastIndex = 0;
  const match = regex.exec(text);
  if (!match) return;

  // noUncheckedIndexedAccess：RegExpExecArray 索引访问返回 string | undefined
  // 显式提取并兜底，避免后续 indexOf/get 报错
  const fullMatch = match[0] || '';
  const term = match[1] || '';
  if (!term) return;
  const termOffset = fullMatch.indexOf(term);
  const idx = match.index + termOffset;
  const data = termsData.get(term);
  if (!data) return;

  const parent = textNode.parentNode;
  if (!parent) return;

  const before = text.substring(0, idx);
  const after = text.substring(idx + term.length);

  if (before) parent.insertBefore(document.createTextNode(before), textNode);
  parent.insertBefore(createTooltip(term, data), textNode);
  if (after) {
    const afterNode = document.createTextNode(after);
    parent.insertBefore(afterNode, textNode);
    processTextNode(afterNode, regex, termsData);
  }

  parent.removeChild(textNode);
}

function walkTextNodes(
  root: Node,
  regex: RegExp,
  termsData: Map<string, { module: string; def: string; slug: string }>,
  limit: number
): number {
  let count = 0;
  const SKIP_TAGS = new Set([
    'CODE',
    'PRE',
    'A',
    'ABBR',
    'SCRIPT',
    'STYLE',
    'SVG',
    'KBD',
    'VAR',
    'SAMP',
  ]);

  const walker = document.createTreeWalker(root as Document, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.classList.contains('term-tip')) return NodeFilter.FILTER_REJECT;
      if (parent.classList.contains('term-modal')) return NodeFilter.FILTER_REJECT;
      if (!parent.closest('p, li, td, th, dd, dt, blockquote')) return NodeFilter.FILTER_REJECT;
      const text = node.textContent || '';
      if (text.trim().length < 2) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodesToProcess: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    nodesToProcess.push(node);
  }

  for (const textNode of nodesToProcess) {
    if (count >= limit) break;
    if (!textNode.parentNode) continue;
    processTextNode(textNode, regex, termsData);
    count++;
  }

  return count;
}

export async function initTermTooltip() {
  closeTermModal();

  const data = await loadGlossary();
  if (!data || Object.keys(data).length === 0) return;

  const article = document.querySelector('article.prose');
  if (!article) return;

  const terms = Object.keys(data);
  const termsData = new Map(Object.entries(data));
  const termsHash = terms.join(',');

  if (!cachedRegex || cachedTermsHash !== termsHash) {
    cachedRegex = createTermRegex(terms);
    cachedTermsHash = termsHash;
  }

  walkTextNodes(article, cachedRegex, termsData, MAX_MATCHES);
}
