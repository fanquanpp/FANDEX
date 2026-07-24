/**
 * 学习路线页 — 阶段路线图 + 职业路径
 *
 * 功能概述：
 * - 从 shd-shared/metadata/roadmap/ 实时读取阶段数据与职业路径
 * - 阶段卡片按顺序展示，模块项按箭头方向排列
 * - 职业路径以横向滑动卡片展示学习步骤序列
 *
 * 设计要点：
 * - 零硬编码：所有路线图数据从共享元数据 JSON 实时读取
 * - 暗色模式适配：通过 useColorScheme 自动切换
 * - 模块跳转：点击阶段中的模块项可跳转到模块详情页
 */

import { ScrollView, View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from 'react-native';

// 从共享包导入路线图数据（三端统一数据源，JSON import 兼容 Metro）
import { phases, careerPaths } from '@fandex/utils/roadmap';

// 从共享模块访问层导入查询函数（用于通过模块 ID 获取模块标题）
import { getModule, toModuleRoute } from './lib/modules';

/** 主题色配置 */
const COLORS = {
  light: {
    background: '#ffffff',
    text: '#0a0a0f',
    textSecondary: '#6b7280',
    card: '#f8f9fa',
    cardBorder: '#e5e7eb',
    stepBg: '#f3f4f6',
  },
  dark: {
    background: '#0a0a0f',
    text: '#f8f9fa',
    textSecondary: '#9ca3af',
    card: '#1a1a2e',
    cardBorder: '#2a2a3e',
    stepBg: '#2a2a3e',
  },
} as const;

/**
 * 学习路线页组件
 *
 * 渲染流程：
 * 1. 顶部：阶段路线图（垂直排列，每阶段含模块项与箭头）
 * 2. 底部：职业路径（横向滑动卡片，展示步骤序列）
 */
export default function RoadmapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ========== 阶段路线图 ========== */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          学习阶段
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          从零基础到工程师的完整路径
        </Text>
      </View>

      {phases.map((phase, index) => (
        <View
          key={phase.phase}
          style={[
            styles.phaseCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {/* 阶段标题行 */}
          <View style={styles.phaseHeader}>
            <View
              style={[styles.phaseBadge, { backgroundColor: phase.color }]}
            >
              <Text style={styles.phaseBadgeText}>{phase.phase}</Text>
            </View>
            <View style={styles.phaseTitleContainer}>
              <Text style={[styles.phaseLabel, { color: colors.text }]}>
                {phase.label}
              </Text>
              <Text
                style={[styles.phaseDesc, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {phase.desc}
              </Text>
            </View>
          </View>

          {/* 模块项网格 */}
          <View style={styles.phaseItems}>
            {phase.items.map((item, itemIndex) => {
              const moduleInfo = getModule(item.id);
              return (
                <View key={item.id} style={styles.phaseItemRow}>
                  <Pressable
                    style={[
                      styles.phaseItem,
                      { backgroundColor: colors.stepBg },
                    ]}
                    onPress={() => router.push(toModuleRoute(item.id))}
                  >
                    <View
                      style={[
                        styles.phaseItemDot,
                        { backgroundColor: phase.color },
                      ]}
                    />
                    <Text
                      style={[styles.phaseItemText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {moduleInfo?.title ?? item.id}
                    </Text>
                  </Pressable>
                  {/* 箭头指示器 */}
                  {item.arrow && itemIndex < phase.items.length - 1 && (
                    <Text
                      style={[styles.arrow, { color: colors.textSecondary }]}
                    >
                      {item.arrow === 'right' ? '→' : '↓'}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* 阶段间分隔线 */}
          {index < phases.length - 1 && (
            <View
              style={[styles.phaseDivider, { backgroundColor: colors.cardBorder }]}
            />
          )}
        </View>
      ))}

      {/* ========== 职业路径 ========== */}
      <View style={[styles.sectionHeader, { marginTop: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          职业路径
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          按职业目标选择学习路线
        </Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={careerPaths}
        keyExtractor={(item) => item.label}
        contentContainerStyle={styles.careerPathList}
        renderItem={({ item: path }) => (
          <View
            style={[
              styles.careerPathCard,
              {
                backgroundColor: colors.card,
                borderColor: path.color,
              },
            ]}
          >
            <View
              style={[styles.careerPathHeader, { backgroundColor: path.color }]}
            >
              <Text style={styles.careerPathTitle}>{path.label}</Text>
            </View>
            <View style={styles.careerPathSteps}>
              {path.steps.map((step, stepIndex) => (
                <View key={step.id} style={styles.careerPathStep}>
                  <View
                    style={[
                      styles.stepNumber,
                      { backgroundColor: path.color },
                    ]}
                  >
                    <Text style={styles.stepNumberText}>{stepIndex + 1}</Text>
                  </View>
                  <Pressable
                    onPress={() => router.push(toModuleRoute(step.id))}
                  >
                    <Text
                      style={[styles.stepLabel, { color: colors.text }]}
                    >
                      {step.label}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
      />
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
    gap: 12,
    paddingBottom: 32,
  },
  sectionHeader: {
    gap: 4,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  phaseCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  phaseBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  phaseTitleContainer: {
    flex: 1,
    gap: 2,
  },
  phaseLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  phaseDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  phaseItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  phaseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  phaseItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseItemText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  arrow: {
    fontSize: 14,
  },
  phaseDivider: {
    height: 1,
    marginTop: 4,
  },
  careerPathList: {
    gap: 12,
    paddingRight: 16,
  },
  careerPathCard: {
    width: 260,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  careerPathHeader: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  careerPathTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  careerPathSteps: {
    padding: 12,
    gap: 10,
  },
  careerPathStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
