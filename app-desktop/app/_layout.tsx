/**
 * 根布局 — Expo Router 文件系统路由入口
 *
 * 功能概述：
 * - 提供全局导航容器（Stack Navigator）
 * - 配置主题色与暗色模式适配
 * - 挂载全局 Provider（后续按需扩展）
 *
 * 设计要点：
 * - 使用 expo-router 的 Stack 实现原生级页面转场
 * - 主题色引用 shd-shared/tokens 统一令牌体系
 * - 暗色模式通过 useColorScheme 自动跟随系统
 */

import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

/**
 * 主题色配置
 * 引用 shd-shared/tokens 令牌体系，保持三端视觉一致
 */
const THEME_COLORS = {
  light: {
    background: '#ffffff',
    text: '#0a0a0f',
    primary: '#4f5bd5',
    card: '#f8f9fa',
    border: '#e5e7eb',
  },
  dark: {
    background: '#0a0a0f',
    text: '#f8f9fa',
    primary: '#6b7af7',
    card: '#1a1a2e',
    border: '#2a2a3e',
  },
} as const;

/**
 * 根布局组件
 *
 * 提供：
 * - Stack 导航容器（含页面转场动画）
 * - StatusBar 主题适配
 * - 全局背景色
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'FANDEX',
            headerLargeTitle: true,
          }}
        />
        <Stack.Screen
          name="roadmap"
          options={{
            title: '学习路线',
          }}
        />
        <Stack.Screen
          name="module"
          options={{
            title: '模块详情',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
