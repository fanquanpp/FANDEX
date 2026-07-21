/**
 * 侧边栏状态管理 Store（Zustand v5）
 *
 * 功能概述：
 * - 使用 Zustand v5 `create` + `persist` 中间件管理侧边栏 UI 状态
 * - 状态字段：isOpen / activeModule / activeSection / collapsedSections
 * - persist 持久化 collapsedSections（折叠的章节 id 列表）
 * - 提供抽屉开关、模块/章节激活、章节折叠等方法
 *
 * 设计要点：
 * - isOpen 用于移动端抽屉控制（不持久化，每次访问默认关闭）
 * - activeModule / activeSection 记录当前激活位置（不持久化，路由驱动）
 * - collapsedSections 持久化用户折叠偏好
 *
 * 使用示例：
 *   import { useSidebarStore } from '@/lib/store/sidebar-store';
 *   const { isOpen, activeModule, toggle, toggleSection, isCollapsed } = useSidebarStore();
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** collapsedSections 持久化键名 */
const STORAGE_KEY = 'fandex-sidebar';

/** 侧边栏 Store 状态接口 */
export interface SidebarStoreState {
  /** 移动端抽屉是否展开 */
  isOpen: boolean;
  /** 当前激活的模块 ID */
  activeModule: string | null;
  /** 当前激活的章节 ID */
  activeSection: string | null;
  /** 折叠的章节 id 列表 */
  collapsedSections: string[];

  /** 打开抽屉 */
  open: () => void;
  /** 关闭抽屉 */
  close: () => void;
  /** 切换抽屉可见性 */
  toggle: () => void;
  /** 设置激活模块 */
  setActiveModule: (moduleId: string | null) => void;
  /** 设置激活章节 */
  setActiveSection: (sectionId: string | null) => void;
  /** 切换章节折叠状态 */
  toggleSection: (sectionId: string) => void;
  /** 判断章节是否折叠 */
  isCollapsed: (sectionId: string) => boolean;
}

/**
 * 侧边栏 Store 实现
 *
 * 设计要点：
 * 1. persist 仅持久化 collapsedSections 字段
 * 2. isOpen / activeModule / activeSection 由路由驱动，不持久化
 * 3. toggleSection 切换折叠状态（存在则移除，不存在则添加）
 */
export const useSidebarStore = create<SidebarStoreState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      activeModule: null,
      activeSection: null,
      collapsedSections: [],

      /** 打开抽屉 */
      open: () => set({ isOpen: true }),

      /** 关闭抽屉 */
      close: () => set({ isOpen: false }),

      /** 切换抽屉可见性 */
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),

      /**
       * 设置激活模块
       *
       * @param moduleId - 模块 ID
       */
      setActiveModule: (moduleId) => set({ activeModule: moduleId }),

      /**
       * 设置激活章节
       *
       * @param sectionId - 章节 ID
       */
      setActiveSection: (sectionId) => set({ activeSection: sectionId }),

      /**
       * 切换章节折叠状态
       *
       * 实现说明：
       * - 已折叠 → 展开（从列表移除）
       * - 未折叠 → 折叠（添加到列表）
       *
       * @param sectionId - 章节 ID
       */
      toggleSection: (sectionId) => {
        set((state) => {
          const isCurrentlyCollapsed = state.collapsedSections.includes(sectionId);
          const newCollapsed = isCurrentlyCollapsed
            ? state.collapsedSections.filter((id) => id !== sectionId)
            : [...state.collapsedSections, sectionId];
          return { collapsedSections: newCollapsed };
        });
      },

      /**
       * 判断章节是否折叠
       *
       * @param sectionId - 章节 ID
       * @returns 是否折叠
       */
      isCollapsed: (sectionId) => {
        return get().collapsedSections.includes(sectionId);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 仅持久化 collapsedSections 字段
      partialize: (state) => ({ collapsedSections: state.collapsedSections }),
    },
  ),
);

export default useSidebarStore;
