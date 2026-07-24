/**
 * 文档详情页 — 渲染 Markdown 文档内容
 *
 * 功能概述：
 * - 从路由参数获取模块 ID 与文档 slug
 * - 异步加载文档 Markdown 原文（从 public/content/<module>/<slug>.md）
 * - 解析 frontmatter 提取标题、描述、难度等元信息
 * - 使用 MarkdownRenderer 组件渲染 Markdown 正文
 * - 提供返回按钮、加载态、错误重试
 *
 * 设计要点：
 * - 路由匹配：app/module/[id]/[slug].tsx → /module/:id/:slug
 * - slug 为文档名称（不含模块前缀），需与模块 ID 拼接为完整路径
 * - Markdown 渲染由 MarkdownRenderer 组件承担，本页只负责数据加载与布局
 * - 暗色模式适配：通过 useColorScheme 自动切换
 */

import { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';

// 文档数据访问层
import { fetchDocContent, type DocContent } from '../../lib/docs';
// Markdown 渲染器
import MarkdownRenderer from '../../components/MarkdownRenderer';

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

/** 难度标签映射 */
const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '入门',
  intermediate: '中级',
  advanced: '高级',
};

/**
 * 文档详情页组件
 *
 * 渲染流程：
 * 1. 从路由参数解析模块 ID 与文档 slug
 * 2. 异步 fetch 文档 Markdown 原文
 * 3. 解析 frontmatter 提取元信息
 * 4. 渲染自定义导航栏（返回按钮 + 文档标题）
 * 5. 渲染文档元信息（难度、更新日期）
 * 6. 使用 MarkdownRenderer 渲染正文
 */
export default function DocDetailScreen() {
  const { id, slug } = useLocalSearchParams<{ id: string; slug: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  // 文档内容状态
  const [doc, setDoc] = useState<DocContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 异步加载文档内容
  const loadDoc = useCallback(async (moduleId: string, docSlug: string) => {
    setLoading(true);
    setError(null);
    try {
      // slug 参数为文档名称（不含模块前缀），需拼接为完整路径
      const fullSlug = `${moduleId}/${decodeURIComponent(docSlug)}`;
      const content = await fetchDocContent(moduleId, fullSlug);
      setDoc(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文档加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id && slug) {
      loadDoc(id, slug);
    }
  }, [id, slug, loadDoc]);

  // 从 meta 提取展示信息
  const title = doc?.meta.title ?? decodeURIComponent(slug ?? '未命名文档');
  const description = doc?.meta.description;
  const difficulty = doc?.meta.difficulty ?? 'intermediate';
  const updated = doc?.meta.updated;
  const diffLabel = DIFFICULTY_LABELS[difficulty] ?? difficulty;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ========== 自定义导航栏 ========== */}
      <View
        style={[
          styles.navBar,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.backButtonText, { color: colors.accent }]}>{'\u2190 返回'}</Text>
        </Pressable>
        <Text
          style={[styles.navTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {/* 右侧占位，保持标题居中 */}
        <View style={styles.navRight} />
      </View>

      {/* ========== 内容区域 ========== */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 加载中 */}
        {loading && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              正在加载文档...
            </Text>
          </View>
        )}

        {/* 加载失败 */}
        {error && (
          <View style={styles.centerState}>
            <Text style={[styles.errorTitle, { color: colors.difficultyText.advanced }]}>
              文档加载失败
            </Text>
            <Text style={[styles.errorDetail, { color: colors.textSecondary }]}>
              {error}
            </Text>
            <Pressable
              onPress={() => id && slug && loadDoc(id, slug)}
              style={[styles.retryButton, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.retryButtonText}>重试</Text>
            </Pressable>
          </View>
        )}

        {/* 文档内容 */}
        {!loading && !error && doc && (
          <>
            {/* 文档头部信息 */}
            <View style={styles.docHeader}>
              <Text style={[styles.docTitle, { color: colors.text }]}>{title}</Text>
              {description && (
                <Text style={[styles.docDescription, { color: colors.textSecondary }]}>
                  {description}
                </Text>
              )}
              {/* 元信息行 */}
              <View style={styles.docMetaRow}>
                {/* 难度标签 */}
                <View
                  style={[
                    styles.difficultyBadge,
                    {
                      backgroundColor:
                        colors.difficultyBg[difficulty as keyof typeof colors.difficultyBg] ??
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
                            difficulty as keyof typeof colors.difficultyText
                          ] ?? colors.textSecondary,
                      },
                    ]}
                  >
                    {diffLabel}
                  </Text>
                </View>
                {/* 更新日期 */}
                {updated && (
                  <Text style={[styles.metaItem, { color: colors.textTertiary }]}>
                    更新于 {new Date(updated).toLocaleDateString('zh-CN')}
                  </Text>
                )}
              </View>
            </View>

            {/* 分割线 */}
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            {/* Markdown 正文 */}
            <MarkdownRenderer content={doc.body} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** 样式定义 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 导航栏
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  navRight: {
    width: 60,
  },
  // 滚动容器
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  // 居中状态（loading / error）
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  errorDetail: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  // 文档头部
  docHeader: {
    gap: 8,
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  docDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  metaItem: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
});
