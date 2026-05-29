const MAX_MATCHES = 50;
const GLOSSARY_URL = `${import.meta.env.BASE_URL}data/glossary-index.json`;

let glossaryData: Record<string, { module: string; def: string; slug: string }> | null = null;

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

function createTooltip(
  term: string,
  data: { module: string; def: string; slug: string }
): HTMLElement {
  const tip = document.createElement('span');
  tip.className = 'term-tip';
  tip.setAttribute('data-term', term);

  const abbr = document.createElement('abbr');
  abbr.className = 'term-abbr';
  abbr.title = data.def;
  abbr.textContent = term;

  const popup = document.createElement('span');
  popup.className = 'term-popup';
  popup.innerHTML = `<span class="term-popup-def">${data.def}</span><a class="term-popup-link" href="${import.meta.env.BASE_URL}${data.slug}">查看详情</a>`;

  tip.appendChild(abbr);
  tip.appendChild(popup);
  return tip;
}

function processTextNode(textNode: Text, terms: string[], matched: Set<string>): number {
  const text = textNode.textContent || '';
  let count = 0;

  const sortedTerms = terms
    .filter((t) => !matched.has(t) && text.includes(t))
    .sort((a, b) => b.length - a.length);

  if (sortedTerms.length === 0) return 0;

  const firstTerm = sortedTerms[0];
  const idx = text.indexOf(firstTerm);
  if (idx === -1) return 0;

  const before = text.substring(0, idx);
  const after = text.substring(idx + firstTerm.length);

  const parent = textNode.parentNode;
  if (!parent) return 0;

  const data = glossaryData![firstTerm];
  if (!data) return 0;

  if (before) parent.insertBefore(document.createTextNode(before), textNode);

  const tip = createTooltip(firstTerm, data);
  parent.insertBefore(tip, textNode);

  if (after) {
    const afterNode = document.createTextNode(after);
    parent.insertBefore(afterNode, textNode);
  }

  parent.removeChild(textNode);
  matched.add(firstTerm);
  count++;

  return count;
}

function walkTextNodes(root: Node, terms: string[], matched: Set<string>, limit: number): number {
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
    count += processTextNode(textNode, terms, matched);
  }

  return count;
}

export async function initTermTooltip() {
  const data = await loadGlossary();
  if (!data || Object.keys(data).length === 0) return;

  const article = document.querySelector('article.prose');
  if (!article) return;

  const terms = Object.keys(data).sort((a, b) => b.length - a.length);
  const matched = new Set<string>();

  walkTextNodes(article, terms, matched, MAX_MATCHES);
}
