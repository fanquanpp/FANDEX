/**
 * HeroCanvas 首页粒子动画背景（React Island）
 *
 * 功能概述：
 * - 纯 Canvas API 实现的粒子连接线动画（particles.js 风格但更简洁）
 * - IntersectionObserver 离屏暂停（性能优化）
 * - ResizeObserver 监听容器尺寸变化，响应式调整粒子数量
 * - 鼠标交互：粒子受鼠标排斥/吸引（默认排斥）
 * - 亮/暗模式适配：根据当前主题动态切换粒子颜色
 * - requestAnimationFrame 循环渲染
 * - React 19 useId 保证多实例 canvas ID 唯一性
 *
 * 使用方式（Astro island）：
 *   <HeroCanvas client:visible />
 *
 * 性能优化：
 * - 离屏自动暂停 RAF 循环
 * - 根据屏幕尺寸动态调整粒子密度（移动端减少粒子）
 * - 使用 devicePixelRatio 处理高 DPI 屏幕
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/cn';
import type { HeroCanvasConfig } from '@/types';

/** HeroCanvas 组件 Props 类型 */
export interface HeroCanvasProps extends HeroCanvasConfig {
  /** 额外类名 */
  className?: string;
  /** 是否启用鼠标交互（默认 true） */
  interactive?: boolean;
}

/** 粒子数据结构 */
interface Particle {
  /** 当前 x 坐标 */
  x: number;
  /** 当前 y 坐标 */
  y: number;
  /** x 方向速度 */
  vx: number;
  /** y 方向速度 */
  vy: number;
  /** 粒子半径 */
  radius: number;
}

/** 默认配置常量 */
const DEFAULT_CONFIG = {
  maxParticles: 80,
  linkDistance: 120,
  mouseRadius: 150,
  interactive: true,
  minRadius: 1,
  maxRadius: 2.5,
  maxSpeed: 0.6,
} as const;

/**
 * HeroCanvas 首页粒子动画背景组件
 *
 * @param props.className - 外部类名
 * @param props.maxParticles - 粒子数量上限
 * @param props.linkDistance - 粒子连接最大距离
 * @param props.mouseRadius - 鼠标交互半径
 * @param props.interactive - 是否启用鼠标交互
 */
export function HeroCanvas({
  className,
  maxParticles = DEFAULT_CONFIG.maxParticles,
  linkDistance = DEFAULT_CONFIG.linkDistance,
  mouseRadius = DEFAULT_CONFIG.mouseRadius,
  interactive = DEFAULT_CONFIG.interactive,
}: HeroCanvasProps) {
  // React 19 useId：确保 canvas 在多实例场景下 ID 唯一
  const uid = useId();
  // canvas 元素引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 容器元素引用
  const containerRef = useRef<HTMLDivElement>(null);
  // 动画帧 ID
  const rafRef = useRef<number | null>(null);
  // 粒子数组
  const particlesRef = useRef<Particle[]>([]);
  // 鼠标位置
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  // 是否暂停（IntersectionObserver 控制）
  const pausedRef = useRef<boolean>(false);
  // canvas 尺寸
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });

  // 当前主题（用于粒子颜色）
  const { theme } = useTheme();
  // 组件是否已挂载（避免 SSR hydration mismatch）
  const [mounted, setMounted] = useState(false);

  /** 根据屏幕宽度计算实际粒子数量 */
  const computeParticleCount = useCallback(
    (width: number): number => {
      // 移动端密度降低
      if (width < 640) return Math.min(40, Math.floor(maxParticles * 0.5));
      if (width < 1024) return Math.min(60, Math.floor(maxParticles * 0.75));
      return maxParticles;
    },
    [maxParticles],
  );

  /** 初始化粒子数组 */
  const initParticles = useCallback(
    (width: number, height: number) => {
      const count = computeParticleCount(width);
      const particles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * DEFAULT_CONFIG.maxSpeed,
          vy: (Math.random() - 0.5) * DEFAULT_CONFIG.maxSpeed,
          radius:
            DEFAULT_CONFIG.minRadius +
            Math.random() * (DEFAULT_CONFIG.maxRadius - DEFAULT_CONFIG.minRadius),
        });
      }
      particlesRef.current = particles;
    },
    [computeParticleCount],
  );

  /** 调整 canvas 尺寸（处理高 DPI） */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    sizeRef.current = { w: width, h: height, dpr };

    // 重新初始化粒子（粒子数量随尺寸变化）
    initParticles(width, height);
  }, [initParticles]);

  /** 单帧渲染 */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    if (w === 0 || h === 0) return;

    // 重置变换并应用 DPR 缩放
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 清空画布
    ctx.clearRect(0, 0, w, h);

    // 当前主题对应的粒子颜色
    const isDark = theme === 'dark';
    const particleColor = isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(71, 85, 105, 0.6)';
    const linkColor = isDark ? `rgba(148, 163, 184, ` : `rgba(71, 85, 105, `;

    const particles = particlesRef.current;
    const mouse = mouseRef.current;

    // 更新粒子位置 + 鼠标排斥
    for (const p of particles) {
      // 鼠标交互：排斥
      if (interactive && mouse) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius && dist > 0) {
          const force = (mouseRadius - dist) / mouseRadius;
          p.vx += (dx / dist) * force * 0.5;
          p.vy += (dy / dist) * force * 0.5;
        }
      }

      // 速度衰减（避免无限加速）
      p.vx *= 0.98;
      p.vy *= 0.98;
      // 限制最大速度
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpeed = DEFAULT_CONFIG.maxSpeed;
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      // 更新位置
      p.x += p.vx;
      p.y += p.vy;

      // 边界回弹
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      // 防止粒子卡在边界外
      p.x = Math.max(0, Math.min(w, p.x));
      p.y = Math.max(0, Math.min(h, p.y));
    }

    // 绘制连接线
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        if (!p1 || !p2) continue;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDistance) {
          const opacity = (1 - dist / linkDistance) * 0.4;
          ctx.beginPath();
          ctx.strokeStyle = `${linkColor}${opacity})`;
          ctx.lineWidth = 0.6;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // 绘制粒子
    ctx.fillStyle = particleColor;
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [theme, interactive, linkDistance, mouseRadius]);

  /** 动画循环 */
  const animate = useCallback(() => {
    if (!pausedRef.current) {
      render();
    }
    rafRef.current = requestAnimationFrame(animate);
  }, [render]);

  /** 鼠标移动处理 */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  /** 鼠标离开处理 */
  const handleMouseLeave = useCallback(() => {
    mouseRef.current = null;
  }, []);

  // 组件挂载后初始化
  useEffect(() => {
    setMounted(true);
  }, []);

  // 设置 canvas 与监听器
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined') return;

    resizeCanvas();

    // ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // IntersectionObserver 监听离屏暂停
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          pausedRef.current = !entry.isIntersecting;
        }
      },
      { threshold: 0 },
    );
    if (containerRef.current) {
      intersectionObserver.observe(containerRef.current);
    }

    // 鼠标事件监听
    if (interactive) {
      const canvas = canvasRef.current;
      canvas?.addEventListener('mousemove', handleMouseMove);
      canvas?.addEventListener('mouseleave', handleMouseLeave);
    }

    // 启动动画循环
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      const canvas = canvasRef.current;
      canvas?.removeEventListener('mousemove', handleMouseMove);
      canvas?.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [mounted, resizeCanvas, animate, interactive, handleMouseMove, handleMouseLeave]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute inset-0 pointer-events-none',
        interactive && 'pointer-events-auto',
        className,
      )}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} id={`hero-canvas-${uid}`} className="w-full h-full block" />
    </div>
  );
}

export default HeroCanvas;
