
import syntaxIndexCache from '@/data/syntax-index.json';

export interface SyntaxLanguage {
  id: string;
  title: string;
  icon: string;
  color: string;
  count: number;
  docCount: number;
}

interface SyntaxIndexCache {
  version: number;
  languages: SyntaxLanguage[];
}

export interface SyntaxStats {
  totalLanguages: number;
  totalCards: number;
  totalDocs: number;
}

export function getSyntaxIndex(): SyntaxIndexCache {
  const cache = syntaxIndexCache as SyntaxIndexCache;
  return {
    version: cache.version ?? 1,
    languages: Array.isArray(cache.languages) ? cache.languages : [],
  };
}

export function getSyntaxLanguages(): SyntaxLanguage[] {
  return getSyntaxIndex().languages;
}

export function getSyntaxStats(): SyntaxStats {
  const languages = getSyntaxLanguages();
  return {
    totalLanguages: languages.length,
    totalCards: languages.reduce((sum, lang) => sum + lang.count, 0),
    totalDocs: languages.reduce((sum, lang) => sum + lang.docCount, 0),
  };
}
