/**
 * 首页 — 模块卡片网格
 *
 * 功能概述：
 * - 从 @fandex/utils/modules 共享包实时读取模块列表（三端统一数据源）
 * - 按分类分组展示模块卡片
 * - 点击卡片跳转到模块详情页 /module/:id
 *
 * 设计要点：
 * - 零硬编码：所有模块数据从共享元数据实时读取
 * - 分类颜色统一：引用 categoryColors 映射
 * - 响应式网格：自适应不同屏幕尺寸
 * - 暗色模式：通过 useColorScheme 自动切换
 */

import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from 'react-native';

// 从 desktop 端模块访问层导入（底层为 @fandex/utils/modules 共享包）
import {
  modules,
  categoryLabels,
  categoryColors,
  categoryOrder,
  toModuleRoute,
} from './lib/modules';

/** 主题色配置 — 引用 shd-shared/tokens 令牌体系的色值 */
const COLORS = {
  light: {
    background: '#ffffff',
    text: '#0a0a0f',
    textSecondary: '#6b7280',
    card: '#f8f9fa',
    cardBorder: '#e5e7eb',
    categoryHeader: '#4f5bd5',
  },
  dark: {
    background: '#0a0a0f',
    text: '#f8f9fa',
    textSecondary: '#9ca3af',
    card: '#1a1a2e',
    cardBorder: '#2a2a3e',
    categoryHeader: '#6b7af7',
  },
} as const;

/**
 * 首页组件
 *
 * 渲染流程：
 * 1. 按 categoryOrder 顺序遍历分类
 * 2. 每个分类下渲染模块卡片网格
 * 3. 点击卡片跳转到 /module/:id 路由
 */
export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {categoryOrder.map((categoryId) => {
        const categoryLabel = categoryLabels[categoryId] ?? categoryId;
        const categoryColor = categoryColors[categoryId] ?? colors.categoryHeader;
        const categoryModules = modules.filter((m) => m.categories.includes(categoryId));

        if (categoryModules.length === 0) return null;

        return (
          <View key={categoryId} style={styles.categorySection}>
            <Text
              style={[
                styles.categoryTitle,
                { color: categoryColor },
              ]}
            >
              {categoryLabel}
            </Text>
            <View style={styles.cardGrid}>
              {categoryModules.map((module) => (
                <Pressable
                  key={module.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => router.push(toModuleRoute(module.id))}
                >
                  <View
                    style={[
                      styles.cardIcon,
                      { backgroundColor: categoryColor },
                    ]}
                  >
                    <Text style={styles.cardIconText}>{module.icon}</Text>
                  </View>
                  <Text
                    style={[styles.cardTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {module.title}
                  </Text>
                  <Text
                    style={[styles.cardDescription, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {module.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
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
    gap: 24,
  },
  categorySection: {
    gap: 12,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    paddingHorizontal: 4,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: 180,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});
