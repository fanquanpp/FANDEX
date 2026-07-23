/**
 * 模块详情页 — 展示模块信息与文档列表占位
 *
 * 功能概述：
 * - 从路由参数获取模块 ID
 * - 从共享元数据读取模块信息（标题、描述、图标、分类）
 * - 展示模块前置依赖列表
 * - 文档列表当前为占位（后续接入内容渲染后填充）
 *
 * 设计要点：
 * - 路由匹配：app/module/[id].tsx → /module/:id
 * - 零硬编码：模块数据从 @fandex/utils/modules 共享包实时读取
 * - 暗色模式适配：通过 useColorScheme 自动切换
 * - 扩展预留：文档列表区域为 placeholder，后续接入内容渲染
 */

import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';

// 从 desktop 端模块访问层导入查询函数
import {
  getModule,
  getPrerequisites,
  categoryLabels,
  categoryColors,
  toModuleRoute,
} from '../lib/modules';

/** 主题色配置 */
const COLORS = {
  light: {
    background: '#ffffff',
    text: '#0a0a0f',
    textSecondary: '#6b7280',
    card: '#f8f9fa',
    cardBorder: '#e5e7eb',
    accent: '#4f5bd5',
  },
  dark: {
    background: '#0a0a0f',
    text: '#f8f9fa',
    textSecondary: '#9ca3af',
    card: '#1a1a2e',
    cardBorder: '#2a2a3e',
    accent: '#6b7af7',
  },
} as const;

/**
 * 模块详情页组件
 *
 * 渲染流程：
 * 1. 从路由参数解析模块 ID
 * 2. 查询模块信息与前置依赖
 * 3. 渲染模块头部（图标、标题、描述、分类标签）
 * 4. 渲染前置依赖列表
 * 5. 渲染文档列表占位区域
 */
export default function ModuleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

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
          <View
            style={[styles.moduleIcon, { backgroundColor: categoryColor }]}
          >
            <Text style={styles.moduleIconText}>{moduleInfo.icon}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.moduleTitle, { color: colors.text }]}>
              {moduleInfo.title}
            </Text>
            <View
              style={[styles.categoryTag, { backgroundColor: categoryColor }]}
            >
              <Text style={styles.categoryTagText}>{categoryLabel}</Text>
            </View>
          </View>
        </View>
        <Text
          style={[styles.moduleDescription, { color: colors.textSecondary }]}
        >
          {moduleInfo.description}
        </Text>
      </View>

      {/* ========== 前置依赖 ========== */}
      {prerequisites.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            前置依赖
          </Text>
          <View style={styles.prereqList}>
            {prerequisites.map((prereq) => (
              <View
                key={prereq.id}
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
                    { backgroundColor: categoryColors[prereq.categories[0] ?? ''] ?? colors.accent },
                  ]}
                >
                  <Text style={styles.prereqIconText}>{prereq.icon}</Text>
                </View>
                <Text style={[styles.prereqTitle, { color: colors.text }]}>
                  {prereq.title}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ========== 文档列表占位 ========== */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          文档列表
        </Text>
        <View
          style={[
            styles.placeholderCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text
            style={[styles.placeholderText, { color: colors.textSecondary }]}
          >
            文档内容渲染将在后续版本接入
          </Text>
          <Text
            style={[styles.placeholderHint, { color: colors.textSecondary }]}
          >
            当前阶段为骨架搭建，文档列表由内容渲染层填充
          </Text>
        </View>
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
  placeholderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  placeholderHint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
