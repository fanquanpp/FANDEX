/**
 * DocSyncPanel 文档同步面板（React Island）
 *
 * 功能概述：
 * - 提供应用内文档同步 UI，让用户在桌面端直接从远程仓库更新文档
 * - 集成 doc-sync.ts 的全量同步、清单检查能力
 * - 使用 shadcn/ui 的 Dialog / Button / Progress 组件保持视觉一致
 * - 实时进度条、错误列表、统计信息展示
 * - 仅在 Tauri 桌面环境启用（浏览器环境显示降级提示）
 *
 * 使用方式（Astro island）：
 *   <DocSyncPanel client:idle />
 *
 * 设计考量：
 * - 使用 client:idle 而非 client:load：避免阻塞首屏渲染
 * - 同步过程阻塞 UI 但可取消：通过 isSyncing 状态控制
 * - 错误列表默认折叠，避免长列表影响视觉
 * - 进度信息包含当前文件、已完成/总数、源名称
 */

import {
  AlertCircle,
  CheckCircle2,
  CloudDownload,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { REMOTE_REPO_INFO } from '@/lib/services/doc-source';
import {
  checkRemoteVersion,
  type FullSyncResult,
  fetchManifest,
  isSyncAvailable,
  type SyncProgress,
  syncAll,
  syncModule,
} from '@/lib/services/doc-sync';

/** DocSyncPanel Props */
export interface DocSyncPanelProps {
  /** 触发按钮的额外类名 */
  className?: string;
  /** 触发按钮的 tooltip 位置 */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/** 同步状态机 */
type SyncStatus =
  | 'idle' // 空闲，未开始
  | 'checking' // 正在检查远程版本
  | 'syncing' // 同步中
  | 'success' // 同步成功
  | 'error'; // 同步失败

/** 远程版本检查结果 */
interface VersionInfo {
  version: string;
  generatedAt: string;
}

/**
 * DocSyncPanel 文档同步面板组件
 *
 * @param props.className - 触发按钮类名
 * @param props.side - 触发按钮 tooltip 位置（保留接口，当前未使用）
 */
export function DocSyncPanel({ className }: DocSyncPanelProps) {
  // Dialog 开关状态
  const [open, setOpen] = useState(false);
  // 同步状态机
  const [status, setStatus] = useState<SyncStatus>('idle');
  // 进度信息
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  // 同步结果（成功后填充）
  const [result, setResult] = useState<FullSyncResult | null>(null);
  // 错误信息（失败时填充）
  const [errorMessage, setErrorMessage] = useState<string>('');
  // 远程版本信息
  const [remoteVersion, setRemoteVersion] = useState<VersionInfo | null>(null);
  // 是否在 Tauri 环境中（决定功能是否可用）
  const [tauriAvailable, setTauriAvailable] = useState<boolean>(true);
  // 是否已展开错误列表
  const [showErrors, setShowErrors] = useState<boolean>(false);

  /** 应用挂载时检测 Tauri 环境 */
  useEffect(() => {
    let mounted = true;
    isSyncAvailable().then((available) => {
      if (mounted) setTauriAvailable(available);
    });
    return () => {
      mounted = false;
    };
  }, []);

  /** 当 Dialog 打开时自动检查远程版本（仅一次） */
  useEffect(() => {
    if (!open || !tauriAvailable) return;
    if (remoteVersion !== null || status === 'checking') return;

    setStatus('checking');
    checkRemoteVersion()
      .then((version) => {
        setRemoteVersion(version);
        setStatus('idle');
      })
      .catch(() => {
        // 静默失败，不阻塞用户操作
        setStatus('idle');
      });
  }, [open, tauriAvailable, remoteVersion, status]);

  /** 重置状态到初始 */
  const resetState = useCallback(() => {
    setStatus('idle');
    setProgress(null);
    setResult(null);
    setErrorMessage('');
  }, []);

  /** 处理全量同步 */
  const handleSyncAll = useCallback(async () => {
    setStatus('syncing');
    setProgress(null);
    setResult(null);
    setErrorMessage('');
    setShowErrors(false);

    try {
      const syncResult = await syncAll({
        onProgress: (p) => setProgress(p),
        incremental: true,
      });
      setResult(syncResult);
      setStatus('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus('error');
    }
  }, []);

  /** 处理单个模块同步（基于已拉取的清单，预留功能） */
  // biome-ignore lint/correctness/noUnusedVariables: 预留单模块同步入口，未来 UI 扩展使用
  const handleSyncModule = useCallback(async (moduleId: string) => {
    setStatus('syncing');
    setProgress(null);
    setResult(null);
    setErrorMessage('');
    setShowErrors(false);

    try {
      const { manifest } = await fetchManifest({
        onProgress: (p) => setProgress(p),
      });
      const moduleResult = await syncModule(moduleId, manifest, {
        onProgress: (p) => setProgress(p),
        incremental: true,
      });

      // 包装成 FullSyncResult 格式以便复用 UI
      const wrapped: FullSyncResult = {
        manifestVersion: manifest.version,
        manifestGeneratedAt: manifest.generatedAt,
        totalModules: 1,
        totalDocs: moduleResult.total,
        succeeded: moduleResult.succeeded,
        skipped: moduleResult.skipped,
        failed: moduleResult.failed,
        modules: [moduleResult],
        duration: 0,
      };
      setResult(wrapped);
      setStatus('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus('error');
    }
  }, []);

  /** 关闭 Dialog 时重置状态 */
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next && status !== 'syncing') {
        // 延迟重置，避免关闭动画过程中 UI 闪烁
        setTimeout(resetState, 200);
      }
    },
    [status, resetState],
  );

  /** 进度百分比 */
  const progressPercent = useMemo(() => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.completed / progress.total) * 100);
  }, [progress]);

  /** 错误列表（从 result 中提取失败的文档） */
  const errorList = useMemo(() => {
    if (!result) return [];
    return result.modules
      .flatMap((m) => m.docs)
      .filter((d) => !d.success)
      .map((d) => ({ path: d.path, error: d.error ?? '未知错误' }));
  }, [result]);

  /** 触发按钮 */
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label="文档同步"
      title="文档同步"
    >
      <CloudDownload className="h-[1.1rem] w-[1.1rem]" />
    </Button>
  );

  // 浏览器环境降级提示
  if (!tauriAvailable) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>文档同步</DialogTitle>
            <DialogDescription>从远程仓库更新本地文档</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>文档同步功能仅在 FANDEX 桌面端可用。请下载并安装桌面版以使用此功能。</p>
            <p>
              访问
              <a
                href={REMOTE_REPO_INFO.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center text-primary hover:underline"
              >
                FANDEX 主页 <ExternalLink className="ml-0.5 h-3 w-3" />
              </a>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudDownload className="h-5 w-5 text-primary" />
            文档同步
          </DialogTitle>
          <DialogDescription>
            从 FANDEX-Web 远程仓库更新本地文档，无需重新安装应用
          </DialogDescription>
        </DialogHeader>

        {/* 远程仓库信息 */}
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">远程仓库</span>
            <a
              href={REMOTE_REPO_INFO.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              {REMOTE_REPO_INFO.owner}/{REMOTE_REPO_INFO.repo}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">分支</span>
            <span className="font-mono">{REMOTE_REPO_INFO.branch}</span>
          </div>
          {remoteVersion && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-muted-foreground">远程版本</span>
              <span className="font-mono text-success-foreground">{remoteVersion.version}</span>
            </div>
          )}
        </div>

        {/* 进度区 */}
        {status === 'syncing' && progress && (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {progress.phase === 'manifest' ? '正在拉取文档清单...' : '正在同步文档...'}
              </span>
              <span className="font-mono">
                {progress.completed} / {progress.total}
              </span>
            </div>
            <Progress value={progressPercent} />
            {progress.current && (
              <div className="truncate text-[11px] text-muted-foreground">
                当前: {progress.current}
              </div>
            )}
            {progress.sourceName && (
              <div className="text-[11px] text-muted-foreground">源: {progress.sourceName}</div>
            )}
          </div>
        )}

        {/* 检查远程版本中 */}
        {status === 'checking' && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在检查远程版本...
          </div>
        )}

        {/* 成功结果 */}
        {status === 'success' && result && (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-foreground" />
              <div className="flex-1 space-y-1">
                <div className="font-medium text-foreground">同步完成</div>
                <div className="text-xs text-muted-foreground">
                  共 {result.totalDocs} 篇 · 成功 {result.succeeded} · 跳过 {result.skipped} · 失败{' '}
                  {result.failed}
                  {result.duration > 0 && ` · 耗时 ${(result.duration / 1000).toFixed(1)}s`}
                </div>
              </div>
            </div>

            {errorList.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <button
                  type="button"
                  onClick={() => setShowErrors((v) => !v)}
                  className="flex w-full items-center justify-between text-xs font-medium text-destructive"
                >
                  <span className="inline-flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errorList.length} 个文档同步失败
                  </span>
                  <span className="text-muted-foreground">{showErrors ? '收起' : '展开'}</span>
                </button>
                {showErrors && (
                  <ScrollArea className="mt-2 h-32 rounded border border-border/50 bg-background/50">
                    <ul className="space-y-1 p-2 text-[11px]">
                      {errorList.map((err) => (
                        <li key={err.path} className="break-all">
                          <span className="font-mono text-foreground">{err.path}</span>
                          <span className="text-muted-foreground"> — {err.error}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        )}

        {/* 错误状态 */}
        {status === 'error' && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <div className="flex-1">
              <div className="font-medium text-foreground">同步失败</div>
              <div className="mt-1 break-all text-xs text-muted-foreground">{errorMessage}</div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {status === 'syncing' ? (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              同步中...
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setRemoteVersion(null);
                  setStatus('checking');
                  checkRemoteVersion()
                    .then((v) => {
                      setRemoteVersion(v);
                      setStatus('idle');
                    })
                    .catch(() => setStatus('idle'));
                }}
              >
                <RefreshCw className="h-4 w-4" />
                检查更新
              </Button>
              <Button onClick={handleSyncAll} disabled={status === 'checking'}>
                <CloudDownload className="h-4 w-4" />
                全量同步
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DocSyncPanel;
