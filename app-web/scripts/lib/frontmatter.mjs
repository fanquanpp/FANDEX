
import matter from 'gray-matter';

export function parseFrontmatter(raw) {
  const present = /^\uFEFF?---\r?\n/.test(raw);
  if (!present) {
    return { present: false, data: {}, content: raw, fm: '' };
  }
  const parsed = matter(raw);
  return { present: true, data: parsed.data ?? {}, content: parsed.content, fm: parsed.matter };
}
