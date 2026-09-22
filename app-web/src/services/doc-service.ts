import { getCollection, type CollectionEntry } from 'astro:content';
import { docSlug } from '@/lib/modules';
import { computeReadingTime } from '@/lib/reading-time';
import docStatsCache from '@/data/doc-stats.json';
import docIndexCache from '@/data/doc-index.json';

type DocEntry = CollectionEntry<'docs'>;

const sortedByModuleCache = new Map<string, DocEntry[]>();
let allDocsCache: DocEntry[] | null = null;

interface DocNavigation {
  prev: DocEntry | null;
  next: DocEntry | null;
}

interface DocStats {
  totalDocs: number;
  totalModules: number;
  totalCategories: number;
}

interface DocIndexItem {
  slug: string;
  module: string;
  title: string;
  order: number;
}

export async function getAllDocs(): Promise<DocEntry[]> {
  if (allDocsCache) return allDocsCache;
  try {
    const docs = await getCollection('docs');
    docs.sort((a, b) => {
      if (a.data.module !== b.data.module) {
        return a.data.module.localeCompare(b.data.module);
      }
      return (a.data.order || 0) - (b.data.order || 0);
    });
    allDocsCache = docs;
    return docs;
  } catch {
    return [];
  }
}

export async function getDocsByModule(moduleId: string): Promise<DocEntry[]> {
  const cached = sortedByModuleCache.get(moduleId);
  if (cached) return cached;
  try {
    const docs = await getCollection('docs', ({ data }) => data.module === moduleId);
    docs.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
    sortedByModuleCache.set(moduleId, docs);
    return docs;
  } catch {
    return [];
  }
}

export async function getDocBySlug(moduleId: string, slug: string): Promise<DocEntry | null> {
  try {
    const docs = await getDocsByModule(moduleId);
    return docs.find((doc) => docSlug(doc.id) === slug) || null;
  } catch {
    return null;
  }
}

export async function getDocNavigation(moduleId: string, slug: string): Promise<DocNavigation> {
  try {
    const docs = await getDocsByModule(moduleId);
    const currentIndex = docs.findIndex((doc) => docSlug(doc.id) === slug);
    if (currentIndex < 0) return { prev: null, next: null };
    const prev = currentIndex > 0 ? (docs[currentIndex - 1] ?? null) : null;
    const next = currentIndex < docs.length - 1 ? (docs[currentIndex + 1] ?? null) : null;
    return { prev, next };
  } catch {
    return { prev: null, next: null };
  }
}

export async function getDocStats(): Promise<DocStats> {
  try {
    return {
      totalDocs: docStatsCache.totalDocs,
      totalModules: docStatsCache.totalModules,
      totalCategories: docStatsCache.totalCategories,
    };
  } catch {
    return { totalDocs: 0, totalModules: 0, totalCategories: 0 };
  }
}

export function getDocsIndex(): DocIndexItem[] {
  try {
    return (docIndexCache as DocIndexItem[]) ?? [];
  } catch {
    return [];
  }
}

export type { DocEntry, DocNavigation, DocStats, DocIndexItem };
export { computeReadingTime, docSlug };
