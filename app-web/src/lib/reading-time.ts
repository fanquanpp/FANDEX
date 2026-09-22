
export function computeReadingTime(body: string, readingTime?: number): number {
  if (readingTime && readingTime > 0) return readingTime;
  const stripped = body.replace(/```[\s\S]*?```/g, '').replace(/[#*`~[]()>_!|-]/g, '');
  const chars = stripped.replace(/\s/g, '').length;
  return Math.max(1, Math.ceil(chars / 300));
}
