/**
 * 模块详情页 — 展示模块信息与文档列表
 *
 * 功能概述：
 * - 从路由参数获取模块 ID
 * - 从共享元数据读取模块信息（标题、描述、图标、分类）
 * - 异步加载该模块下的文档列表（从 public/data/module-docs-index.json）
 * - 展示模块前置依赖列表
 * - 文档列表按 order 排序，点击跳转到文档详情页
 *
 * 设计要点：
 * - 路由匹配：app/module/[id]/index.tsx → /module/:id
 * - 零硬编码：模块数据从 @fandex/utils/modules 共享包实时读取
 * - 文档列表通过 @lib/docs 异步 fetch 加载，带 loading/error 状态
 * - 暗色模式适配：通过 useColorScheme 自动切换
 */

import { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';

// 从 desktop 端模块访问层导入查询函数
import {
  getModule,
  getPrerequisites,
  categoryLabels,
  categoryColors,
} from '../../lib/modules';

// 从 desktop 端文档访问层导入文档列表查询
import { getModuleDocs, type DocIndexEntry } from '../../lib/docs';

/** 主题色配置 */
const COLORS = {
  light: {
    background: '#ffffff',
    text: '#0a0a0f',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    card: '#f8f9fa',
    cardBorder: '#e5e7eb',
    accent: '#4f5bd5',
    difficultyBg: { beginner: '#e8f5e9', intermediate: '#fff3e0', advanced: '#fce4ec' },
    difficultyText: { beginner: '#2e7d32', intermediate: '#e65100', advanced: '#c62828' },
  },
  dark: {
    background: '#0a0a0f',
    text: '#f8f9fa',
    textSecondary: '#9ca3af',
    textTertiary: '#6b7280',
    card: '#1a1a2e',
    cardBorder: '#2a2a3e',
    accent: '#6b7af7',
    difficultyBg: { beginner: '#1b3a1b', intermediate: '#3e2723', advanced: '#3b1010' },
    difficultyText: { beginner: '#81c784', intermediate: '#ffb74d', advanced: '#ef9a9a' },
  },
} as const;

/**
 * 难度标签映射
 */
const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '入门',
  intermediate: '中级',
  advanced: '高级',
};

/**
 * 从文档 slug 提取文档名称（去掉模块前缀）
 *
 * @param slug - 文档 slug（格式：<module>/<doc-name>）
 * @returns 文档名称部分
 */
function extractDocName(slug: string): string {
  return slug.includes('/') ? slug.split('/').slice(1).join('/') : slug;
}

/**
 * 模块详情页组件
 *
 * 渲染流程：
 * 1. 从路由参数解析模块 ID
 * 2. 查询模块信息与前置依赖（同步）
 * 3. 异步加载文档列表
 * 4. 渲染模块头部 → 前置依赖 → 文档列表
 */
export default function ModuleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  // 文档列表状态
  const [docs, setDocs] = useState<DocIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 异步加载文档列表
  const loadDocs = useCallback(async (moduleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getModuleDocs(moduleId);
      setDocs(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文档列表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadDocs(id);
    }
  }, [id, loadDocs]);

  const moduleInfo = getModule(id);
  const prerequisites = getPrerequisites(id);

  // 模块不存在时的兜底显示
  if (!moduleInfo) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          模块 "{id}" 未找到
        </Text>
      </View>
    );
  }

  const primaryCategory = moduleInfo.categories[0] ?? '';
  const categoryLabel = categoryLabels[primaryCategory] ?? primaryCategory;
  const categoryColor = categoryColors[primaryCategory] ?? colors.accent;

  /**
   * 跳转到文档详情页
   * @param doc - 文档索引条目
   */
  const navigateToDoc = (doc: DocIndexEntry) => {
    const docName = extractDocName(doc.slug);
    router.push(`/module/${id}/${encodeURIComponent(docName)}`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ========== 模块头部 ========== */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={[styles.moduleIcon, { backgroundColor: categoryColor }]}>
            <Text style={styles.moduleIconText}>{moduleInfo.icon}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.moduleTitle, { color: colors.text }]}>
              {moduleInfo.title}
            </Text>
            <View style={[styles.categoryTag, { backgroundColor: categoryColor }]}>
              <Text style={styles.categoryTagText}>{categoryLabel}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.moduleDescription, { color: colors.textSecondary }]}>
          {moduleInfo.description}
        </Text>
      </View>

      {/* ========== 前置依赖 ========== */}
      {prerequisites.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>前置依赖</Text>
          <View style={styles.prereqList}>
            {prerequisites.map((prereq) => (
              <Pressable
                key={prereq.id}
                onPress={() => router.push(`/module/${prereq.id}`)}
                style={[
                  styles.prereqItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.prereqIcon,
                    {
                      backgroundColor:
                        categoryColors[prereq.categories[0] ?? ''] ?? colors.accent,
                    },
                  ]}
                >
                  <Text style={styles.prereqIconText}>{prereq.icon}</Text>
                </View>
                <Text style={[styles.prereqTitle, { color: colors.text }]}>
                  {prereq.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ========== 文档列表 ========== */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          文档列表
          {docs.length > 0 && (
            <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
              {' '}({docs.length})
            </Text>
          )}
        </Text>

        {/* 加载中 */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              正在加载文档列表...
            </Text>
          </View>
        )}

        {/* 加载失败 */}
        {error && (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.difficultyText.advanced }]}>
              {error}
            </Text>
            <Pressable onPress={() => id && loadDocs(id)}>
              <Text style={[styles.retryText, { color: colors.accent }]}>重试</Text>
            </Pressable>
          </View>
        )}

        {/* 文档列表 */}
        {!loading && !error && docs.length === 0 && (
          <View
            style={[
              styles.placeholderCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              该模块暂无文档
            </Text>
          </View>
        )}

        {!loading && !error && docs.length > 0 && (
          <View style={styles.docList}>
            {docs.map((doc, index) => {
              const diffKey = doc.difficulty || 'intermediate';
              const diffLabel = DIFFICULTY_LABELS[diffKey] ?? diffKey;
              return (
                <Pressable
                  key={doc.slug}
                  onPress={() => navigateToDoc(doc)}
                  style={[
                    styles.docItem,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  {/* 序号 */}
                  <Text style={[styles.docOrder, { color: colors.textTertiary }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  {/* 标题与标签 */}
                  <View style={styles.docInfo}>
                    <Text
                      style={[styles.docTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {doc.title}
                    </Text>
                    <View style={styles.docMeta}>
                      <View
                        style={[
                          styles.difficultyBadge,
                          {
                            backgroundColor:
                              colors.difficultyBg[diffKey as keyof typeof colors.difficultyBg] ??
                              colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.difficultyText,
                            {
                              color:
                                colors.difficultyText[
                                  diffKey as keyof typeof colors.difficultyText
                                ] ?? colors.textSecondary,
                            },
                          ]}
                        >
                          {diffLabel}
                        </Text>
                      </View>
                      {doc.tags.length > 0 && (
                        <Text style={[styles.docTags, { color: colors.textTertiary }]}>
                          {doc.tags.slice(0, 3).join(' · ')}
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/** 样式定义 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  headerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleIconText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700' as const,
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  moduleTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  moduleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    paddingHorizontal: 4,
  },
  prereqList: {
    gap: 8,
  },
  prereqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  prereqIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prereqIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  prereqTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  // 文档列表样式
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  errorCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  placeholderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6b7280',
  },
  docList: {
    gap: 8,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  docOrder: {
    fontSize: 16,
    fontWeight: '700' as const,
    fontFamily: 'monospace',
    minWidth: 28,
  },
  docInfo: {
    flex: 1,
    gap: 4,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  docTags: {
    fontSize: 11,
  },
});
