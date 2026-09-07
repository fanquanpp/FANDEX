---
order: 240
title: progress 与 meter
module: 'html5'
category: 前端技术
difficulty: beginner
description: progress与meter
author: fanquanpp
updated: '2026-08-30'
related:
  - 'html5/022-SVG'
  - 'html5/023-EmbeddedContent'
  - 'html5/025-WebComponentsPWADevelopment'
  - 'html5/026-DragAPI'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---

## 1. progress 元素

```html
<progress>加载中...</progress> <progress value="70" max="100">70%</progress>
```

| 属性    | 说明   | 默认值 |
| ------- | ------ | ------ |
| `value` | 当前值 | 0      |
| `max`   | 最大值 | 1      |

```javascript
const progress = document.querySelector('progress');
progress.value = 0.5;
console.log(progress.position); // 0.5
```

### 自定义样式

```css
progress::-webkit-progress-bar {
  background: #e0e0e0;
  border-radius: 10px;
}
progress::-webkit-progress-value {
  background: #4caf50;
  border-radius: 10px;
}
progress::-moz-progress-bar {
  background: #4caf50;
}
```

## 2. meter 元素

```html
<meter value="0.7" min="0" max="1">70%</meter>
<meter value="85" min="0" max="100" low="60" high="90" optimum="80">85分</meter>
```

| 属性      | 说明           | 默认值 |
| --------- | -------------- | ------ |
| `value`   | 当前值（必需） | 0      |
| `min`     | 最小值         | 0      |
| `max`     | 最大值         | 1      |
| `low`     | 低值区间边界   | min    |
| `high`    | 高值区间边界   | max    |
| `optimum` | 最优值         | —      |

### 区间划分

```
min          low          high          max
 |-----------|------------|-------------|
   低值区间     中值区间       高值区间
```

颜色规则基于 optimum 所在区间：optimum 所在区间为绿色，远离为黄色/红色。

```css
meter::-webkit-meter-optimum-value {
  background: #4caf50;
}
meter::-webkit-meter-suboptimum-value {
  background: #ff9800;
}
meter::-webkit-meter-even-less-good-value {
  background: #f44336;
}
```
## progress 进度条

**progress 元素**
`<progress [value="<当前值>"] [max="<最大值>"]>[回退内容]</progress>`
```html
<!-- 不确定进度(加载中) -->
<progress>加载中...</progress>

<!-- 确定进度 -->
<progress value="70" max="100">70%</progress>

<!-- 默认 max=1 -->
<progress value="0.5"></progress>
```

| 属性    | 说明     | 默认值 |
| ------- | -------- | ------ |
| `value` | 当前值   | 0      |
| `max`   | 最大值   | 1      |

**JavaScript 操作**
```javascript
const progress = document.querySelector('progress');

// 设置值
progress.value = 0.5;
progress.max = 200;

// 读取属性
console.log(progress.value);     // 当前值
console.log(progress.max);       // 最大值
console.log(progress.position);  // 比例(value/max)

// 模拟加载
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

---

## progress 自定义样式

**CSS 伪元素样式**
```css
/* WebKit 内核(Chrome、Safari) */
progress::-webkit-progress-bar {
  background: #e0e0e0;
  border-radius: 10px;
  height: 20px;
}

progress::-webkit-progress-value {
  background: linear-gradient(to right, #4caf50, #8bc34a);
  border-radius: 10px;
  transition: width 0.3s;
}

/* Firefox */
progress::-moz-progress-bar {
  background: #4caf50;
  border-radius: 10px;
}

/* 进度条本身 */
progress {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  border: none;
}
```

---

## meter 度量条

**meter 元素**
`<meter value="<当前值>" [min] [max] [low] [high] [optimum]>[回退内容]</meter>`
```html
<!-- 简单度量 -->
<meter value="0.7" min="0" max="1">70%</meter>

<!-- 带区间划分 -->
<meter value="85" min="0" max="100" low="60" high="90" optimum="80">85 分</meter>

<!-- 磁盘使用量 -->
<meter value="650" min="0" max="1000" low="500" high="800" optimum="300">
  650 GB / 1000 GB
</meter>
```

| 属性      | 说明           | 默认值 |
| --------- | -------------- | ------ |
| `value`   | 当前值(必需)   | 0      |
| `min`     | 最小值         | 0      |
| `max`     | 最大值         | 1      |
| `low`     | 低值区间边界   | min    |
| `high`    | 高值区间边界   | max    |
| `optimum` | 最优值         | -      |

**区间划分规则**
```
min          low          high          max
 |-----------|------------|-------------|
   低值区间     中值区间       高值区间
```

颜色规则:optimum 所在区间为绿色,远离 optimum 为黄色/红色。

| optimum 位置 | value 在低区间 | value 在中区间 | value 在高区间 |
| ------------ | -------------- | -------------- | -------------- |
| 低区间       | 绿色           | 黄色           | 红色           |
| 中区间       | 黄色           | 绿色           | 黄色           |
| 高区间       | 红色           | 黄色           | 绿色           |

---

## meter 自定义样式

**CSS 伪元素样式**
```css
meter {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
}

/* WebKit 内核 */
meter::-webkit-meter-bar {
  background: #e0e0e0;
  border-radius: 10px;
}

/* 最优值(绿色) */
meter::-webkit-meter-optimum-value {
  background: #4caf50;
  border-radius: 10px;
}

/* 次优值(黄色) */
meter::-webkit-meter-suboptimum-value {
  background: #ff9800;
  border-radius: 10px;
}

/* 较差值(红色) */
meter::-webkit-meter-even-less-good-value {
  background: #f44336;
  border-radius: 10px;
}

/* Firefox */
meter::-moz-meter-bar {
  background: #4caf50;
}
```

---

## JavaScript 操作 meter

**属性读写**
```javascript
const meter = document.querySelector('meter');

// 读取
console.log(meter.value);     // 当前值
console.log(meter.min);       // 最小值
console.log(meter.max);       // 最大值
console.log(meter.low);       // 低值边界
console.log(meter.high);      // 高值边界
console.log(meter.optimum);   // 最优值

// 设置
meter.value = 75;
meter.min = 0;
meter.max = 100;
meter.low = 40;
meter.high = 80;
meter.optimum = 60;
```

---

## 应用场景示例

**文件上传进度**
```html
<progress id="uploadProgress" value="0" max="100">0%</progress>
<span id="progressText">0%</span>

<script>
  const progress = document.getElementById('uploadProgress');
  const progressText = document.getElementById('progressText');

  function uploadFile(file) {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        progress.value = percent;
        progressText.textContent = Math.round(percent) + '%';
      }
    });
    xhr.open('POST', '/upload');
    xhr.send(file);
  }
</script>
```

**评分显示**
```html
<!-- 评分 -->
<meter value="4.5" min="0" max="5" low="2" high="4" optimum="5">4.5 / 5</meter>

<!-- 密码强度 -->
<meter id="passwordStrength" value="0" min="0" max="100" low="40" high="70" optimum="100"></meter>

<script>
  function checkStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^a-zA-Z0-9]/.test(password)) score += 25;
    document.getElementById('passwordStrength').value = score;
  }
</script>
```

**电池电量**
```html
<!-- 电池电量(配合 Battery API) -->
<meter id="battery" value="0.75" min="0" max="1" low="0.2" high="0.5" optimum="1">
  75%
</meter>

<script>
  navigator.getBattery().then((battery) => {
    const meter = document.getElementById('battery');
    function update() {
      meter.value = battery.level;
    }
    update();
    battery.addEventListener('levelchange', update);
  });
</script>
```

## 动手试试

### 入门版（必做）

1. 用 `<progress>` 做一个“文件下载”进度条，用 JS 定时把 `value` 从 0 递增到 `max`；
2. 用 `<meter>` 显示“当前电量 70%”，并配置 `low`/`high`/`optimum` 观察颜色变化；
3. 用浏览器检查两个元素的语义：右键查看无障碍树中的角色与名称。

### 进阶版（选做）

1. 给进度条加自定义样式：圆角轨道 + 绿色填充；
2. 做一个“上传中”的不确定进度条（不写 `value`），完成后切换为确定进度；
3. 用 `aria-label` 给进度条补充“下载第 2/5 个文件”等动态描述。

## 核心知识点

> 一句话记住 progress/meter：任务进度用 `progress`，数值状态用 `meter`；`value`/`max` 定比例，`low`/`high`/`optimum` 管颜色。

- `progress` 表示任务完成度：无 `value` 为不确定进度，有 `value`/`max` 为确定进度；
- `meter` 表示数值在刻度区间的位置：`min`/`max`/`low`/`high`/`optimum` 共同决定语义颜色；
- 两者都可被 JavaScript 直接赋值更新，`position` 返回比例；
- 自定义样式需同时覆盖 WebKit 与 Firefox 的伪元素；
- 语义别混用：进度用 `progress`，状态用 `meter`。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 用 `meter` 显示进度 | 语义错误，读屏播报成“仪表” | 任务进度改用 `progress` |
| 用 `progress` 显示电量 | 语义错误 | 数值状态改用 `meter` |
| 样式只写 WebKit | Firefox 中样式不生效 | 同时写 `::-moz-*` 伪元素 |
| 覆盖颜色语义 | 用户失去直观判断 | 保留绿/黄/红含义或另加文字说明 |
| 忘记回退文字 | 旧环境无法理解数值 | 标签内写可读文本 |

## 扩展学习

- 无障碍：`html5/010-Accessibility` 中 ARIA 的 `progressbar`/`meter` 角色；
- 动画：`css/028-CSSAnimationTransition` 让进度变化更平滑；
- 组件化：`html5/024-WebComponentsPWADevelopment` 封装自定义进度条；
- 实时更新：`html5/030-WebSocket` 中上传/下载进度的真实数据来源。
