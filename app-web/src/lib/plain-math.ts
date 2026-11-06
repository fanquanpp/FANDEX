/**
 * 纯文本通道的行内 LaTeX 清洗（视检第 2 期第 1 项）。
 *
 * frontmatter 的 title/description 面向文档页 KaTeX 通道书写；侧栏链接、
 * 模块文档卡、算法课程卡、面包屑、上一篇/下一篇、学习路径节点等纯文本
 * 通道不经过 KaTeX，直接输出会露出成对 $ 与反斜杠命令。本函数把
 * 「像公式的 $...$ 片段」转成可读明文（O(n^2) → O(n²)），非数学片段
 * （shell 的 $@、MongoDB 的 $match/$sort 等工具字面量）原样保留。
 *
 * 片段保留判据（命中其一即整体原样返回，含 $ 定界符）：
 * - 含 @（shell 位置参数等）；
 * - 含 CJK（数学片段不会含汉字，正文成对 $ 的误配对由此兜住）；
 * - 匹配 ^[a-z0-9-]+\/$（MongoDB $match/$ 这类「工具名+/」形态）。
 */

const SYMBOLS: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  Delta: 'Δ',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  phi: 'φ',
  omega: 'ω',
  Omega: 'Ω',
  times: '×',
  cdot: '·',
  div: '÷',
  pm: '±',
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  neq: '≠',
  approx: '≈',
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  mapsto: '↦',
  infty: '∞',
  sum: 'Σ',
  prod: 'Π',
  sqrt: '√',
  in: '∈',
  forall: '∀',
  exists: '∃',
  log: 'log',
  ln: 'ln',
  lg: 'lg',
  exp: 'exp',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
};

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  n: 'ⁿ',
  i: 'ⁱ',
};

const SUBSCRIPT: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

function superscriptify(body: string): string {
  if (/^[0-9]+$/.test(body)) {
    return [...body].map((ch) => SUPERSCRIPT[ch] ?? ch).join('');
  }
  if (body.length === 1 && SUPERSCRIPT[body]) return SUPERSCRIPT[body];
  return `^(${body})`;
}

function convertMathSpan(span: string): string {
  let s = span;
  // \text{...} / \mathrm{...} 等：去壳留内容
  s = s.replace(/\\(?:text|mathrm|mathit|operatorname)\{([^{}]*)\}/g, '$1');
  // 手写空隙（\, \; \: \! 与「\ 」）统一为空格
  s = s.replace(/\\[,;:!]/g, ' ').replace(/\\ /g, ' ');
  // 命令替换：符号表命中取符号，未命中退化为命令名（\log -> log）
  s = s.replace(/\\([a-zA-Z]+)/g, (_m, name: string) => SYMBOLS[name] ?? name);
  // 上标：^{...} 与 ^x；下标：_{...} 保留内容、_x 数字折叠
  s = s.replace(/\^\{([^{}]+)\}/g, (_m, body: string) => superscriptify(body));
  s = s.replace(/\^([0-9a-zA-Z])/g, (_m, ch: string) => SUPERSCRIPT[ch] ?? `^${ch}`);
  s = s.replace(/_\{([^{}]+)\}/g, (_m, body: string) => `_${body}`);
  s = s.replace(/_([0-9])/g, (_m, ch: string) => SUBSCRIPT[ch] ?? `_${ch}`);
  // 剩余分组花括号去除（内容保留）
  s = s.replace(/[{}]/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

export function toPlainTextMath(input: string): string {
  if (!input || input.indexOf('$') < 0) return input;
  return input.replace(/\$([^$\n]+)\$/g, (whole, span: string) => {
    if (span.indexOf('@') >= 0) return whole;
    if (/[\u4e00-\u9fff]/.test(span)) return whole;
    if (/^[a-z0-9-]+\/$/i.test(span)) return whole;
    return convertMathSpan(span);
  });
}
