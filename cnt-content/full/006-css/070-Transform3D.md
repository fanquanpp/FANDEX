---
order: 700
title: CSS transform 与 3D 变换语法速查手册
module: 'css'
category: 前端技术
difficulty: beginner
description: CSS transform 与 3D 变换语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 2D 变换

**基本写法：平移**
`transform: translate(<tx>, <ty>);`
```css
/* 沿 X/Y 轴平移 */
.box { transform: translate(50px, 20px); }
.box { transform: translateX(50px); }
.box { transform: translateY(20px); }
.box { transform: translate(-50%, -50%); }  /* 常用于居中 */
```

---

**基本写法：缩放**
`transform: scale(<sx> [, <sy>]);`
```css
/* 缩放比例，1 为原始大小 */
.box { transform: scale(2); }          /* 整体放大 2 倍 */
.box { transform: scale(2, 0.5); }     /* X 放大 2 倍 Y 缩小一半 */
.box { transform: scaleX(1.5); }
.box { transform: scaleY(0.8); }
```

---

**基本写法：旋转**
`transform: rotate(<角度>);`
```css
/* 顺时针旋转 */
.box { transform: rotate(45deg); }
.box { transform: rotate(0.5turn); }   /* 半圈 */
.box { transform: rotate(-90deg); }
```

---

**基本写法：倾斜**
`transform: skew(<ax> [, <ay>]);`
```css
/* 倾斜变换 */
.box { transform: skew(10deg, 5deg); }
.box { transform: skewX(15deg); }
.box { transform: skewY(10deg); }
```

---

**基本写法：矩阵变换**
`transform: matrix(<a>, <b>, <c>, <d>, <e>, <f>);`
```css
/* 2D 仿射矩阵，等价于 translate+scale+rotate+skew */
.box { transform: matrix(1, 0, 0, 1, 50, 20); }  /* 等价 translate(50px,20px) */
```

---

## 3D 变换

**基本写法：3D 平移**
`transform: translate3d(<tx>, <ty>, <tz>);`
```css
/* 三轴平移，tz 为 Z 轴（正值朝向观察者） */
.box { transform: translate3d(10px, 20px, 100px); }
.box { transform: translateZ(100px); }
```

---

**基本写法：3D 缩放**
`transform: scale3d(<sx>, <sy>, <sz>);`
```css
/* 三轴缩放 */
.box { transform: scale3d(1.5, 1.5, 1.5); }
.box { transform: scaleZ(2); }
```

---

**基本写法：3D 旋转**
`transform: rotate3d(<x>, <y>, <z>, <角度>);`
```css
/* 绕任意轴旋转，(x,y,z) 为方向向量 */
.box { transform: rotate3d(1, 0, 0, 45deg); }   /* 绕 X 轴 */
.box { transform: rotate3d(0, 1, 0, 45deg); }   /* 绕 Y 轴 */
.box { transform: rotate3d(0, 0, 1, 45deg); }   /* 绕 Z 轴，等价 rotate */
.box { transform: rotate3d(1, 1, 0, 60deg); }   /* 绕对角轴 */

/* 简写 */
.box { transform: rotateX(45deg); }
.box { transform: rotateY(45deg); }
.box { transform: rotateZ(45deg); }
```

---

**基本写法：3D 矩阵**
`transform: matrix3d(<16 个值>);`
```css
/* 4x4 3D 变换矩阵 */
.box { transform: matrix3d(
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    50,20,100,1
); }
```

---

**基本写法：透视**
`transform: perspective(<距离>);`
```css
/* 直接在 transform 中设置透视距离 */
.box { transform: perspective(800px) rotateY(45deg); }
```

---

## 多重变换

**基本写法：链式组合**
`transform: <函数1> <函数2> ...;`
```css
/* 从右向左依次应用 */
.box { transform: translate(50px, 0) rotate(45deg); }
.box { transform: scale(1.2) rotateY(30deg) translateZ(50px); }
```

---

## 3D 上下文属性

**基本写法：父级透视**
`perspective: <距离>;`
```css
/* 设置在父元素上，作用于所有子元素的 3D 变换 */
.scene { perspective: 800px; }
.scene .box { transform: rotateY(45deg); }
```

---

**基本写法：透视原点**
`perspective-origin: <x> <y>;`
```css
/* 控制消失点位置 */
.scene { perspective: 800px; perspective-origin: center top; }
.scene { perspective-origin: 25% 75%; }
```

---

**基本写法：变换原点**
`transform-origin: <x> <y> [<z>];`
```css
/* 设置变换中心点 */
.box { transform-origin: center center; }    /* 默认 */
.box { transform-origin: top left; }
.box { transform-origin: 50% 100%; }
.box { transform-origin: 0 0 100px; }        /* 含 Z 轴 */
```

---

**基本写法：变换样式**
`transform-style: flat | preserve-3d;`
```css
/* preserve-3d 让子元素保留 3D 位置 */
.parent { transform-style: preserve-3d; }
```

---

**基本写法：背面可见性**
`backface-visibility: visible | hidden;`
```css
/* 翻转卡片背面隐藏 */
.card { backface-visibility: hidden; }
.back { transform: rotateY(180deg); }
```

---

## 单独变换属性

**基本写法：独立 transform 属性**
`translate: <tx> <ty>;` `rotate: <角度>;` `scale: <sx> <sy>;`
```css
/* 不影响其他变换，便于动画 */
.box { translate: 50px 20px; }
.box { rotate: 45deg; }
.box { scale: 1.2; }
/* 三者独立于 transform，可分别动画化 */
```

---

## 注意事项速查

**基本写法：GPU 加速提示**
`transform: translateZ(0);`
```css
/* 触发 GPU 层提升，常用于性能优化 */
.box { will-change: transform; transform: translateZ(0); }
```

---

**基本写法：变换不影响文档流**
`transform: <函数>`
```css
/* transform 不影响周围元素布局，仅视觉变换 */
.box { transform: rotate(10deg); }  /* 相邻元素不重排 */
```

## 动手试试

1. 用 `transform: translate()`/`rotate()`/`scale()` 组合一个卡片翻转；
2. 给容器加 `perspective`，体验 3D 景深；
3. 用 `transform-style: preserve-3d` 做翻转卡片；
4. 进阶挑战：做鼠标跟随的 3D 倾斜卡片。

## 核心知识点

> 一句话记住 3D 变换：`transform` 平移/旋转/缩放，`perspective` 给景深，`preserve-3d` 保留立体，`backface-visibility` 管背面。

- 2D：translate/rotate/scale/skew；
- 3D：rotateX/rotateY/translateZ；
- `perspective`：父容器设置景深；
- `transform-style: preserve-3d`：子元素保留 3D；
- `backface-visibility: hidden`：翻转卡片背面隐藏；
- transform 走合成层，动画性能好。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| perspective 位置错误 | 无景深 | 设在父容器 |
| 忘记 preserve-3d | 子元素压平 | 显式声明 |
| 过度 3D | 视觉杂乱 | 克制使用 |
| 与 fixed 冲突 | 包含块改变 | 注意 transform 副作用 |

## 扩展学习

- 动画：`css/029-CSSAnimationTransition`；
- 层叠：`css/017-StackingContext`；
- 性能：`css/043-CSSPerformanceOptimizationDetailed`。
