/**
 * InstallPrompt PWA 安装提示组件（React Island）
 *
 * 功能概述：
 * - 监听 beforeinstallprompt 事件，捕获安装提示
 * - 延迟显示（页面加载 N 秒后才弹出，避免打扰用户）
 * - localStorage 记录"不再提示"状态，永久关闭后不再显示
 * - 已安装（appinstalled 事件）后自动隐藏
 * - 基于 shadcn/ui Sheet（side="bottom"）实现，移动端从底部滑入
 * - Motion 动画：内容区淡入 + CTA 按钮 spring 反馈
 * - 显示安装优势列表（离线访问 / 桌面图标 / 全屏体验）
 *
 * 使用方式（Astro island）：
 *   <InstallPrompt client:idle delayMs={8000} />
 *
 * 数据流：
 * 1. SSR 期间不渲染
 * 2. 客户端挂载后绑定 beforeinstallprompt / appinstalled 监听
 * 3. 延迟 delayMs 后若仍有未消费的安装提示则弹出
 * 4. 用户点击"安装"→ 调用 prompt() → 触发浏览器安装流程
 * 5. 用户点击"不再提示"→ 写入 localStorage 永久关闭
 */

import { Download, Monitor, Smartphone, WifiOff, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import { STORAGE_KEYS } from '@/lib/constants';
import { logger } from '@/lib/logger';

/** InstallPrompt 组件 Props 类型 */
export interface InstallPromptProps {
  /** 延迟弹出毫秒数（默认 8000ms） */
  delayMs?: number;
  /** 额外类名 */
  className?: string;
  /** localStorage 中"不再提示"的 key（默认 STORAGE_KEYS.cache + ':install-dismissed'） */
  dismissStorageKey?: string;
}

/** beforeinstallprompt 事件类型（浏览器未标准化类型声明） */
interface BeforeInstallPromptEvent extends Event {
  /** 触发浏览器安装提示 */
  prompt: () => Promise<void>;
  /** 用户选择结果：'accepted' | 'dismissed' */
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  /** 平台列表 */
  platforms: string[];
}

/** 安装优势列表（用于显示在 Sheet 内） */
const BENEFITS = [
  {
    Icon: WifiOff,
    title: '离线访问',
    description: '无需网络也能查阅已下载的文档',
  },
  {
    Icon: Smartphone,
    title: '桌面图标',
    description: '一键启动，像原生应用一样使用',
  },
  {
    Icon: Monitor,
    title: '全屏体验',
    description: '沉浸式阅读，无浏览器 UI 干扰',
  },
] as const;

/** 默认延迟时间（毫秒） */
const DEFAULT_DELAY_MS = 8000;

/**
 * InstallPrompt PWA 安装提示组件
 *
 * @param props.delayMs - 延迟弹出毫秒数
 * @param props.className - 外部类名
 * @param props.dismissStorageKey - localStorage dismiss key
 */
export function InstallPrompt({
  delayMs = DEFAULT_DELAY_MS,
  className,
  dismissStorageKey,
}: InstallPromptProps) {
  // 是否已捕获 beforeinstallprompt 事件
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // 是否显示 Sheet
  const [open, setOpen] = useState(false);
  // 是否已安装
  const [installed, setInstalled] = useState(false);
  // 是否正在执行安装流程
  const [installing, setInstalling] = useState(false);

  /** dismiss key（默认基于 STORAGE_KEYS.cache 派生） */
  const storageKey = dismissStorageKey ?? `${STORAGE_KEYS.cache}:install-dismissed`;

  /** 检查是否已永久关闭 */
  const isDismissed = useCallback((): boolean => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  }, [storageKey]);

  /** beforeinstallprompt 事件处理 */
  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    // 阻止浏览器默认弹出（由我们接管）
    e.preventDefault();
    // 缓存事件对象
    setDeferredPrompt(e as BeforeInstallPromptEvent);
    logger.info('[install-prompt] beforeinstallprompt captured');
  }, []);

  /** appinstalled 事件处理 */
  const handleAppInstalled = useCallback(() => {
    setInstalled(true);
    setOpen(false);
    setDeferredPrompt(null);
    logger.info('[install-prompt] app installed');
  }, []);

  // 绑定事件监听 + 延迟弹出
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检查是否已作为 standalone 应用运行
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // 已永久关闭则不绑定监听
    if (isDismissed()) {
      logger.debug('[install-prompt] user has dismissed, skip');
      return;
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [handleBeforeInstallPrompt, handleAppInstalled, isDismissed]);

  // 延迟弹出（捕获到 deferredPrompt 后等待 delayMs）
  useEffect(() => {
    if (!deferredPrompt || installed || isDismissed()) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      logger.debug('[install-prompt] sheet shown after delay');
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [deferredPrompt, installed, delayMs, isDismissed]);

  /** 触发浏览器安装流程 */
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt || installing) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        logger.info('[install-prompt] user accepted install');
        setInstalled(true);
      } else {
        logger.info('[install-prompt] user dismissed install');
      }
      // 无论选择如何，prompt 只能使用一次
      setDeferredPrompt(null);
      setOpen(false);
    } catch (err) {
      logger.error('[install-prompt] install failed:', err);
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt, installing]);

  /** 永久关闭（不再提示） */
  const handleDismissForever = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch (err) {
      logger.warn('[install-prompt] failed to write dismiss flag:', err);
    }
    setOpen(false);
    setDeferredPrompt(null);
    logger.info('[install-prompt] user dismissed forever');
  }, [storageKey]);

  /** 临时关闭（仅本次会话） */
  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // 已安装 / SSR / 未捕获安装事件时不渲染
  if (installed || !deferredPrompt) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className={cn('mx-auto max-w-md rounded-t-2xl border-b-0 p-6', className)}
      >
        {/* 顶部装饰条（拖动指示器） */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-border"
          aria-hidden="true"
        />

        {/* 右上角关闭按钮 */}
        <SheetClose
          asChild
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="关闭">
            <X className="h-4 w-4" />
          </Button>
        </SheetClose>

        <SheetHeader className="pb-2 pt-2 text-center">
          {/* 应用图标 */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.1 }}
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg"
          >
            <Download className="h-8 w-8 text-primary-foreground" aria-hidden="true" />
          </motion.div>

          <SheetTitle className="text-xl">安装 FANDEX 到桌面</SheetTitle>
          <SheetDescription className="text-sm">
            将 FANDEX 安装到你的设备，获得更流畅的学习体验
          </SheetDescription>
        </SheetHeader>

        {/* 优势列表 */}
        <ul className="my-4 space-y-3">
          {BENEFITS.map((benefit, index) => {
            const { Icon } = benefit;
            return (
              <motion.li
                key={benefit.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.08, duration: 0.25 }}
                className="flex items-start gap-3 rounded-lg bg-muted/30 p-3"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{benefit.title}</p>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>

        <SheetFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {/* 主要 CTA：安装按钮 */}
          <motion.div
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {installing ? '正在启动安装...' : '立即安装'}
            </Button>
          </motion.div>

          {/* 次要操作：临时关闭 / 永久关闭 */}
          <div className="flex items-center justify-between text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              以后再说
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismissForever}
              className="text-muted-foreground hover:text-foreground"
            >
              不再提示
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default InstallPrompt;
