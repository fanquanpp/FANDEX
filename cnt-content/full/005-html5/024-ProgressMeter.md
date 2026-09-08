---
order: 240
title: progress 与 meter
module: 'html5'
category: 前端技术
difficulty: beginner
description: 两个原生数值显示元素：progress 表示任务进度（下载/上传），meter 表示数值状态（磁盘用量、评分、密码强度），含区间颜色规则、自定义样式与 JS 更新示例。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'html5/022-SVG'
  - 'html5/023-EmbeddedContent'
  - 'html5/025-WebComponentsPWADevelopment'
  - 'html5/026-DragAPI'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---

## 0. 学习目标（可验证）

- [ ] 能说出 progress 与 meter 的语义分工，并各举一个正确使用场景
- [ ] 能用 `value`/`max` 写出确定进度条，用无 `value` 写出不确定进度条
- [ ] 能解释 meter 的 `low`/`high`/`optimum` 如何决定显示颜色
- [ ] 能用 JavaScript 把一个真实的异步任务进度反映到 `<progress>` 上

## 1. 一句话理解

> `progress` 是"任务进行到哪了"（下载 70%、安装中……），`meter` 是"当前值落在什么水平"（磁盘用了 65%、得分 85……）。前者问**过程**，后者问**状态**。

类比：`progress` 是安装软件时那条会走的进度条，走完就消失；`meter` 是仪表盘上的油表——车一直开着，油量只是指示状态，不存在"走完"的概念。两者长相相似、语义不同，混用会误导读屏用户（读屏会把 `meter` 播报成"仪表"，把 `progress` 播报成"进度"）。

## 2. progress：任务进度

### 2.1 两种形态

```html
<!-- 不确定进度：不知道要多久（等待服务器响应） -->
<progress>加载中...</progress>

<!-- 确定进度：value/max 定比例 -->
<progress value="70" max="100">70%</progress>

<!-- max 默认为 1，所以 value 可以写小数 -->
<progress value="0.5"></progress>
```

| 属性 | 说明 | 默认值 |
| --- | --- | --- |
| `value` | 当前值；**省略即"不确定进度"形态** | 无（省略时显示滚动动画） |
| `max` | 最大值，必须大于 0 | 1 |

标签内的文字（`70%`）是**回退内容**：只在不支持该元素的旧环境里显示，现代浏览器忽略它。养成"里面写可读文本"的习惯没有坏处。

### 2.2 JavaScript 更新进度

```javascript
const progress = document.querySelector('progress');

// 读取
console.log(progress.value);    // 当前值
console.log(progress.max);      // 最大值
console.log(progress.position); // 比例 value/max（不确定进度时为 -1）

// 模拟加载：每 100ms 前进 10%
let value = 0;
const timer = setInterval(() => {
  value += 0.1;
  progress.value = value;
  if (value >= 1) {
    clearInterval(timer);
    console.log('加载完成');
  }
}, 100);
```

### 2.3 完整示例：真实文件上传进度

配合 XHR 的 `upload.progress` 事件，把真实上传比例反映到进度条上：

```html
<progress id="upload" value="0" max="100">0%</progress>
<span id="percentText">0%</span>

<script>
  const bar = document.getElementById('upload');
  const text = document.getElementById('percentText');

  function uploadFile(file) {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        // loaded 已发送字节 / total 总字节，换算成百分比
        const percent = (e.loaded / e.total) * 100;
        bar.value = percent;
        text.textContent = Math.round(percent) + '%';
      }
    });
    xhr.open('POST', '/upload');
    xhr.send(file);
  }
</script>
```

预期行为：选择文件提交后，进度条随上传推进从 0% 走到 100%，右侧文本同步刷新。

## 3. meter：数值状态

### 3.1 属性与刻度

```html
<!-- 简单度量 -->
<meter value="0.7" min="0" max="1">70%</meter>

<!-- 带区间划分：电量 85%，60 以下算低，90 以上算高 -->
<meter value="85" min="0" max="100" low="60" high="90" optimum="80">85 分</meter>
```

| 属性 | 说明 | 默认值 |
| --- | --- | --- |
| `value` | 当前值（必需） | 无 |
| `min` / `max` | 刻度范围 | 0 / 1 |
| `low` | "低值区间"上边界 | min |
| `high` | "高值区间"下边界 | max |
| `optimum` | 最优值落在哪个区间 | — |

### 3.2 区间划分与颜色规则

```text
min          low          high          max
 |-----------|------------|-------------|
   低值区间     中值区间       高值区间
```

浏览器根据 **optimum 落在哪个区间**决定"什么是好"，再根据 **value 落在哪个区间**决定显示颜色：value 离 optimum 所在区间越近越绿、越远越黄/红。

| optimum 位置 | value 在低区间 | value 在中区间 | value 在高区间 |
| --- | --- | --- | --- |
| 低区间 | 绿色 | 黄色 | 红色 |
| 中区间 | 黄色 | 绿色 | 黄色 |
| 高区间 | 红色 | 黄色 | 绿色 |

记忆窍门：optimum 定义"好"的方向。磁盘用量场景 `optimum` 设低区间（越小越好），电量场景设高区间（越足越好）——同一个元素能表达两种相反的"好"。

### 3.3 JavaScript 读写

```javascript
const meter = document.querySelector('meter');
meter.value = 75;   // 当前值
meter.low = 40;     // 低值边界
meter.high = 80;    // 高值边界
meter.optimum = 60; // 最优值
```

### 3.4 实战示例：密码强度

```html
<meter id="strength" value="0" min="0" max="100" low="40" high="70" optimum="100"></meter>

<script>
  function checkStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 25;       // 够长
    if (/[A-Z]/.test(password)) score += 25;     // 有大写
    if (/[0-9]/.test(password)) score += 25;     // 有数字
    if (/[^a-zA-Z0-9]/.test(password)) score += 25; // 有符号
    document.getElementById('strength').value = score;
  }
</script>
```

optimum 设为 100（越强越好）：得分 40 以下红色、40-70 黄色、70 以上绿色，颜色语义与用户直觉一致。

## 4. 自定义样式：必须覆盖两套伪元素

progress 与 meter 的内部结构无法用普通 CSS 直接控制，需要用伪元素，且 WebKit（Chrome/Safari）与 Firefox 各有一套：

```css
/* 先统一外观容器 */
progress {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
}

/* WebKit 内核（Chrome、Safari、Edge）：轨道与填充分两个伪元素 */
progress::-webkit-progress-bar {
  background: #e0e0e0;
  border-radius: 10px;
}
progress::-webkit-progress-value {
  background: #4caf50;
  border-radius: 10px;
}

/* Firefox：只有一个"填充"伪元素 */
progress::-moz-progress-bar {
  background: #4caf50;
}
```

meter 同理：`::-webkit-meter-bar`（轨道）、`::-webkit-meter-optimum-value` / `::-webkit-meter-suboptimum-value` / `::-webkit-meter-even-less-good-value`（绿/黄/红三档填充），Firefox 为 `::-moz-meter-bar`。

提醒：这些伪元素是浏览器私有实现，写之前先查 MDN 确认当前可用性；覆盖了三档颜色时，最好在旁边保留文字说明，别让色觉障碍用户失去信息。

## 5. progress vs meter 对比总结

| 对比项 | progress | meter |
| --- | --- | --- |
| 语义 | 任务完成的**过程** | 数值所处的**状态** |
| 典型场景 | 下载、上传、安装、加载 | 磁盘用量、评分、电量、密码强度 |
| 有无"终点" | 有（到达 max 即完成） | 无（只是当前读数） |
| 特有属性 | `position`（只读比例） | `low`/`high`/`optimum`（三档颜色） |
| 无 value 时 | 不确定进度动画 | 语法上 value 必填 |
| 隐式角色 | progressbar | meter |

一句话判断法：**这个数会"走完"吗？** 会，用 progress；不会、只是刻度上的读数，用 meter。

## 6. 动手试试

### 入门版（必做）

1. 用 `<progress>` 做一个"文件下载"进度条，用 JS 定时把 `value` 从 0 递增到 `max`；
2. 用 `<meter>` 显示"当前电量 70%"，并配置 `low`/`high`/`optimum` 观察颜色变化；再把 `optimum` 改到低区间，看颜色规则反转；
3. 用 F12 的无障碍面板检查两个元素的隐式角色（progressbar / meter）。

### 进阶版（选做）

1. 给进度条加自定义样式：圆角轨道 + 绿色填充，同时覆盖 WebKit 与 Firefox 两套伪元素；
2. 做一个"上传中"的不确定进度条（不写 `value`），完成后切换为确定进度；
3. 用 `aria-label` 给进度条补充"下载第 2/5 个文件"等动态描述。

## 7. 常见问题与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 用 `meter` 显示下载进度 | 语义错误，读屏播报成"仪表" | 任务进度改用 `progress` |
| 用 `progress` 显示磁盘用量 | 语义错误，且无法表达"高低好坏" | 数值状态改用 `meter` |
| meter 忘写 `value` | 无当前读数，元素无意义 | `value` 是必需属性 |
| 样式只写 WebKit 伪元素 | Firefox 中样式不生效 | 同时写 `::-moz-*` 伪元素 |
| 覆盖颜色语义不加分说明 | 色觉障碍用户失去判断依据 | 保留绿/黄/红含义或另加文字说明 |
| 忘记回退文字 | 旧环境无法理解数值 | 标签内写可读文本 |

## 8. 小结

初学者记住这三点：

1. 任务进度用 `progress`，数值状态用 `meter`——问自己"这个数会走完吗"；
2. `progress` 不写 `value` 是"不确定进度"；`meter` 用 `low`/`high`/`optimum` 三属性控制颜色档位；
3. 两者都能被 JS 直接赋值更新，`progress.position` 是只读比例。

进阶者还需注意：

- 隐式无障碍角色分别是 progressbar 与 meter，自定义样式别破坏颜色语义，必要时补文字说明；
- 私有伪元素双轨（`::-webkit-*` 与 `::-moz-*`）是历史遗留，写之前查 MDN；
- 真实异步任务的进度来源见 `html5/031-WebSocket`（实时推送）与 XHR/fetch 的进度事件。

## 9. 扩展学习

- 无障碍：`html5/011-Accessibility` 中 ARIA 的 `progressbar`/`meter` 角色与 `aria-valuenow`；
- 动画：`css/029-CSSAnimationTransition` 让进度变化更平滑；
- 组件化：`html5/025-WebComponentsPWADevelopment` 封装自定义进度条组件；
- 实时更新：`html5/031-WebSocket` 中上传/下载进度的真实数据来源。
