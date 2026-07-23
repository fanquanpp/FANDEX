/**
 * CodeRunner 代码运行器组件（React Island）
 *
 * 功能概述：
 * - 内嵌代码编辑区（可编辑 textarea，支持语法高亮占位）
 * - 运行按钮：调用 code-runner.ts 在 Web Worker 沙箱中执行代码
 * - 结果区：控制台输出 / 错误信息 / 执行时长
 * - 加载状态：执行期间禁用按钮 + Spinner 动画
 * - 清除按钮：重置代码与结果
 * - 复制按钮：复制当前代码到剪贴板
 * - Motion：结果区淡入展开 + 输出逐行 stagger
 * - 5 秒超时保护（由 code-runner 内部处理）
 *
 * 使用方式（Astro island）：
 *   <CodeRunner client:visible code={`console.log('Hello, World!');`} language="js" />
 *
 * 数据流：
 * 1. 用户编辑代码 → 更新本地 state
 * 2. 点击运行 → runCode(code, language) → 等待结果
 * 3. 结果返回 → 更新 result state → 结果区 Motion 淡入
 * 4. 点击清除 → 重置 code + result
 */

import {
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Eraser,
  Play,
  RotateCcw,
  Terminal,
  TriangleAlert,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { type CodeLanguage, type CodeRunResult, runCode } from '@/lib/code-runner';

/** CodeRunner 组件 Props 类型 */
export interface CodeRunnerProps {
  /** 初始代码字符串 */
  code: string;
  /** 代码语言（默认 'js'） */
  language?: 'js' | 'ts';
  /** 是否默认展开结果区（默认 false） */
  defaultExpanded?: boolean;
  /** 是否允许编辑代码（默认 true） */
  editable?: boolean;
  /** 是否显示复制按钮（默认 true） */
  showCopy?: boolean;
  /** 是否显示重置按钮（默认 true） */
  showReset?: boolean;
  /** 额外类名 */
  className?: string;
  /** 编辑区最小高度（默认 200px） */
  minHeight?: number;
}

/** 运行状态 */
type RunStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * CodeRunner 代码运行器组件
 *
 * @param props.code - 初始代码
 * @param props.language - 代码语言
 * @param props.defaultExpanded - 默认展开结果区
 * @param props.editable - 是否允许编辑
 * @param props.showCopy - 是否显示复制按钮
 * @param props.showReset - 是否显示重置按钮
 * @param props.className - 外部类名
 * @param props.minHeight - 编辑区最小高度
 */
export function CodeRunner({
  code: initialCode,
  language = 'js',
  defaultExpanded = false,
  editable = true,
  showCopy = true,
  showReset = true,
  className,
  minHeight = 200,
}: CodeRunnerProps) {
  // 当前代码（用户可编辑）
  const [code, setCode] = useState(initialCode);
  // 运行结果
  const [result, setResult] = useState<CodeRunResult | null>(null);
  // 运行状态
  const [status, setStatus] = useState<RunStatus>('idle');
  // 结果区是否展开
  const [expanded, setExpanded] = useState(defaultExpanded);
  // 复制按钮反馈
  const [copied, setCopied] = useState(false);

  /** 运行代码 */
  const handleRun = useCallback(async () => {
    if (status === 'running') return;
    setStatus('running');
    setExpanded(true);
    try {
      const runResult = await runCode(code, language as CodeLanguage);
      setResult(runResult);
      setStatus(runResult.success ? 'success' : 'error');
    } catch (err) {
      setResult({
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        duration: 0,
      });
      setStatus('error');
    }
  }, [code, language, status]);

  /** 清除结果 */
  const handleClearResult = useCallback(() => {
    setResult(null);
    setStatus('idle');
    setExpanded(false);
  }, []);

  /** 重置代码到初始值 */
  const handleReset = useCallback(() => {
    setCode(initialCode);
    setResult(null);
    setStatus('idle');
  }, [initialCode]);

  /** 清空代码 */
  const handleClearCode = useCallback(() => {
    setCode('');
  }, []);

  /** 复制代码到剪贴板 */
  const handleCopy = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // 静默失败
    }
  }, [code]);

  /** 代码变化处理 */
  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!editable) return;
      setCode(e.target.value);
    },
    [editable],
  );

  // 语言标签
  const languageLabel = language === 'ts' ? 'TypeScript' : 'JavaScript';

  // 状态徽标配置
  const statusBadge = (() => {
    switch (status) {
      case 'idle':
        return null;
      case 'running':
        return (
          <Badge variant="secondary" className="gap-1">
            <Spinner className="h-3 w-3" />
            运行中
          </Badge>
        );
      case 'success':
        return (
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            成功
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <TriangleAlert className="h-3 w-3" />
            出错
          </Badge>
        );
    }
  })();

  return (
    <div className={cn('code-runner overflow-hidden rounded-lg border bg-card', className)}>
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs font-medium">{languageLabel} 代码运行器</span>
          {statusBadge}
        </div>
        <div className="flex items-center gap-1">
          {/* 复制 */}
          {showCopy && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!code}
              className="h-7 gap-1 px-2 text-xs"
              aria-label="复制代码"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" />
                  已复制
                </>
              ) : (
                <>
                  <Clipboard className="h-3.5 w-3.5" />
                  复制
                </>
              )}
            </Button>
          )}
          {/* 清空代码 */}
          {editable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearCode}
              disabled={!code || status === 'running'}
              className="h-7 gap-1 px-2 text-xs"
              aria-label="清空代码"
            >
              <Eraser className="h-3.5 w-3.5" />
              清空
            </Button>
          )}
          {/* 重置到初始值 */}
          {showReset && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={code === initialCode || status === 'running'}
              className="h-7 gap-1 px-2 text-xs"
              aria-label="重置代码"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </Button>
          )}
          {/* 运行 */}
          <Button
            type="button"
            size="sm"
            onClick={handleRun}
            disabled={!code.trim() || status === 'running'}
            className="h-7 gap-1 px-3 text-xs"
          >
            {status === 'running' ? (
              <>
                <Spinner className="h-3.5 w-3.5" />
                运行中
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                运行
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 代码编辑区 */}
      <div className="relative">
        <Textarea
          value={code}
          onChange={handleCodeChange}
          readOnly={!editable}
          spellCheck={false}
          aria-label={`${languageLabel} 代码编辑器`}
          className={cn(
            'resize-none rounded-none border-0 font-mono text-xs focus-visible:ring-0',
            !editable && 'bg-muted/20 cursor-not-allowed',
          )}
          style={{ minHeight }}
          // 使用等宽字体并保留空白字符
          // 注：避免使用 autoComplete / autoCorrect 拼写检查干扰代码
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        {/* 行数显示（右下角） */}
        <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-muted-foreground/60 tabular-nums">
          {code.split('\n').length} 行 · {code.length} 字符
        </div>
      </div>

      {/* 结果区（AnimatePresence 控制展开/收起） */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-t bg-muted/20"
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                控制台输出
              </div>
              <div className="flex items-center gap-2 text-xs">
                {result && (
                  <span className="text-muted-foreground tabular-nums">
                    耗时 {result.duration}ms
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearResult}
                  className="h-6 px-2 text-xs"
                  aria-label="清除结果"
                >
                  清除
                </Button>
              </div>
            </div>

            {/* 输出内容 */}
            <div className="max-h-64 overflow-y-auto p-3 font-mono text-xs">
              {status === 'running' && !result ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner className="h-3.5 w-3.5" />
                  <span>正在执行代码...</span>
                </div>
              ) : result ? (
                <div className="space-y-1.5">
                  {/* 标准输出 */}
                  {result.output && (
                    <motion.pre
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-pre-wrap break-all text-foreground"
                    >
                      {result.output}
                    </motion.pre>
                  )}
                  {/* 错误输出 */}
                  {result.error && (
                    <motion.pre
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: 0.05 }}
                      className="whitespace-pre-wrap break-all rounded bg-destructive/10 p-2 text-destructive"
                    >
                      <span className="font-semibold">错误：</span>
                      {'\n'}
                      {result.error}
                    </motion.pre>
                  )}
                  {/* 空输出提示 */}
                  {!result.output && !result.error && (
                    <p className="text-muted-foreground italic">代码执行完毕，无控制台输出。</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">点击"运行"按钮查看结果</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CodeRunner;
