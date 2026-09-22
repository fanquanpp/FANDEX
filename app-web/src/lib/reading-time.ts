
// CJK 按字数（约 300 字/分钟）+ 拉丁文本按词数（约 200 词/分钟）合并估算
const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

export function computeReadingTime(body: string, readingTime?: number): number {
  if (readingTime && readingTime > 0) return readingTime;
  const stripped = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-|]/g, ' ');
  const cjkChars = (stripped.match(CJK_PATTERN) ?? []).length;
  const latinWords = (stripped
    .replace(CJK_PATTERN, ' ')
    .match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) ?? []).length;
  const minutes = cjkChars / 300 + latinWords / 200;
  return Math.max(1, Math.ceil(minutes));
}
