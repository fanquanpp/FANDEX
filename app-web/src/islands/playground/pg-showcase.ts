/**
 * 前端实验室灵感画廊：设计成品库（数据模块）
 *
 * 功能概述：
 *   - 收录 25 个可交互的前端设计成品，覆盖加载动画、按钮交互、卡片效果、
 *     文本动效、背景氛围、实用组件六类高频场景
 *   - 每个成品自带完整 HTML/CSS/JS 源码，可在画廊中实时预览，
 *     一键载入编辑器查看与修改
 *   - 成品代码全部为本仓库原创实现（参考社区流行效果的通用模式后重写），
 *     代码内注释与命名保持教学可读性
 *
 * 约定：
 *   - 成品源码运行在画廊/编辑器的沙箱 iframe 中，与站点样式完全隔离，
 *     因此源码内部使用独立配色，不消费站点令牌
 *   - 新增成品只需向 SHOWCASE_ITEMS 追加条目，画廊自动按 GROUPS 渲染
 */

/** 成品分组结构 */
export interface ShowcaseGroup {
  /** 分组 ID（对应成品的 groupId） */
  id: string;
  /** 分组名 */
  name: string;
  /** 分组一句话说明 */
  desc: string;
}

/** 成品条目结构 */
export interface ShowcaseItem {
  /** 成品 ID（唯一，用于 key 与地址定位） */
  id: string;
  /** 成品名称 */
  name: string;
  /** 所属分组 ID */
  groupId: string;
  /** 一句话说明（实现要点） */
  desc: string;
  /** 成品 HTML 源码 */
  html: string;
  /** 成品 CSS 源码 */
  css: string;
  /** 成品 JS 源码 */
  js: string;
}

/** 成品分组（画廊侧栏展示顺序） */
export const SHOWCASE_GROUPS: readonly ShowcaseGroup[] = [
  { id: 'loaders', name: '加载动画', desc: '等待也要有质感' },
  { id: 'buttons', name: '按钮交互', desc: '点击与悬停微反馈' },
  { id: 'cards', name: '卡片效果', desc: '悬浮与空间层次' },
  { id: 'texts', name: '文本动效', desc: '让标题开口说话' },
  { id: 'backgrounds', name: '背景氛围', desc: '页面情绪的底色' },
  { id: 'widgets', name: '实用组件', desc: '拿来即用的小部件' },
  { id: 'fandex', name: 'FANDEX 风格', desc: '本站同源的设计语言' },
];

/** 成品库（画廊网格展示顺序与分组顺序一致） */
export const SHOWCASE_ITEMS: readonly ShowcaseItem[] = [
  /* ============================================================
     加载动画
     ============================================================ */
  {
    id: 'loader-dual-ring',
    name: '双环旋转',
    groupId: 'loaders',
    desc: 'border 透明描边 + 反向旋转，最经典的全屏等待指示',
    html: '<div class="stage">\n  <div class="spinner">\n    <span class="ring ring-outer"></span>\n    <span class="ring ring-inner"></span>\n  </div>\n  <p class="hint">加载中，请稍候</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.spinner {\n  position: relative;\n  width: 72px;\n  height: 72px;\n  margin: 0 auto 18px;\n}\n.ring {\n  position: absolute;\n  border-radius: 50%;\n  /* 描边三段式：上色、两侧半透明，旋转时形成缺口感 */\n  border: 4px solid transparent;\n}\n.ring-outer {\n  inset: 0;\n  border-top-color: #35c4dc;\n  border-right-color: rgba(53, 196, 220, 0.35);\n  animation: spin 1.1s linear infinite;\n}\n.ring-inner {\n  inset: 14px;\n  border-bottom-color: #e8b93e;\n  border-left-color: rgba(232, 185, 62, 0.35);\n  animation: spin 0.9s linear infinite reverse;\n}\n@keyframes spin {\n  to { transform: rotate(360deg); }\n}\n.hint {\n  color: #8fa3b0;\n  font-size: 13px;\n  letter-spacing: 0.2em;\n}',
    js: "// 纯 CSS 实现：外环顺时针、内环逆时针，双层速度差制造机械感\nconsole.log('双环旋转：无 JavaScript 参与');",
  },
  {
    id: 'loader-bars',
    name: '条形频谱',
    groupId: 'loaders',
    desc: '多根竖条错峰伸缩，类似音频均衡器的节奏感',
    html: '<div class="stage">\n  <div class="bars">\n    <span></span>\n    <span></span>\n    <span></span>\n    <span></span>\n    <span></span>\n  </div>\n  <p class="hint">SIGNAL SYNC</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.bars {\n  display: flex;\n  gap: 7px;\n  align-items: center;\n  height: 56px;\n  margin-bottom: 18px;\n}\n.bars span {\n  width: 6px;\n  height: 100%;\n  border-radius: 2px;\n  background: linear-gradient(180deg, #35c4dc, #2a7de1);\n  /* scale 变换由中心出发，只触发合成不引起重排 */\n  animation: bounce 1s ease-in-out infinite;\n}\n/* 相邻竖条延迟错峰，形成波浪 */\n.bars span:nth-child(1) { animation-delay: -0.9s; }\n.bars span:nth-child(2) { animation-delay: -0.7s; }\n.bars span:nth-child(3) { animation-delay: -0.5s; }\n.bars span:nth-child(4) { animation-delay: -0.3s; }\n.bars span:nth-child(5) { animation-delay: -0.1s; }\n@keyframes bounce {\n  0%, 100% { transform: scaleY(0.25); }\n  50% { transform: scaleY(1); }\n}\n.hint {\n  color: #8fa3b0;\n  font-family: monospace;\n  font-size: 12px;\n  letter-spacing: 0.3em;\n}',
    js: "// 负的 animation-delay 让动画从中间开始，避免首帧所有竖条同时静止\nconsole.log('条形频谱：错峰负延迟');",
  },
  {
    id: 'loader-orbit',
    name: '轨道方块',
    groupId: 'loaders',
    desc: '双层轨道反向旋转，方块沿轨道环绕并留下渐隐尾迹',
    html: '<div class="stage">\n  <div class="orbit">\n    <span class="track"></span>\n    <span class="cube cube-a"></span>\n    <span class="cube cube-b"></span>\n  </div>\n  <p class="hint">ORBITAL LOADER</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.orbit {\n  position: relative;\n  width: 84px;\n  height: 84px;\n  margin: 0 auto 18px;\n}\n.track {\n  position: absolute;\n  inset: 0;\n  border: 1px dashed rgba(143, 163, 176, 0.4);\n  border-radius: 50%;\n}\n.cube {\n  position: absolute;\n  top: -5px;\n  left: calc(50% - 5px);\n  width: 10px;\n  height: 10px;\n  /* 尾迹：方块身后拖出淡色投影 */\n  box-shadow: 0 24px 0 -2px rgba(53, 196, 220, 0.55),\n    0 -24px 0 -4px rgba(53, 196, 220, 0.25);\n  animation: orbit-spin 1.6s cubic-bezier(0.6, 0.1, 0.4, 0.9) infinite;\n}\n.cube-a { background: #35c4dc; }\n/* 第二个方块反向且半径更小，速度更快 */\n.cube-b {\n  background: #e8b93e;\n  box-shadow: 0 -18px 0 -2px rgba(232, 185, 62, 0.55);\n  animation: orbit-inner 1.1s linear infinite reverse;\n}\n@keyframes orbit-spin {\n  to { transform: rotate(360deg); }\n}\n@keyframes orbit-inner {\n  to { transform: rotate(-360deg); }\n}\n@keyframes orbit-tilt {\n  to { transform: rotate(-360deg); }\n}\n.orbit { animation: orbit-tilt 12s linear infinite; }\n.hint {\n  color: #8fa3b0;\n  font-family: monospace;\n  font-size: 12px;\n  letter-spacing: 0.3em;\n}',
    js: "// 旋转发生在容器坐标轴上：方块本身不动，轨道转动即环绕\nconsole.log('轨道方块：容器旋转代替路径动画');",
  },
  {
    id: 'loader-conic',
    name: '渐变流光环',
    groupId: 'loaders',
    desc: 'conic-gradient 圆环旋转，中心挖空的现代感加载',
    html: '<div class="stage">\n  <div class="ring"></div>\n  <p class="hint">正在构建 68%</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.ring {\n  width: 84px;\n  height: 84px;\n  border-radius: 50%;\n  /* 锥形渐变产生首尾亮度差，旋转时形成流光感 */\n  background: conic-gradient(\n    from 0deg,\n    transparent 0deg,\n    #35c4dc 120deg,\n    #7ef0ff 300deg,\n    transparent 360deg\n  );\n  /* 用遮罩挖空中心，只留环带；环带厚度由 28px 控制 */\n  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px));\n  mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px));\n  animation: spin 1.2s linear infinite;\n}\n@keyframes spin {\n  to { transform: rotate(360deg); }\n}\n.hint {\n  margin-top: 20px;\n  color: #8fa3b0;\n  font-family: monospace;\n  font-size: 12px;\n  letter-spacing: 0.2em;\n}',
    js: "// mask 挖空比 border 方案更自由：环带粗细、缺口范围都能精确控制\nconsole.log('渐变流光环：conic-gradient + mask');",
  },

  /* ============================================================
     按钮交互
     ============================================================ */
  {
    id: 'btn-shine',
    name: '高光扫过',
    groupId: 'buttons',
    desc: '悬停时一道斜向高光扫过按钮表面，低调又有光泽',
    html: '<div class="stage">\n  <button class="shine-btn">提交订单</button>\n  <p class="hint">把鼠标移到按钮上</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.shine-btn {\n  position: relative;\n  overflow: hidden;\n  padding: 12px 34px;\n  border: 1px solid #35c4dc;\n  border-radius: 4px;\n  background: #16232b;\n  color: #7ef0ff;\n  font-size: 15px;\n  letter-spacing: 0.1em;\n  cursor: pointer;\n  transition: box-shadow 0.3s ease, transform 0.15s ease;\n}\n.shine-btn:hover {\n  box-shadow: 0 0 18px rgba(53, 196, 220, 0.4);\n}\n.shine-btn:active {\n  transform: translateY(1px);\n}\n/* 高光条平时停在左外侧，hover 时扫到右外侧 */\n.shine-btn::after {\n  content: "";\n  position: absolute;\n  top: -40%;\n  left: -80%;\n  width: 40%;\n  height: 180%;\n  background: linear-gradient(\n    105deg,\n    transparent,\n    rgba(255, 255, 255, 0.28),\n    transparent\n  );\n  transform: skewX(-20deg);\n  transition: left 0.55s ease;\n}\n.shine-btn:hover::after {\n  left: 140%;\n}\n.hint {\n  margin-top: 16px;\n  color: #8fa3b0;\n  font-size: 12px;\n}',
    js: "// 高光条用 ::after 伪元素绘制，transform: skewX 制造斜切角度\nconsole.log('点击按钮试试 active 下沉反馈');",
  },
  {
    id: 'btn-ripple',
    name: '波纹点击',
    groupId: 'buttons',
    desc: 'Material 风格点击波纹，波纹从按下位置向外扩散',
    html: '<div class="stage">\n  <button class="ripple-btn">点我任意位置</button>\n  <p class="hint">波纹起点跟随鼠标按下位置</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.ripple-btn {\n  position: relative;\n  overflow: hidden;\n  padding: 13px 36px;\n  border: none;\n  border-radius: 4px;\n  background: #35c4dc;\n  color: #062a30;\n  font-size: 15px;\n  font-weight: 600;\n  cursor: pointer;\n}\n/* 波纹元素由 JS 动态插入，样式集中在这里 */\n.ripple-ink {\n  position: absolute;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.55);\n  transform: scale(0);\n  animation: ink 0.6s ease-out forwards;\n  pointer-events: none;\n}\n@keyframes ink {\n  to {\n    transform: scale(2.6);\n    opacity: 0;\n  }\n}\n.hint {\n  margin-top: 16px;\n  color: #8fa3b0;\n  font-size: 12px;\n}',
    js:
      "const btn = document.querySelector('.ripple-btn');\nbtn.addEventListener('pointerdown', (e) => {\n  const rect = btn.getBoundingClientRect();\n  // 波纹直径取按钮对角线，保证覆盖全按钮\n  const size = Math.max(rect.width, rect.height) * 2;\n  const ink = document.createElement('span');\n  ink.className = 'ripple-ink';\n  ink.style.width = ink.style.height = size + 'px';\n  // 让波纹中心对准按下坐标\n  ink.style.left = e.clientX - rect.left - size / 2 + 'px';\n  ink.style.top = e.clientY - rect.top - size / 2 + 'px';\n  btn.appendChild(ink);\n  // 动画结束后清理节点，避免 DOM 无限增长\n  ink.addEventListener('animationend', () => ink.remove());\n});",
  },
  {
    id: 'btn-border-flow',
    name: '流光描边',
    groupId: 'buttons',
    desc: '旋转的锥形渐变透过边框缝隙流动，科技感十足',
    html: '<div class="stage">\n  <button class="flow-btn"><span>立即体验</span></button>\n  <p class="hint">边框渐变持续旋转</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.flow-btn {\n  position: relative;\n  padding: 3px;\n  border: none;\n  border-radius: 6px;\n  background: conic-gradient(\n    #35c4dc,\n    #e8b93e,\n    #e05a4e,\n    #35c4dc\n  );\n  cursor: pointer;\n  /* 渐变层自身旋转，通过内层 span 露出 3px 边缘 */\n  animation: rotate 3s linear infinite;\n}\n.flow-btn span {\n  display: block;\n  padding: 11px 34px;\n  border-radius: 4px;\n  background: #101418;\n  color: #e8f6f8;\n  font-size: 15px;\n  letter-spacing: 0.08em;\n  transition: background 0.3s ease;\n}\n.flow-btn:hover span {\n  background: #17222a;\n}\n@keyframes rotate {\n  to { transform: rotate(1turn); }\n}\n.hint {\n  margin-top: 16px;\n  color: #8fa3b0;\n  font-size: 12px;\n}',
    js: "// 思路：按钮本身是旋转的渐变面板，内层深色 span 只留 3px 缝隙当边框\nconsole.log('流光描边：外层旋转 + 内层遮挡');",
  },
  {
    id: 'btn-label-flip',
    name: '滑动换字',
    groupId: 'buttons',
    desc: '悬停时文字上滑离场、副文案从下方滑入接管',
    html: '<div class="stage">\n  <button class="flip-btn">\n    <span class="flip-window">\n      <span class="flip-row">\n        <span class="flip-a">下载安装包</span>\n        <span class="flip-b">Windows 64 位</span>\n      </span>\n    </span>\n  </button>\n  <p class="hint">悬停查看副文案接管</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.flip-btn {\n  padding: 0;\n  border: 1px solid #35c4dc;\n  border-radius: 4px;\n  background: #16232b;\n  cursor: pointer;\n}\n/* 裁切窗口：只露出一行文字的高度 */\n.flip-window {\n  display: block;\n  height: 44px;\n  overflow: hidden;\n}\n.flip-row {\n  display: flex;\n  flex-direction: column;\n  transition: transform 0.35s cubic-bezier(0.33, 1, 0.68, 1);\n}\n.flip-a,\n.flip-b {\n  display: grid;\n  place-items: center;\n  height: 44px;\n  padding: 0 30px;\n  font-size: 15px;\n  letter-spacing: 0.06em;\n  white-space: nowrap;\n}\n.flip-a { color: #7ef0ff; }\n.flip-b { color: #e8b93e; }\n.flip-btn:hover .flip-row {\n  transform: translateY(-44px);\n}\n.hint {\n  margin-top: 16px;\n  color: #8fa3b0;\n  font-size: 12px;\n}',
    js: "// 双行文字叠在裁切窗口里，hover 时整列上移一行高度即完成换字\nconsole.log('滑动换字：overflow 裁切 + translateY');",
  },

  /* ============================================================
     卡片效果
     ============================================================ */
  {
    id: 'card-tilt',
    name: '3D 视差跟随',
    groupId: 'cards',
    desc: '鼠标位置驱动卡片倾斜与高光位移，空间感立现',
    html: '<div class="stage">\n  <div class="tilt-card" id="card">\n    <div class="glare"></div>\n    <h3>GD-7 空间站</h3>\n    <p>移动鼠标，感受透视倾斜与表面高光。</p>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: radial-gradient(circle at 50% 30%, #1a2530, #0d1117);\n  font-family: sans-serif;\n}\n.stage { perspective: 900px; }\n.tilt-card {\n  position: relative;\n  width: 260px;\n  padding: 26px 22px;\n  border: 1px solid rgba(126, 240, 255, 0.25);\n  border-radius: 6px;\n  background: linear-gradient(160deg, #182430, #101a22);\n  color: #dfe9ee;\n  /* preserve-3d 让子元素共享透视空间 */\n  transform-style: preserve-3d;\n  will-change: transform;\n  transition: transform 0.12s ease-out;\n}\n.tilt-card h3 {\n  margin: 0 0 10px;\n  font-size: 18px;\n  letter-spacing: 0.1em;\n  color: #7ef0ff;\n}\n.tilt-card p {\n  margin: 0;\n  font-size: 13px;\n  line-height: 1.7;\n  color: #9db2bd;\n}\n/* 高光层：位置由 JS 写入 CSS 变量 */\n.glare {\n  position: absolute;\n  inset: 0;\n  border-radius: inherit;\n  background: radial-gradient(\n    circle at var(--gx, 50%) var(--gy, 50%),\n    rgba(255, 255, 255, 0.16),\n    transparent 55%\n  );\n  pointer-events: none;\n}',
    js:
      "const card = document.getElementById('card');\nconst stage = document.querySelector('.stage');\nstage.addEventListener('pointermove', (e) => {\n  const rect = card.getBoundingClientRect();\n  // 归一化到 -0.5 ~ 0.5，乘以最大倾斜角度\n  const px = (e.clientX - rect.left) / rect.width - 0.5;\n  const py = (e.clientY - rect.top) / rect.height - 0.5;\n  card.style.transform = `rotateX(${-py * 14}deg) rotateY(${px * 16}deg)`;\n  card.style.setProperty('--gx', `${(px + 0.5) * 100}%`);\n  card.style.setProperty('--gy', `${(py + 0.5) * 100}%`);\n});\nstage.addEventListener('pointerleave', () => {\n  card.style.transform = 'rotateX(0deg) rotateY(0deg)';\n});",
  },
  {
    id: 'card-glass',
    name: '玻璃拟态',
    groupId: 'cards',
    desc: 'backdrop-filter 磨砂玻璃卡片，叠在彩色光斑之上',
    html: '<div class="stage">\n  <div class="blob blob-a"></div>\n  <div class="blob blob-b"></div>\n  <div class="glass-card">\n    <h3>毛玻璃面板</h3>\n    <p>backdrop-filter 对卡片背后的光斑做实时模糊。</p>\n    <button>继续</button>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  overflow: hidden;\n  background: #0d1117;\n  font-family: sans-serif;\n}\n.stage {\n  position: relative;\n  display: grid;\n  place-items: center;\n  width: 100%;\n  height: 100vh;\n}\n.blob {\n  position: absolute;\n  width: 220px;\n  height: 220px;\n  border-radius: 50%;\n  filter: blur(10px);\n  opacity: 0.8;\n  animation: drift 9s ease-in-out infinite alternate;\n}\n.blob-a { background: #2a7de1; top: 18%; left: 22%; }\n.blob-b { background: #e05a4e; bottom: 16%; right: 22%; animation-delay: -4s; }\n@keyframes drift {\n  to { transform: translate(36px, -30px) scale(1.12); }\n}\n.glass-card {\n  position: relative;\n  width: 280px;\n  padding: 26px 24px;\n  border: 1px solid rgba(255, 255, 255, 0.22);\n  border-radius: 8px;\n  /* 磨砂核心：模糊 + 提亮背后内容 */\n  background: rgba(255, 255, 255, 0.08);\n  backdrop-filter: blur(16px) saturate(1.3);\n  -webkit-backdrop-filter: blur(16px) saturate(1.3);\n  color: #f0f6f8;\n  text-align: center;\n  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);\n}\n.glass-card h3 { margin: 0 0 10px; font-size: 18px; }\n.glass-card p {\n  margin: 0 0 18px;\n  font-size: 13px;\n  line-height: 1.7;\n  color: rgba(240, 246, 248, 0.75);\n}\n.glass-card button {\n  padding: 9px 26px;\n  border: none;\n  border-radius: 4px;\n  background: #7ef0ff;\n  color: #06282e;\n  font-weight: 600;\n  cursor: pointer;\n}',
    js: "// backdrop-filter 需要 Chrome 76+/Safari 9+（-webkit- 前缀），Firefox 103+ 已支持\nconsole.log('玻璃拟态三件套：半透明底 + 模糊 + 细描边');",
  },
  {
    id: 'card-flip',
    name: '3D 翻转卡',
    groupId: 'cards',
    desc: '悬停时卡片绕 Y 轴翻面，正反两面独立排版',
    html: '<div class="stage">\n  <div class="flip-scene">\n    <div class="flip-card">\n      <div class="face face-front">\n        <h3>CSS 3D</h3>\n        <p>悬停翻面</p>\n      </div>\n      <div class="face face-back">\n        <h3>背面</h3>\n        <p>rotateY(180deg)</p>\n      </div>\n    </div>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n/* 场景负责透视；卡片负责翻转 */\n.flip-scene { perspective: 1000px; }\n.flip-card {\n  position: relative;\n  width: 240px;\n  height: 150px;\n  transform-style: preserve-3d;\n  transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1);\n}\n.flip-scene:hover .flip-card {\n  transform: rotateY(180deg);\n}\n.face {\n  position: absolute;\n  inset: 0;\n  display: grid;\n  place-content: center;\n  gap: 8px;\n  text-align: center;\n  border-radius: 6px;\n  /* backface-visibility 隐藏转到背后的那一面 */\n  backface-visibility: hidden;\n  -webkit-backface-visibility: hidden;\n}\n.face h3 { margin: 0; font-size: 20px; letter-spacing: 0.12em; }\n.face p { margin: 0; font-size: 12px; font-family: monospace; }\n.face-front {\n  border: 1px solid rgba(53, 196, 220, 0.5);\n  background: #16232b;\n  color: #7ef0ff;\n}\n.face-back {\n  transform: rotateY(180deg);\n  border: 1px solid rgba(232, 185, 62, 0.5);\n  background: #26200f;\n  color: #e8b93e;\n}',
    js: "// 两个关键：preserve-3d 保留空间关系，backface-visibility: hidden 隐藏背面\nconsole.log('悬停卡片即可翻面');",
  },
  {
    id: 'card-spotlight',
    name: '聚光灯描边',
    groupId: 'cards',
    desc: '光斑跟随鼠标，边框在光斑经过处被点亮',
    html: '<div class="stage" id="stage">\n  <div class="spot-card">\n    <h3>SPOTLIGHT</h3>\n    <p>边框高亮跟随鼠标移动。</p>\n  </div>\n  <div class="spot-card">\n    <h3>GLOW BORDER</h3>\n    <p>技术原理是双层渐变叠加。</p>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  gap: 20px;\n  grid-auto-flow: column;\n  background: #0d1117;\n  font-family: sans-serif;\n}\n/* 外层负责描边光斑，内层负责表面光斑 */\n.spot-card {\n  position: relative;\n  width: 230px;\n  padding: 2px;\n  border-radius: 8px;\n  background: radial-gradient(\n    340px circle at var(--mx, 50%) var(--my, 50%),\n    rgba(126, 240, 255, 0.85),\n    rgba(126, 240, 255, 0.08) 45%\n  );\n}\n.spot-card h3 {\n  margin: 0 0 8px;\n  font-size: 15px;\n  letter-spacing: 0.18em;\n  color: #7ef0ff;\n  font-family: monospace;\n}\n.spot-card p {\n  margin: 0;\n  font-size: 13px;\n  color: #9db2bd;\n}\n.spot-card::before {\n  content: "";\n  display: block;\n  border-radius: 6px;\n  background: #12181f;\n  padding: 22px 20px;\n}',
    js:
      "const stage = document.getElementById('stage');\n// 光斑坐标写在容器上，两张卡片共享同一组变量，靠近哪张哪张亮\nstage.addEventListener('pointermove', (e) => {\n  stage.querySelectorAll('.spot-card').forEach((card) => {\n    const rect = card.getBoundingClientRect();\n    card.style.setProperty('--mx', e.clientX - rect.left + 'px');\n    card.style.setProperty('--my', e.clientY - rect.top + 'px');\n  });\n});",
  },

  /* ============================================================
     文本动效
     ============================================================ */
  {
    id: 'text-gradient-flow',
    name: '渐变流动文字',
    groupId: 'texts',
    desc: 'background-clip: text + 位移渐变，颜色在字里流动',
    html: '<div class="stage">\n  <h1 class="flow-text">CREATIVE CODING</h1>\n  <p class="hint">background-clip: text 让渐变只填充文字</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.flow-text {\n  margin: 0;\n  font-size: clamp(30px, 7vw, 58px);\n  font-weight: 800;\n  letter-spacing: 0.06em;\n  /* 渐变宽度设为 200%，位移时颜色才循环流动 */\n  background: linear-gradient(\n    90deg,\n    #35c4dc, #7ef0ff, #e8b93e, #e05a4e, #35c4dc\n  );\n  background-size: 200% 100%;\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n  animation: flow 4s linear infinite;\n}\n@keyframes flow {\n  to { background-position: -200% 0; }\n}\n.hint {\n  color: #8fa3b0;\n  font-size: 12px;\n  font-family: monospace;\n}',
    js: "// color: transparent 配合 background-clip: text，文字变成渐变的窗口\nconsole.log('渐变流动：200% 宽度 + background-position 位移');",
  },
  {
    id: 'text-typing',
    name: '打字机',
    groupId: 'texts',
    desc: '逐字输出 + 竖条光标闪烁，循环播放多段文案',
    html: '<div class="stage">\n  <p class="type-line"><span id="type-text"></span><span class="caret"></span></p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: monospace;\n}\n.type-line {\n  margin: 0;\n  font-size: 22px;\n  color: #dfe9ee;\n  letter-spacing: 0.04em;\n}\n/* 光标就是一根会呼吸的竖条 */\n.caret {\n  display: inline-block;\n  width: 2px;\n  height: 1.1em;\n  margin-left: 3px;\n  vertical-align: text-bottom;\n  background: #35c4dc;\n  animation: blink 0.9s steps(1) infinite;\n}\n@keyframes blink {\n  50% { opacity: 0; }\n}',
    js:
      "// 打字机主循环：打字 -> 停顿 -> 删除 -> 下一段\nconst phrases = ['你好，前端世界。', '把想法编译成界面。', 'Keep building.'];\nconst el = document.getElementById('type-text');\nlet pi = 0;\nlet ci = 0;\nlet deleting = false;\nfunction tick() {\n  const text = phrases[pi];\n  ci += deleting ? -1 : 1;\n  el.textContent = text.slice(0, ci);\n  let delay = deleting ? 45 : 130;\n  if (!deleting && ci === text.length) {\n    delay = 1600; // 整句停留\n    deleting = true;\n  } else if (deleting && ci === 0) {\n    deleting = false;\n    pi = (pi + 1) % phrases.length;\n    delay = 400; // 换句前喘口气\n  }\n  setTimeout(tick, delay);\n}\ntick();",
  },
  {
    id: 'text-neon',
    name: '霓虹灯牌',
    groupId: 'texts',
    desc: '多层 text-shadow 堆出发光体，偶发闪烁模拟老灯管',
    html: '<div class="stage">\n  <h1 class="neon">NEON</h1>\n  <h1 class="neon neon-pink">NIGHT</h1>\n  <p class="hint">text-shadow 不产生模糊溢出，纯文字发光</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #07090d;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.neon {\n  margin: 6px 0;\n  font-size: clamp(44px, 9vw, 76px);\n  font-weight: 800;\n  letter-spacing: 0.22em;\n  color: #7ef0ff;\n  /* 由内向外四层光晕：越远越淡越大 */\n  text-shadow:\n    0 0 6px rgba(126, 240, 255, 0.9),\n    0 0 18px rgba(126, 240, 255, 0.55),\n    0 0 42px rgba(53, 196, 220, 0.5),\n    0 0 80px rgba(53, 196, 220, 0.35);\n  animation: hum 3.4s ease-in-out infinite;\n}\n.neon-pink {\n  color: #ff7edb;\n  text-shadow:\n    0 0 6px rgba(255, 126, 219, 0.9),\n    0 0 18px rgba(255, 126, 219, 0.55),\n    0 0 42px rgba(224, 90, 178, 0.5),\n    0 0 80px rgba(224, 90, 178, 0.35);\n  /* 偶发闪烁：多数时间亮，短暂变暗 */\n  animation: flicker 4.2s linear infinite;\n}\n@keyframes hum {\n  50% {\n    text-shadow:\n      0 0 4px rgba(126, 240, 255, 0.7),\n      0 0 12px rgba(126, 240, 255, 0.4),\n      0 0 28px rgba(53, 196, 220, 0.35),\n      0 0 56px rgba(53, 196, 220, 0.25);\n  }\n}\n@keyframes flicker {\n  0%, 6.5%, 8%, 100% { opacity: 1; }\n  7% { opacity: 0.35; }\n  42% { opacity: 1; }\n  43% { opacity: 0.55; }\n  44% { opacity: 1; }\n}\n.hint {\n  color: #5c6b76;\n  font-size: 12px;\n  font-family: monospace;\n}',
    js: "// 霓虹 = 亮色文字 + 多层递增 blur 半径的 text-shadow\nconsole.log('flicker 用不均匀关键帧制造灯管接触不良感');",
  },
  {
    id: 'text-stagger',
    name: '逐字入场',
    groupId: 'texts',
    desc: 'JS 拆字后按序错峰上浮，点击可重播',
    html: '<div class="stage">\n  <h1 class="stagger" id="stagger">设计即代码</h1>\n  <button class="replay">重播动画</button>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.stagger {\n  margin: 0 0 26px;\n  font-size: clamp(30px, 6vw, 52px);\n  font-weight: 800;\n  letter-spacing: 0.08em;\n  color: #e8f6f8;\n}\n/* 每个字包在 .ch 里，默认沉在下方不可见 */\n.stagger .ch {\n  display: inline-block;\n  opacity: 0;\n  transform: translateY(0.6em);\n  animation: rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;\n}\n@keyframes rise {\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n.replay {\n  padding: 9px 24px;\n  border: 1px solid #35c4dc;\n  border-radius: 4px;\n  background: transparent;\n  color: #7ef0ff;\n  font-size: 13px;\n  cursor: pointer;\n}\n.replay:hover { background: rgba(53, 196, 220, 0.12); }',
    js:
      "const title = document.getElementById('stagger');\nfunction play() {\n  const chars = Array.from(title.textContent);\n  title.textContent = '';\n  chars.forEach((ch, i) => {\n    const span = document.createElement('span');\n    span.className = 'ch';\n    span.textContent = ch;\n    // 每个字延迟 70ms，制造接力感\n    span.style.animationDelay = i * 70 + 'ms';\n    title.appendChild(span);\n  });\n}\nplay();\ndocument.querySelector('.replay').addEventListener('click', play);",
  },

  /* ============================================================
     背景氛围
     ============================================================ */
  {
    id: 'bg-aurora',
    name: '极光渐变',
    groupId: 'backgrounds',
    desc: '多块模糊色斑缓慢漂移，叠出深空的极光氛围',
    html: '<div class="aurora">\n  <div class="beam beam-a"></div>\n  <div class="beam beam-b"></div>\n  <div class="beam beam-c"></div>\n  <div class="content">\n    <h1>Aurora</h1>\n    <p>深色底 + 三层漂移光斑</p>\n  </div>\n</div>',
    css:
      'body { margin: 0; font-family: sans-serif; }\n.aurora {\n  position: relative;\n  min-height: 100vh;\n  overflow: hidden;\n  display: grid;\n  place-items: center;\n  background: #07090f;\n}\n.beam {\n  position: absolute;\n  width: 46vw;\n  height: 46vw;\n  border-radius: 50%;\n  filter: blur(90px);\n  opacity: 0.5;\n}\n.beam-a { background: #1f6f43; top: -12%; left: -8%; animation: sway-a 14s ease-in-out infinite alternate; }\n.beam-b { background: #1a4a7a; bottom: -16%; right: -6%; animation: sway-b 17s ease-in-out infinite alternate; }\n.beam-c { background: #5b2a7e; top: 26%; right: 24%; width: 32vw; height: 32vw; animation: sway-a 11s ease-in-out infinite alternate-reverse; }\n@keyframes sway-a {\n  to { transform: translate(9vw, 7vh) scale(1.15); }\n}\n@keyframes sway-b {\n  to { transform: translate(-8vw, -6vh) scale(0.9); }\n}\n.content {\n  position: relative;\n  text-align: center;\n  color: #e6f2ec;\n}\n.content h1 {\n  margin: 0 0 10px;\n  font-size: clamp(40px, 8vw, 72px);\n  letter-spacing: 0.3em;\n  font-weight: 200;\n}\n.content p { margin: 0; color: rgba(230, 242, 236, 0.6); letter-spacing: 0.2em; font-size: 13px; }',
    js: "// 极光的灵魂在 blur(90px) 的大半径模糊：色斑边界融成光带\nconsole.log('三层色斑用不同周期错开，避免同步呼吸');",
  },
  {
    id: 'bg-grid-flow',
    name: '透视流动网格',
    groupId: 'backgrounds',
    desc: '渐变网格向地平线滚动，赛博空间的经典底纹',
    html: '<div class="scene">\n  <div class="grid-floor"></div>\n  <div class="headline">GRID FLOW</div>\n</div>',
    css:
      'body { margin: 0; overflow: hidden; background: #07090d; font-family: sans-serif; }\n.scene {\n  position: relative;\n  height: 100vh;\n  display: grid;\n  place-items: center;\n  perspective: 380px;\n  overflow: hidden;\n}\n/* 网格地面：平铺渐变线，再用位移动画让它向后滚动 */\n.grid-floor {\n  position: absolute;\n  inset: 40% -60% -30%;\n  background-image:\n    linear-gradient(rgba(53, 196, 220, 0.35) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(53, 196, 220, 0.35) 1px, transparent 1px);\n  background-size: 44px 44px;\n  transform: rotateX(62deg);\n  animation: roll 2.4s linear infinite;\n}\n@keyframes roll {\n  to { background-position-y: 44px; }\n}\n/* 顶部雾化遮罩，把地平线融进黑暗 */\n.scene::after {\n  content: "";\n  position: absolute;\n  inset: 0 0 55%;\n  background: linear-gradient(180deg, #07090d 30%, transparent);\n}\n.headline {\n  position: relative;\n  color: #7ef0ff;\n  font-size: clamp(28px, 6vw, 52px);\n  font-family: monospace;\n  letter-spacing: 0.4em;\n  text-shadow: 0 0 22px rgba(53, 196, 220, 0.6);\n}',
    js: "// rotateX 把平面压出透视纵深，背景位移负责滚动，两层互不干扰\nconsole.log('网格滚动周期 = 一格尺寸，速度均匀无跳变');",
  },
  {
    id: 'bg-gradient-wave',
    name: '渐变涌动',
    groupId: 'backgrounds',
    desc: '大尺寸渐变缓慢位移，低成本的全屏氛围底',
    html: '<div class="wave-bg">\n  <div class="center-box">\n    <h1>Gradient Wave</h1>\n    <p>适合登录页与 Hero 区</p>\n  </div>\n</div>',
    css:
      'body { margin: 0; font-family: sans-serif; }\n.wave-bg {\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  /* 两层渐变叠加：底层横向流动，上层纵向呼吸 */\n  background:\n    radial-gradient(ellipse 80% 60% at 30% 20%, rgba(53, 196, 220, 0.28), transparent 60%),\n    linear-gradient(120deg, #0e1a24, #101c2c, #1a1430, #0e1a24);\n  background-size: 160% 160%, 300% 300%;\n  animation: surge 12s ease-in-out infinite;\n}\n@keyframes surge {\n  0%, 100% { background-position: 0% 0%, 0% 50%; }\n  50% { background-position: 60% 40%, 100% 50%; }\n}\n.center-box { text-align: center; color: #e2eef5; }\n.center-box h1 {\n  margin: 0 0 10px;\n  font-size: clamp(32px, 7vw, 60px);\n  font-weight: 300;\n  letter-spacing: 0.12em;\n}\n.center-box p { margin: 0; color: rgba(226, 238, 245, 0.55); letter-spacing: 0.25em; font-size: 13px; }',
    js: "// background-size 放大到 300% 才有位移余地，动画只动 position 不动尺寸\nconsole.log('linear + radial 双层渐变错向运动，层次感翻倍');",
  },
  {
    id: 'bg-stars',
    name: '星空闪烁',
    groupId: 'backgrounds',
    desc: 'JS 播种随机星点，CSS 负责各自节奏的闪烁',
    html: '<div class="night" id="night">\n  <div class="moon"></div>\n  <p class="caption">STARRY NIGHT</p>\n</div>',
    css:
      'body { margin: 0; font-family: sans-serif; }\n.night {\n  position: relative;\n  min-height: 100vh;\n  overflow: hidden;\n  display: grid;\n  place-items: center;\n  background: radial-gradient(ellipse at 70% 20%, #14203a, #07090f 70%);\n}\n/* JS 生成星点后统一用这个类驱动闪烁 */\n.star {\n  position: absolute;\n  background: #cfe6f5;\n  border-radius: 50%;\n  animation: twinkle var(--dur, 3s) ease-in-out infinite;\n  animation-delay: var(--delay, 0s);\n}\n@keyframes twinkle {\n  0%, 100% { opacity: 0.15; transform: scale(0.8); }\n  50% { opacity: 1; transform: scale(1.15); }\n}\n.moon {\n  position: absolute;\n  top: 14%;\n  right: 16%;\n  width: 72px;\n  height: 72px;\n  border-radius: 50%;\n  background: #e8edf2;\n  box-shadow: 0 0 42px rgba(232, 237, 242, 0.45);\n}\n.caption {\n  position: relative;\n  color: #5f7186;\n  font-family: monospace;\n  letter-spacing: 0.5em;\n  font-size: 13px;\n}',
    js:
      "const night = document.getElementById('night');\nconst COUNT = 90;\nfor (let i = 0; i < COUNT; i++) {\n  const star = document.createElement('i');\n  star.className = 'star';\n  // 每颗星的位置、大小、节奏全部随机，避免整齐划一的假感\n  const size = Math.random() * 2 + 1;\n  star.style.width = star.style.height = size + 'px';\n  star.style.left = Math.random() * 100 + '%';\n  star.style.top = Math.random() * 100 + '%';\n  star.style.setProperty('--dur', Math.random() * 3 + 2 + 's');\n  star.style.setProperty('--delay', Math.random() * 4 + 's');\n  night.appendChild(star);\n}",
  },

  /* ============================================================
     实用组件
     ============================================================ */
  {
    id: 'widget-toggle',
    name: '开关 Switch',
    groupId: 'widgets',
    desc: '纯 CSS 复选框开关，滑块带缓动回弹',
    html: '<div class="stage">\n  <label class="switch-row">\n    <span class="switch-label">深色模式</span>\n    <input type="checkbox" class="switch-input" checked />\n    <span class="switch-track"><span class="switch-thumb"></span></span>\n  </label>\n  <label class="switch-row">\n    <span class="switch-label">自动同步</span>\n    <input type="checkbox" class="switch-input" />\n    <span class="switch-track"><span class="switch-thumb"></span></span>\n  </label>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage { display: grid; gap: 18px; }\n.switch-row {\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  cursor: pointer;\n  color: #dfe9ee;\n  font-size: 15px;\n}\n.switch-input {\n  position: absolute;\n  opacity: 0;\n  /* 输入框不可见但保留可聚焦性 */\n}\n.switch-track {\n  position: relative;\n  width: 46px;\n  height: 24px;\n  border-radius: 12px;\n  background: #2a333c;\n  transition: background 0.25s ease;\n}\n.switch-thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 18px;\n  height: 18px;\n  border-radius: 9px;\n  background: #8fa3b0;\n  transition:\n    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),\n    background 0.25s ease;\n}\n.switch-input:checked + .switch-track { background: #1d6f80; }\n.switch-input:checked + .switch-track .switch-thumb {\n  transform: translateX(22px);\n  background: #35c4dc;\n}\n/* 键盘可达性：聚焦时描边高亮 */\n.switch-input:focus-visible + .switch-track {\n  outline: 2px solid #35c4dc;\n  outline-offset: 2px;\n}',
    js: "// 用 checkbox 的 checked 状态驱动样式，input 本身透明但保留键盘操作\nconsole.log('回弹感来自 cubic-bezier 的过冲参数');",
  },
  {
    id: 'widget-tabs',
    name: '标签页 Tabs',
    groupId: 'widgets',
    desc: 'JS 切换内容面板，底部指示条平滑跟随',
    html: '<div class="stage">\n  <div class="tabs" id="tabs">\n    <div class="tab-list" role="tablist">\n      <button class="tab is-active" role="tab">概览</button>\n      <button class="tab" role="tab">参数</button>\n      <button class="tab" role="tab">评价</button>\n      <span class="tab-ink"></span>\n    </div>\n    <div class="tab-panel is-active">概览内容：这是第一个面板。</div>\n    <div class="tab-panel">参数内容：接口与配置项。</div>\n    <div class="tab-panel">评价内容：来自社区的声音。</div>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.tabs { width: min(420px, 88vw); }\n.tab-list {\n  position: relative;\n  display: flex;\n  border-bottom: 1px solid #26313a;\n}\n.tab {\n  padding: 11px 18px;\n  border: none;\n  background: transparent;\n  color: #8fa3b0;\n  font-size: 14px;\n  cursor: pointer;\n  transition: color 0.2s ease;\n}\n.tab:hover { color: #c6d4dd; }\n.tab.is-active { color: #35c4dc; }\n/* 指示条：left/width 由 JS 按当前标签位置写入 */\n.tab-ink {\n  position: absolute;\n  bottom: -1px;\n  height: 2px;\n  background: #35c4dc;\n  transition:\n    left 0.3s cubic-bezier(0.4, 0, 0.2, 1),\n    width 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n}\n.tab-panel {\n  display: none;\n  padding: 20px 4px;\n  color: #aebdc7;\n  font-size: 14px;\n  line-height: 1.8;\n}\n.tab-panel.is-active {\n  display: block;\n  animation: panel-in 0.3s ease;\n}\n@keyframes panel-in {\n  from { opacity: 0; transform: translateY(6px); }\n  to { opacity: 1; transform: translateY(0); }\n}',
    js:
      "const tabs = Array.from(document.querySelectorAll('.tab'));\nconst panels = Array.from(document.querySelectorAll('.tab-panel'));\nconst ink = document.querySelector('.tab-ink');\nfunction activate(index) {\n  tabs.forEach((t, i) => t.classList.toggle('is-active', i === index));\n  panels.forEach((p, i) => p.classList.toggle('is-active', i === index));\n  // 指示条对齐当前标签的几何位置\n  const rect = tabs[index].getBoundingClientRect();\n  const parentRect = tabs[index].parentElement.getBoundingClientRect();\n  ink.style.left = rect.left - parentRect.left + 'px';\n  ink.style.width = rect.width + 'px';\n}\ntabs.forEach((tab, i) => tab.addEventListener('click', () => activate(i)));\nactivate(0);",
  },
  {
    id: 'widget-accordion',
    name: '手风琴',
    groupId: 'widgets',
    desc: 'grid-rows 0fr 到 1fr 的过渡实现高度自适应展开',
    html: '<div class="stage">\n  <div class="acc">\n    <div class="acc-item">\n      <button class="acc-head">什么是重排与重绘？<span class="acc-arrow"></span></button>\n      <div class="acc-body"><div class="acc-content">重排会重新计算几何布局，重绘只更新像素。transform 与 opacity 动画只走合成层，因此性能最好。</div></div>\n    </div>\n    <div class="acc-item">\n      <button class="acc-head">为什么推荐 will-change？<span class="acc-arrow"></span></button>\n      <div class="acc-body"><div class="acc-content">will-change 提前告知浏览器某属性即将变化，促使其做好分层准备；但不要滥用，图层过多反而增加显存压力。</div></div>\n    </div>\n    <div class="acc-item">\n      <button class="acc-head">requestAnimationFrame 的作用？<span class="acc-arrow"></span></button>\n      <div class="acc-body"><div class="acc-content">它把回调安排到下一次渲染帧之前执行，与浏览器刷新节奏同步，是 JS 驱动动画的标准方式。</div></div>\n    </div>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.acc { width: min(440px, 88vw); display: grid; gap: 10px; }\n.acc-item {\n  border: 1px solid #26313a;\n  border-radius: 4px;\n  background: #141b21;\n  overflow: hidden;\n  transition: border-color 0.25s ease;\n}\n.acc-item.is-open { border-color: rgba(53, 196, 220, 0.5); }\n.acc-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  width: 100%;\n  padding: 14px 16px;\n  border: none;\n  background: transparent;\n  color: #dfe9ee;\n  font-size: 14px;\n  text-align: left;\n  cursor: pointer;\n}\n/* 箭头用两条边框拼出，展开时旋转 90 度 */\n.acc-arrow {\n  width: 7px;\n  height: 7px;\n  border-right: 2px solid #8fa3b0;\n  border-bottom: 2px solid #8fa3b0;\n  transform: rotate(45deg);\n  transition: transform 0.3s ease;\n  flex-shrink: 0;\n}\n.acc-item.is-open .acc-arrow { transform: rotate(225deg); }\n/* 核心：grid-template-rows 从 0fr 过渡到 1fr，高度自适应内容 */\n.acc-body {\n  display: grid;\n  grid-template-rows: 0fr;\n  transition: grid-template-rows 0.35s ease;\n}\n.acc-item.is-open .acc-body { grid-template-rows: 1fr; }\n.acc-content {\n  overflow: hidden;\n  padding: 0 16px;\n  color: #9db2bd;\n  font-size: 13px;\n  line-height: 1.8;\n}\n.acc-item.is-open .acc-content { padding-bottom: 14px; }',
    js:
      "document.querySelectorAll('.acc-head').forEach((head) => {\n  head.addEventListener('click', () => {\n    head.parentElement.classList.toggle('is-open');\n  });\n});",
  },
  {
    id: 'widget-toast',
    name: 'Toast 通知',
    groupId: 'widgets',
    desc: '右下角滑入的通知卡，自动退场并支持手动关闭',
    html: '<div class="stage">\n  <button class="toast-btn" id="fire">触发一条通知</button>\n  <div class="toast-zone" id="zone"></div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.toast-btn {\n  padding: 12px 30px;\n  border: 1px solid #35c4dc;\n  border-radius: 4px;\n  background: transparent;\n  color: #7ef0ff;\n  font-size: 14px;\n  cursor: pointer;\n}\n.toast-btn:hover { background: rgba(53, 196, 220, 0.1); }\n/* 通知容器固定在视口右下角 */\n.toast-zone {\n  position: fixed;\n  right: 18px;\n  bottom: 18px;\n  display: grid;\n  gap: 10px;\n  z-index: 10;\n}\n.toast {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  min-width: 240px;\n  padding: 12px 14px;\n  border: 1px solid #26313a;\n  border-left: 3px solid #35c4dc;\n  border-radius: 4px;\n  background: #16202a;\n  color: #dfe9ee;\n  font-size: 13px;\n  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);\n  animation: toast-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);\n}\n.toast.is-leaving {\n  animation: toast-out 0.3s ease forwards;\n}\n.toast-msg { flex: 1; }\n.toast-close {\n  border: none;\n  background: transparent;\n  color: #8fa3b0;\n  font-size: 15px;\n  cursor: pointer;\n}\n@keyframes toast-in {\n  from { opacity: 0; transform: translateX(30px); }\n  to { opacity: 1; transform: translateX(0); }\n}\n@keyframes toast-out {\n  to { opacity: 0; transform: translateX(30px); }\n}',
    js:
      "const zone = document.getElementById('zone');\nlet seq = 0;\nfunction showToast(text) {\n  const el = document.createElement('div');\n  el.className = 'toast';\n  el.innerHTML = '<span class=\"toast-msg\"></span><button class=\"toast-close\" aria-label=\"关闭\">x</button>';\n  el.querySelector('.toast-msg').textContent = text;\n  zone.appendChild(el);\n  const close = () => {\n    if (!el.isConnected) return;\n    el.classList.add('is-leaving');\n    el.addEventListener('animationend', () => el.remove(), { once: true });\n  };\n  el.querySelector('.toast-close').addEventListener('click', close);\n  setTimeout(close, 3200);\n}\ndocument.getElementById('fire').addEventListener('click', () => {\n  seq += 1;\n  showToast('任务 ' + seq + ' 已在后台完成');\n});",
  },
  {
    id: 'widget-counter',
    name: '数字滚动',
    groupId: 'widgets',
    desc: 'requestAnimationFrame 缓动计数，进入视口才触发',
    html: '<div class="stage">\n  <div class="stat">\n    <span class="stat-num" data-target="12890">0</span>\n    <span class="stat-label">累计学习者</span>\n  </div>\n  <div class="stat">\n    <span class="stat-num" data-target="326">0</span>\n    <span class="stat-label">在线教程</span>\n  </div>\n  <div class="stat">\n    <span class="stat-num" data-target="98" data-suffix="%">0</span>\n    <span class="stat-label">好评率</span>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #101418;\n  font-family: sans-serif;\n}\n.stage {\n  display: flex;\n  gap: 46px;\n}\n.stat {\n  display: grid;\n  gap: 8px;\n  text-align: center;\n}\n.stat-num {\n  font-family: monospace;\n  font-size: 34px;\n  font-weight: 700;\n  color: #7ef0ff;\n  font-variant-numeric: tabular-nums;\n}\n.stat-label {\n  color: #8fa3b0;\n  font-size: 12px;\n  letter-spacing: 0.2em;\n}',
    js:
      "const easeOut = (t) => 1 - Math.pow(1 - t, 3);\nfunction countUp(el) {\n  const target = Number(el.dataset.target);\n  const suffix = el.dataset.suffix || '';\n  const duration = 1600;\n  let start = null;\n  function frame(now) {\n    if (start === null) start = now;\n    const progress = Math.min((now - start) / duration, 1);\n    const value = Math.round(easeOut(progress) * target);\n    el.textContent = value.toLocaleString() + suffix;\n    if (progress < 1) requestAnimationFrame(frame);\n  }\n  requestAnimationFrame(frame);\n}\n// 进入视口才开始计数，避免用户还没看到就播完\nconst observer = new IntersectionObserver(\n  (entries) => {\n    entries.forEach((entry) => {\n      if (!entry.isIntersecting) return;\n      countUp(entry.target);\n      observer.unobserve(entry.target);\n    });\n  },\n  { threshold: 0.6 },\n);\ndocument.querySelectorAll('.stat-num').forEach((el) => observer.observe(el));",
  },

  /* ============================================================
     FANDEX 风格：复刻本站真实设计语法（深底 #0A0E14 / 强调青
     #00C8F0 / 浅色模式强调 #0B6E7E / 分类色 / 直角 4px / 竖条
     刻度线），源码为独立实现，色值取自站点设计令牌
     ============================================================ */
  {
    id: 'fdx-module-card',
    name: '模块入口卡片',
    groupId: 'fandex',
    desc: '顶部分类色装饰线 hover 从左展开，边框转色 + 上浮反馈',
    html: '<div class="stage">\n  <a class="mcard" href="javascript:void(0)" style="--mc:#d63031">\n    <div class="mcard-head">\n      <span class="mcard-icon">Js</span>\n      <h3 class="mcard-title">JavaScript</h3>\n    </div>\n    <p class="mcard-desc">语言核心、异步编程与浏览器对象模型。</p>\n  </a>\n  <a class="mcard" href="javascript:void(0)" style="--mc:#00b894">\n    <div class="mcard-head">\n      <span class="mcard-icon">Pg</span>\n      <h3 class="mcard-title">PostgreSQL</h3>\n    </div>\n    <p class="mcard-desc">关系建模、索引原理与查询优化实战。</p>\n  </a>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  gap: 14px;\n  align-content: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n  padding: 20px;\n}\n/* 复刻 FANDEX module-card：--mc 为模块分类色 */\n.mcard {\n  position: relative;\n  display: block;\n  width: 264px;\n  padding: 12px 16px;\n  text-decoration: none;\n  background: #11161e;\n  border: 1px solid #2a3547;\n  border-radius: 4px;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);\n  overflow: hidden;\n  transition:\n    transform 0.12s ease-out,\n    border-color 0.12s ease-out,\n    box-shadow 0.12s ease-out;\n}\n/* 顶部 2px 分类色装饰线：hover 从左展开 */\n.mcard::before {\n  content: "";\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 2px;\n  background: var(--mc);\n  transform: scaleX(0);\n  transform-origin: left center;\n  transition: transform 0.3s ease-out;\n}\n.mcard:hover {\n  border-color: var(--mc);\n  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);\n}\n.mcard:hover::before {\n  transform: scaleX(1);\n}\n.mcard:active {\n  transform: translateY(1px);\n}\n.mcard-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n/* 图标方块：等宽双字母 + 分类色细边框（几何科技风） */\n.mcard-icon {\n  display: grid;\n  place-items: center;\n  width: 28px;\n  height: 28px;\n  border: 1px solid var(--mc);\n  border-radius: 4px;\n  color: var(--mc);\n  font-family: monospace;\n  font-size: 12px;\n  font-weight: 700;\n  letter-spacing: 0.04em;\n}\n.mcard-title {\n  margin: 0;\n  font-size: 15px;\n  font-weight: 600;\n  color: #e8eef2;\n}\n.mcard:hover .mcard-title {\n  color: var(--mc);\n}\n.mcard-desc {\n  margin: 6px 0 0;\n  font-size: 12px;\n  line-height: 1.6;\n  color: #6e7e8b;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}',
    js: "// 复刻 FANDEX 首页 module-card：分类色经 CSS 变量 --mc 注入，\n// 顶线、边框、图标、标题四处同步消费同一颜色\nconsole.log('悬停卡片观察顶线展开与边框转色');",
  },
  {
    id: 'fdx-hero-title',
    name: '渐变残影标题',
    groupId: 'fandex',
    desc: '渐变填充 + 描边残影视差，FANDEX 首页标题同款',
    html: '<div class="stage">\n  <h1 class="ghost-title" data-text="FANDEX">FANDEX</h1>\n  <p class="hint">悬停标题：残影加速偏移，渐变加速流动</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n/* 复刻 FANDEX 首页 hero-title：\n   1) 渐变 background-clip: text 填充 + 300% 尺寸呼吸滚动\n   2) ::after 通过 attr(data-text) 复制文字，描边成轮廓残影\n   3) 残影常驻微浮动，hover 时反向加速偏移形成视差 */\n.ghost-title {\n  position: relative;\n  margin: 0;\n  font-size: clamp(44px, 10vw, 76px);\n  font-weight: 800;\n  letter-spacing: 0.15em;\n  line-height: 1.1;\n  white-space: nowrap;\n  cursor: default;\n  background: linear-gradient(\n    135deg,\n    #e8eef2 0%,\n    #00c8f0 40%,\n    #9fadb9 60%,\n    #e8eef2 100%\n  );\n  background-size: 300% 300%;\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n  animation: bg-pan 12s linear infinite alternate;\n  transition: transform 0.4s ease, letter-spacing 0.4s ease;\n}\n.ghost-title:hover {\n  animation-duration: 4s;\n  transform: scale(1.02);\n  letter-spacing: 0.16em;\n}\n.ghost-title::after {\n  content: attr(data-text);\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  text-align: center;\n  white-space: nowrap;\n  color: transparent;\n  -webkit-text-stroke: 1px rgba(0, 200, 240, 0.4);\n  z-index: -1;\n  opacity: 0.5;\n  transform: translate(-3px, -3px);\n  animation: ghost-idle 4s ease-in-out infinite alternate;\n  transition:\n    transform 0.6s cubic-bezier(0.2, 1, 0.3, 1),\n    opacity 0.4s ease;\n  pointer-events: none;\n}\n.ghost-title:hover::after {\n  animation: none;\n  transform: translate(-10px, -10px) scale(1.03);\n  opacity: 0.9;\n  -webkit-text-stroke: 1.5px rgba(0, 200, 240, 0.7);\n}\n@keyframes bg-pan {\n  0% { background-position: 0% 0%; }\n  100% { background-position: 100% 100%; }\n}\n@keyframes ghost-idle {\n  0% { transform: translate(-2px, -2px); }\n  100% { transform: translate(-4px, -4px); }\n}\n.hint {\n  margin-top: 18px;\n  color: #4e5e6b;\n  font-size: 12px;\n  font-family: monospace;\n  letter-spacing: 0.1em;\n}',
    js: "// 残影的关键：::after content: attr(data-text) 无需 JS 复制文本，\n// 透明填充 + text-stroke 形成轮廓，z-index 压到本体之下\nconsole.log('FANDEX 首页标题的同款实现');",
  },
  {
    id: 'fdx-badge',
    name: '语义徽章',
    groupId: 'fandex',
    desc: '五色 soft/outline 双形态，竖条指示替代圆点',
    html: '<div class="stage">\n  <div class="badge-row">\n    <span class="badge badge--primary"><i class="bar"></i>核心</span>\n    <span class="badge badge--success"><i class="bar"></i>稳定</span>\n    <span class="badge badge--warning"><i class="bar"></i>演进中</span>\n    <span class="badge badge--danger"><i class="bar"></i>已废弃</span>\n  </div>\n  <div class="badge-row">\n    <span class="badge badge--outline badge--primary">前端技术</span>\n    <span class="badge badge--outline badge--info">后端技术</span>\n    <span class="badge badge--soft badge--primary">beginner</span>\n    <span class="badge badge--soft badge--warning">advanced</span>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  gap: 12px;\n  align-content: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.badge-row {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  justify-content: center;\n  padding: 0 16px;\n}\n/* 复刻 FANDEX fndx-badge：小字号 + 加粗 + 直角小圆角 */\n.badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 2px 8px;\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  line-height: 1.5;\n  border: 1px solid transparent;\n  border-radius: 3px;\n  white-space: nowrap;\n}\n/* 竖条指示：项目规范禁用圆点，统一 2px 竖条刻度 */\n.badge .bar {\n  width: 2px;\n  height: 10px;\n  border-radius: 1px;\n  background: currentColor;\n}\n/* soft 形态：低饱和底 + 满色文字 */\n.badge--primary { background: rgba(0, 200, 240, 0.14); color: #00c8f0; }\n.badge--success { background: rgba(34, 197, 94, 0.14); color: #22c55e; }\n.badge--warning { background: rgba(249, 115, 22, 0.14); color: #f97316; }\n.badge--danger  { background: rgba(220, 38, 38, 0.16); color: #ef4444; }\n/* outline 形态：透明底 + 语义色描边 */\n.badge--outline { background: transparent; }\n.badge--outline.badge--primary { border-color: rgba(0, 200, 240, 0.5); }\n.badge--outline.badge--info { border-color: rgba(79, 91, 213, 0.6); color: #8b94e8; }\n.badge--outline.badge--primary { color: #00c8f0; }\n/* 实心形态（soft 类名沿用站点命名习惯，此处为描边弱底） */\n.badge--soft { background: #11161e; border-color: #2a3547; }\n.badge--soft.badge--primary { color: #7ee9ff; }\n.badge--soft.badge--warning { color: #fdba74; }',
    js: "// 徽章色彩与站点语义色一一对应：成功绿/警告橙/危险红/品牌青\nconsole.log('soft = 低饱和底，outline = 描边，竖条 = 状态指示');",
  },
  {
    id: 'fdx-geo-decor',
    name: '几何背景装饰',
    groupId: 'fandex',
    desc: '网格底纹 + 竖条刻度 + 涟漪环，构成主义克制装饰',
    html: '<div class="scene">\n  <div class="geo-grid"></div>\n  <div class="geo-bars">\n    <span></span><span></span><span></span><span></span><span></span>\n  </div>\n  <div class="geo-ripple"></div>\n  <div class="geo-triangle"></div>\n  <div class="geo-caption">GEOMETRIC DECOR</div>\n</div>',
    css:
      'body { margin: 0; font-family: sans-serif; }\n.scene {\n  position: relative;\n  min-height: 100vh;\n  overflow: hidden;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n}\n/* 网格底纹：两层 1px 渐变线，低透明度不抢主体 */\n.geo-grid {\n  position: absolute;\n  inset: 0;\n  background-image:\n    linear-gradient(rgba(0, 200, 240, 0.05) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(0, 200, 240, 0.05) 1px, transparent 1px);\n  background-size: 48px 48px;\n}\n/* 竖条刻度组：五根 2px 竖条错峰呼吸（替代点阵装饰） */\n.geo-bars {\n  position: absolute;\n  top: 18%;\n  left: 12%;\n  display: flex;\n  gap: 6px;\n  align-items: flex-end;\n  height: 40px;\n}\n.geo-bars span {\n  width: 2px;\n  background: rgba(0, 200, 240, 0.55);\n  animation: bar-breathe 2.8s ease-in-out infinite;\n}\n.geo-bars span:nth-child(1) { height: 40%; animation-delay: 0s; }\n.geo-bars span:nth-child(2) { height: 100%; animation-delay: 0.35s; }\n.geo-bars span:nth-child(3) { height: 70%; animation-delay: 0.7s; }\n.geo-bars span:nth-child(4) { height: 90%; animation-delay: 1.05s; }\n.geo-bars span:nth-child(5) { height: 55%; animation-delay: 1.4s; }\n@keyframes bar-breathe {\n  0%, 100% { transform: scaleY(0.5); opacity: 0.4; }\n  50% { transform: scaleY(1); opacity: 1; }\n}\n/* 涟漪环：双环扩散，模拟雷达扫描的克制版本 */\n.geo-ripple {\n  position: absolute;\n  right: 14%;\n  bottom: 16%;\n  width: 120px;\n  height: 120px;\n  border-radius: 50%;\n  border: 1px solid rgba(0, 200, 240, 0.35);\n}\n.geo-ripple::before,\n.geo-ripple::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  border-radius: 50%;\n  border: 1px solid rgba(0, 200, 240, 0.35);\n  animation: ripple-out 3.2s ease-out infinite;\n}\n.geo-ripple::after { animation-delay: 1.6s; }\n@keyframes ripple-out {\n  from { transform: scale(0.4); opacity: 0.8; }\n  to { transform: scale(1.5); opacity: 0; }\n}\n/* 三角切片：细描边几何切片，缓慢旋转 */\n.geo-triangle {\n  position: absolute;\n  top: 22%;\n  right: 20%;\n  width: 0;\n  height: 0;\n  border-left: 26px solid transparent;\n  border-right: 26px solid transparent;\n  border-bottom: 44px solid rgba(0, 200, 240, 0.16);\n  animation: tri-spin 14s linear infinite;\n}\n@keyframes tri-spin {\n  to { transform: rotate(360deg); }\n}\n.geo-caption {\n  position: relative;\n  color: #4e5e6b;\n  font-family: monospace;\n  font-size: 13px;\n  letter-spacing: 0.5em;\n}',
    js: "// FANDEX 页面装饰三原则：网格打底、竖条代替点、几何切片点缀\n// 全部低透明度，永远不与内容抢视觉\nconsole.log('GeoBgDecor 的 minimal 变体复刻');",
  },
  {
    id: 'fdx-stat-row',
    name: '统计刻度行',
    groupId: 'fandex',
    desc: '等宽数字 + 竖条分隔 + 克制标签，首页数据栏同款',
    html: '<div class="stage">\n  <div class="stat-row">\n    <div class="stat">\n      <span class="stat-num">1 797</span>\n      <span class="stat-label">篇教程</span>\n    </div>\n    <i class="stat-divider"></i>\n    <div class="stat">\n      <span class="stat-num">35</span>\n      <span class="stat-label">个模块</span>\n    </div>\n    <i class="stat-divider"></i>\n    <div class="stat">\n      <span class="stat-num">3 端</span>\n      <span class="stat-label">全平台</span>\n    </div>\n  </div>\n  <p class="hint">数字使用 tabular-nums 等宽排版</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n/* 复刻 FANDEX 首页 hero-stats：数字突出、标签克制 */\n.stat-row {\n  display: flex;\n  align-items: center;\n  gap: 28px;\n}\n.stat {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 6px;\n}\n.stat-num {\n  font-family: monospace;\n  font-size: 30px;\n  font-weight: 700;\n  color: #e8eef2;\n  /* 等宽数字：位数变化时宽度稳定不跳动 */\n  font-variant-numeric: tabular-nums;\n  letter-spacing: 0.04em;\n  transition: color 0.2s ease;\n}\n.stat:hover .stat-num {\n  color: #00c8f0;\n}\n.stat-label {\n  font-size: 12px;\n  letter-spacing: 0.2em;\n  color: #4e5e6b;\n}\n/* 竖条分隔线：替代常见的圆点分隔 */\n.stat-divider {\n  width: 2px;\n  height: 26px;\n  border-radius: 1px;\n  background: #2a3547;\n}\n.hint {\n  margin-top: 22px;\n  color: #4e5e6b;\n  font-size: 11px;\n  font-family: monospace;\n  letter-spacing: 0.1em;\n}',
    js: "// tabular-nums 是数据栏排版的细节关键：数字滚动时列宽不抖动\nconsole.log('悬停数字变品牌青色');",
  },
  {
    id: 'fdx-button',
    name: '按钮体系',
    groupId: 'fandex',
    desc: 'primary/ghost/danger 三变体，直角 + 边框转色 + 焦点环',
    html: '<div class="stage">\n  <div class="btn-row">\n    <button class="fbtn fbtn--primary">开始学习</button>\n    <button class="fbtn fbtn--ghost">查看文档</button>\n    <button class="fbtn fbtn--danger">删除数据</button>\n  </div>\n  <p class="hint">用 Tab 键查看 focus-visible 焦点环</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.btn-row {\n  display: flex;\n  gap: 12px;\n  flex-wrap: wrap;\n  justify-content: center;\n  padding: 0 16px;\n}\n/* 复刻 FANDEX fndx-button：透明底 + 细边框 + 直角小圆角 */\n.fbtn {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  height: 36px;\n  padding: 0 20px;\n  border: 1px solid transparent;\n  border-radius: 4px;\n  font-size: 13px;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  cursor: pointer;\n  transition:\n    color 0.12s ease-out,\n    background-color 0.12s ease-out,\n    border-color 0.12s ease-out;\n}\n.fbtn:active {\n  transform: translateY(1px);\n}\n/* 主按钮：品牌青实心，hover 提亮一档 */\n.fbtn--primary {\n  background: #00c8f0;\n  border-color: #00c8f0;\n  color: #04252c;\n}\n.fbtn--primary:hover {\n  background: #3dddff;\n  border-color: #3dddff;\n}\n/* 幽灵按钮：透明底细边框，hover 边框转强调色 */\n.fbtn--ghost {\n  background: transparent;\n  border-color: #2a3547;\n  color: #9fadb9;\n}\n.fbtn--ghost:hover {\n  color: #00c8f0;\n  border-color: rgba(0, 200, 240, 0.5);\n  background: rgba(0, 200, 240, 0.08);\n}\n/* 危险按钮：语义红描边，hover 弱底 */\n.fbtn--danger {\n  background: transparent;\n  border-color: rgba(239, 68, 68, 0.5);\n  color: #ef4444;\n}\n.fbtn--danger:hover {\n  background: rgba(239, 68, 68, 0.1);\n  border-color: #ef4444;\n}\n/* 焦点环只在键盘导航时出现，鼠标点击不显示 */\n.fbtn:focus-visible {\n  outline: 2px solid #00c8f0;\n  outline-offset: 2px;\n}',
    js: "// :focus-visible 与 :focus 的区别：只有键盘焦点才显示描边\nconsole.log('直角 + 细边框 + 边框转色 = FANDEX 按钮三要素');",
  },
];

/**
 * 按分组归类成品（画廊渲染辅助）
 * @returns Map：分组 ID -> 该组成品列表
 */
export function groupShowcaseItems(): Map<string, ShowcaseItem[]> {
  const map = new Map<string, ShowcaseItem[]>();
  for (const group of SHOWCASE_GROUPS) {
    map.set(group.id, []);
  }
  for (const item of SHOWCASE_ITEMS) {
    map.get(item.groupId)?.push(item);
  }
  return map;
}
