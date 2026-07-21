/**
 * Comments 评论组件（React Island，Giscus 按需加载）
 *
 * 功能概述：
 * - 基于 @giscus/react 实现 GitHub Discussions 评论系统
 * - 懒加载：仅当 IntersectionObserver 检测到组件进入视口时才加载 Giscus iframe
 * - 主题动态切换：集成 use-theme hook，亮/暗主题自动同步到 Giscus
 * - 加载状态 Skeleton 占位，避免布局跳动
 * - 完整无障碍：aria-label、加载进度提示
 *
 * 使用方式（Astro island）：
 *   <Comments
 *     client:visible
 *     repo="fanquanpp/FANDEX"
 *     repoId="R_xxx"
 *     category="Comments"
 *     categoryId="DIC_xxx"
 *   />
 *
 * 数据流：
 * 1. 组件挂载 → IntersectionObserver 监听容器是否进入视口
 * 2. 进入视口 → 设置 shouldLoad=true → 渲染 Giscus 组件
 * 3. useTheme 主题变化 → 同步 Giscus 的 theme prop
 */

import Giscus from '@giscus/react';
import { MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/cn';

/** Comments 组件 Props 类型 */
export interface CommentsProps {
  /** GitHub 仓库（owner/repo 形式） */
  repo: `${string}/${string}`;
  /** Giscus 仓库 ID */
  repoId: string;
  /** Discussion 分类名 */
  category: string;
  /** Giscus 分类 ID */
  categoryId: string;
  /** 页面映射方式（默认 'pathname'） */
  mapping?: 'pathname' | 'url' | 'title' | 'og:title' | 'specific' | 'number';
  /** 加载方式（默认 'lazy'） */
  loading?: 'lazy' | 'eager';
  /** 评论输入框位置（默认 'top'） */
  inputPosition?: 'top' | 'bottom';
  /** 额外类名 */
  className?: string;
}

/**
 * Comments 评论组件
 *
 * @param props.repo - GitHub 仓库
 * @param props.repoId - Giscus 仓库 ID
 * @param props.category - Discussion 分类
 * @param props.categoryId - Giscus 分类 ID
 * @param props.mapping - 映射方式
 * @param props.loading - 加载方式
 * @param props.inputPosition - 输入框位置
 * @param props.className - 外部类名
 */
export function Comments({
  repo,
  repoId,
  category,
  categoryId,
  mapping = 'pathname',
  loading = 'lazy',
  inputPosition = 'top',
  className,
}: CommentsProps) {
  // 当前主题（用于同步 Giscus 主题）
  const { theme } = useTheme();
  // 是否应该加载 Giscus（IntersectionObserver 触发）
  const [shouldLoad, setShouldLoad] = useState(false);
  // Giscus iframe 是否已加载完成
  const [loaded, setLoaded] = useState(false);
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);

  /** Giscus 主题：根据当前主题映射到 Giscus 支持的主题名 */
  const giscusTheme = theme === 'dark' ? 'dark_dimmed' : 'light';

  /** IntersectionObserver 回调：进入视口时触发加载 */
  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        // 触发后即可停止观察
        if (containerRef.current) {
          observerRef.current?.unobserve(containerRef.current);
        }
      }
    }
  }, []);

  // IntersectionObserver 引用
  const observerRef = useRef<IntersectionObserver | null>(null);

  /** 初始化 IntersectionObserver */
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    // 若已设置 shouldLoad，无需重复观察
    if (shouldLoad) return;

    observerRef.current = new IntersectionObserver(handleIntersect, {
      // 进入视口 100px 内即触发
      rootMargin: '100px',
      threshold: 0,
    });
    observerRef.current.observe(containerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [handleIntersect, shouldLoad]);

  return (
    <section ref={containerRef} className={cn('comments-section', className)} aria-label="评论">
      {/* 标题 */}
      <header className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">评论</h2>
      </header>

      {/* 加载占位（未加载或加载中） */}
      {!loaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
          aria-busy="true"
          aria-live="polite"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-2/3" />
          {!shouldLoad && (
            <p className="text-xs text-muted-foreground text-center">滚动到此处时加载评论</p>
          )}
        </motion.div>
      )}

      {/* Giscus 主体：仅当 shouldLoad 为 true 时渲染 */}
      {shouldLoad && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* biome-ignore lint/suspicious/noExplicitAny: Giscus props 类型签名与本项目 CommentsProps 略有差异，运行时无影响 */}
          <Giscus
            repo={repo}
            repoId={repoId}
            category={category}
            categoryId={categoryId}
            mapping={mapping}
            reactionsEnabled="1"
            emitMetadata="0"
            inputPosition={inputPosition}
            theme={giscusTheme}
            lang="zh-CN"
            loading={loading}
            onLoad={() => setLoaded(true)}
            {...({} as any)}
          />
        </motion.div>
      )}
    </section>
  );
}

export default Comments;
