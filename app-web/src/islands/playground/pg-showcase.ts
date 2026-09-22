
export interface ShowcaseGroup {
  id: string;
  name: string;
  desc: string;
}

export interface ShowcaseItem {
  id: string;
  name: string;
  groupId: string;
  desc: string;
  html: string;
  css: string;
  js: string;
}

export const SHOWCASE_GROUPS: readonly ShowcaseGroup[] = [
  { id: 'loaders', name: '加载动画', desc: '等待也要有质感' },
  { id: 'buttons', name: '按钮交互', desc: '点击与悬停微反馈' },
  { id: 'cards', name: '卡片效果', desc: '悬浮与空间层次' },
  { id: 'texts', name: '文本动效', desc: '让标题开口说话' },
  { id: 'backgrounds', name: '背景氛围', desc: '页面情绪的底色' },
  { id: 'widgets', name: '实用组件', desc: '拿来即用的小部件' },
  { id: 'fandex', name: 'FANDEX 风格', desc: '本站同源的设计语言' },
];

/*
 * 全部示例统一使用 FANDEX 歌姬青绿色系：
 * 品牌主色 #39C5BB / 亮青 #4FFFF2 / 深青 #14716A，
 * 点缀色：洛天依蓝 #66CCFF、镜音铃橙 #FF8800、乐正绫红 #EE0000（克制使用）。
 */
export const SHOWCASE_ITEMS: readonly ShowcaseItem[] = [
  {
    id: 'loader-dual-ring',
    name: '双环旋转',
    groupId: 'loaders',
    desc: 'border 透明描边 + 反向旋转，最经典的全屏等待指示',
    html: '<div class="stage">\n  <div class="spinner">\n    <span class="ring ring-outer"></span>\n    <span class="ring ring-inner"></span>\n  </div>\n  <p class="hint">加载中，请稍候</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.spinner {\n  position: relative;\n  width: 72px;\n  height: 72px;\n  margin: 0 auto 18px;\n}\n.ring {\n  position: absolute;\n  border-radius: 50%;\n  border: 4px solid transparent;\n}\n.ring-outer {\n  inset: 0;\n  border-top-color: #39c5bb;\n  border-right-color: rgba(57, 197, 187, 0.35);\n  animation: spin 1.1s linear infinite;\n}\n.ring-inner {\n  inset: 14px;\n  border-bottom-color: #66ccff;\n  border-left-color: rgba(102, 204, 255, 0.35);\n  animation: spin 0.9s linear infinite reverse;\n}\n@keyframes spin {\n  to { transform: rotate(360deg); }\n}\n.hint {\n  color: #8fa3b0;\n  font-size: 13px;\n  letter-spacing: 0.2em;\n}',
    js: "// 纯 CSS 实现：外环顺时针、内环逆时针，双层速度差制造机械感\nconsole.log('双环旋转：无 JavaScript 参与');",
  },
  {
    id: 'loader-bars',
    name: '条形频谱',
    groupId: 'loaders',
    desc: '多根竖条错峰伸缩，类似音频均衡器的节奏感',
    html: '<div class="stage">\n  <div class="bars">\n    <span></span>\n    <span></span>\n    <span></span>\n    <span></span>\n    <span></span>\n  </div>\n  <p class="hint">SIGNAL SYNC</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.bars {\n  display: flex;\n  gap: 7px;\n  align-items: center;\n  height: 56px;\n  margin-bottom: 18px;\n}\n.bars span {\n  width: 6px;\n  height: 100%;\n  border-radius: 2px;\n  background: linear-gradient(180deg, #39c5bb, #14716a);\n  /* scale 只触发合成，不引起重排 */\n  animation: bounce 1s ease-in-out infinite;\n}\n.bars span:nth-child(1) { animation-delay: -0.9s; }\n.bars span:nth-child(2) { animation-delay: -0.7s; }\n.bars span:nth-child(3) { animation-delay: -0.5s; }\n.bars span:nth-child(4) { animation-delay: -0.3s; }\n.bars span:nth-child(5) { animation-delay: -0.1s; }\n@keyframes bounce {\n  0%, 100% { transform: scaleY(0.25); }\n  50% { transform: scaleY(1); }\n}\n.hint {\n  color: #8fa3b0;\n  font-family: monospace;\n  font-size: 12px;\n  letter-spacing: 0.3em;\n}',
    js: "// 负的 animation-delay 让动画从中间开始，避免首帧所有竖条同时静止\nconsole.log('条形频谱：错峰负延迟');",
  },
  {
    id: 'loader-orbit',
    name: '轨道方块',
    groupId: 'loaders',
    desc: '双层轨道反向旋转，方块沿轨道环绕并留下渐隐尾迹',
    html: '<div class="stage">\n  <div class="orbit">\n    <span class="track"></span>\n    <span class="cube cube-a"></span>\n    <span class="cube cube-b"></span>\n  </div>\n  <p class="hint">ORBITAL LOADER</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.orbit {\n  position: relative;\n  width: 84px;\n  height: 84px;\n  margin: 0 auto 18px;\n}\n.track {\n  position: absolute;\n  inset: 0;\n  border: 1px dashed rgba(143, 163, 176, 0.4);\n  border-radius: 50%;\n}\n.cube {\n  position: absolute;\n  top: -5px;\n  left: calc(50% - 5px);\n  width: 10px;\n  height: 10px;\n  box-shadow: 0 24px 0 -2px rgba(57, 197, 187, 0.55),\n    0 -24px 0 -4px rgba(57, 197, 187, 0.25);\n  animation: orbit-spin 1.6s cubic-bezier(0.6, 0.1, 0.4, 0.9) infinite;\n}\n.cube-a { background: #39c5bb; }\n.cube-b {\n  background: #ff8800;\n  box-shadow: 0 -18px 0 -2px rgba(255, 136, 0, 0.55);\n  animation: orbit-inner 1.1s linear infinite reverse;\n}\n@keyframes orbit-spin {\n  to { transform: rotate(360deg); }\n}\n@keyframes orbit-inner {\n  to { transform: rotate(-360deg); }\n}\n@keyframes orbit-tilt {\n  to { transform: rotate(-360deg); }\n}\n.orbit { animation: orbit-tilt 12s linear infinite; }\n.hint {\n  color: #8fa3b0;\n  font-family: monospace;\n  font-size: 12px;\n  letter-spacing: 0.3em;\n}',
    js: "// 旋转发生在容器坐标轴上：方块本身不动，轨道转动即环绕\nconsole.log('轨道方块：容器旋转代替路径动画');",
  },
  {
    id: 'loader-conic',
    name: '锥形流光',
    groupId: 'loaders',
    desc: 'conic-gradient 首尾亮度差旋转出流光感，mask 挖空成环',
    html: '<div class="stage">\n  <div class="halo"></div>\n  <p class="hint">CONIC HALO</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.halo {\n  width: 84px;\n  height: 84px;\n  border-radius: 50%;\n  background: conic-gradient(\n    from 0deg,\n    transparent 0deg,\n    #39c5bb 120deg,\n    #4ffff2 300deg,\n    transparent 360deg\n  );\n  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px));\n  mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px));\n  animation: spin 1.2s linear infinite;\n  margin: 0 auto 18px;\n}\n@keyframes spin {\n  to { transform: rotate(360deg); }\n}\n.hint {\n  color: #8fa3b0;\n  font-family: monospace;\n  font-size: 12px;\n  letter-spacing: 0.3em;\n}',
    js: "// conic-gradient 首尾透明，旋转时亮区扫过即流光；mask 挖空中心成环\nconsole.log('锥形流光：conic + mask 组合');",
  },
  {
    id: 'btn-shine',
    name: '流光扫过',
    groupId: 'buttons',
    desc: '悬停时高光条从左侧扫到右侧，赛博灯牌质感',
    html: '<div class="stage">\n  <button class="shine-btn">HOVER ME</button>\n  <p class="hint">SHINE SWEEP</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.shine-btn {\n  position: relative;\n  overflow: hidden;\n  padding: 12px 34px;\n  border: 1px solid #39c5bb;\n  border-radius: 4px;\n  background: #0e1a18;\n  color: #4ffff2;\n  font-size: 15px;\n  letter-spacing: 0.1em;\n  cursor: pointer;\n  transition: box-shadow 0.3s ease, transform 0.15s ease;\n}\n.shine-btn:hover {\n  box-shadow: 0 0 18px rgba(57, 197, 187, 0.4);\n}\n.shine-btn:active {\n  transform: translateY(1px);\n}\n.shine-btn::after {\n  content: "";\n  position: absolute;\n  top: -40%;\n  left: -80%;\n  width: 40%;\n  height: 180%;\n  background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.28), transparent);\n  transform: skewX(-20deg);\n  transition: left 0.55s ease;\n}\n.shine-btn:hover::after {\n  left: 140%;\n}\n.hint {\n  margin-top: 16px;\n  color: #8fa3b0;\n  font-size: 12px;\n}',
    js: "// 高光条平时停在左外侧，hover 时用 left 过渡扫到右外侧\nconsole.log('流光扫过：overflow hidden + 位移高光');",
  },
  {
    id: 'btn-ripple',
    name: '波纹按钮',
    groupId: 'buttons',
    desc: 'Material 风格点击水波，波纹从按下坐标扩散',
    html: '<div class="stage">\n  <button class="ripple-btn">CLICK RIPPLE</button>\n  <p class="hint">material ripple</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.ripple-btn {\n  position: relative;\n  overflow: hidden;\n  padding: 13px 36px;\n  border: none;\n  border-radius: 4px;\n  background: #39c5bb;\n  color: #062a28;\n  font-size: 15px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.ripple-ink {\n  position: absolute;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.55);\n  transform: scale(0);\n  animation: ink 0.6s ease-out forwards;\n  pointer-events: none;\n}\n@keyframes ink {\n  to {\n    transform: scale(2.6);\n    opacity: 0;\n  }\n}\n.hint {\n  margin-top: 16px;\n  color: #8fa3b0;\n  font-size: 12px;\n}',
    js: "// 波纹圆的直径取按钮对角线，圆心落在真实点击坐标上\nconst btn = document.querySelector('.ripple-btn');\nbtn.addEventListener('click', (e) => {\n  const rect = btn.getBoundingClientRect();\n  const d = Math.max(rect.width, rect.height) * 2;\n  const ink = document.createElement('span');\n  ink.className = 'ripple-ink';\n  ink.style.width = ink.style.height = d + 'px';\n  ink.style.left = e.clientX - rect.left - d / 2 + 'px';\n  ink.style.top = e.clientY - rect.top - d / 2 + 'px';\n  btn.appendChild(ink);\n  ink.addEventListener('animationend', () => ink.remove());\n});",
  },
  {
    id: 'btn-flow',
    name: '流转边框',
    groupId: 'buttons',
    desc: 'conic 渐变边框持续旋转，三色流动描边',
    html: '<div class="stage">\n  <button class="flow-btn"><span>FLOWING BORDER</span></button>\n  <p class="hint">conic border</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.flow-btn {\n  position: relative;\n  padding: 3px;\n  border: none;\n  border-radius: 6px;\n  background: conic-gradient(#39c5bb, #ff8800, #66ccff, #39c5bb);\n  cursor: pointer;\n  animation: rotate 3s linear infinite;\n}\n.flow-btn span {\n  display: block;\n  padding: 11px 34px;\n  border-radius: 4px;\n  background: #0a0e14;\n  color: #dfe9ee;\n  font-size: 15px;\n  letter-spacing: 0.08em;\n}\n.flow-btn:hover span {\n  background: #0e1a18;\n}\n@keyframes rotate {\n  to { transform: rotate(1turn); }\n}\n.hint {\n  margin-top: 16px;\n  color: #8fa3b0;\n  font-size: 12px;\n  font-family: monospace;\n}',
    js: "// 外层旋转渐变、内层纯色遮盖，露出 3px 旋转边缘即流动描边\nconsole.log('流转边框：双层结构骗过 border 限制');",
  },
  {
    id: 'btn-flip',
    name: '翻转标签按钮',
    groupId: 'buttons',
    desc: '悬停时按钮文字整体上翻，切换到第二行文案',
    html: '<div class="stage">\n  <button class="flip-btn">\n    <span class="flip-window">\n      <span class="flip-row">\n        <span class="flip-a">下载应用</span>\n        <span class="flip-b">FREE DOWNLOAD</span>\n      </span>\n    </span>\n  </button>\n  <p class="hint">hover to flip</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.flip-btn {\n  padding: 0;\n  border: 1px solid #39c5bb;\n  border-radius: 4px;\n  background: #0e1a18;\n  cursor: pointer;\n}\n.flip-window {\n  display: block;\n  height: 44px;\n  overflow: hidden;\n}\n.flip-row {\n  display: flex;\n  flex-direction: column;\n  transition: transform 0.35s cubic-bezier(0.33, 1, 0.68, 1);\n}\n.flip-btn:hover .flip-row {\n  transform: translateY(-44px);\n}\n.flip-a,\n.flip-b {\n  display: grid;\n  place-items: center;\n  height: 44px;\n  padding: 0 30px;\n  font-size: 15px;\n  letter-spacing: 0.06em;\n  white-space: nowrap;\n}\n.flip-a { color: #4ffff2; }\n.flip-b { color: #ff8800; }\n.hint {\n  margin-top: 16px;\n  color: #8fa3b0;\n  font-size: 12px;\n}',
    js: "// 双行文字堆叠 + 裁切窗口，hover 平移一行高度即翻转\nconsole.log('翻转标签：overflow hidden + translateY');",
  },
  {
    id: 'card-tilt',
    name: '视差悬停卡',
    groupId: 'cards',
    desc: '鼠标位置驱动 3D 倾斜，高光层跟随光点',
    html: '<div class="scene">\n  <div class="tilt-card">\n    <h3>TILT CARD</h3>\n    <p>移动鼠标查看 3D 视差与高光</p>\n    <div class="glare"></div>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.scene { perspective: 900px; }\n.tilt-card {\n  position: relative;\n  width: 260px;\n  padding: 26px 22px;\n  border: 1px solid rgba(57, 197, 187, 0.25);\n  border-radius: 6px;\n  background: linear-gradient(160deg, #10201d, #0a1512);\n  color: #dfe9ee;\n  transform-style: preserve-3d;\n  transition: transform 0.12s ease-out;\n}\n.tilt-card h3 {\n  margin: 0 0 10px;\n  font-size: 18px;\n  letter-spacing: 0.1em;\n  color: #4ffff2;\n}\n.tilt-card p {\n  margin: 0;\n  font-size: 13px;\n  line-height: 1.7;\n  color: #9db2bd;\n}\n.glare {\n  position: absolute;\n  inset: 0;\n  border-radius: inherit;\n  background: radial-gradient(\n    circle at var(--gx, 50%) var(--gy, 50%),\n    rgba(255, 255, 255, 0.16),\n    transparent 55%\n  );\n  pointer-events: none;\n}',
    js: "// 鼠标位置写入 CSS 变量：倾斜量与高光点共用同一组坐标\nconst card = document.querySelector('.tilt-card');\nconst scene = document.querySelector('.scene');\nscene.addEventListener('mousemove', (e) => {\n  const r = card.getBoundingClientRect();\n  const px = (e.clientX - r.left) / r.width;\n  const py = (e.clientY - r.top) / r.height;\n  card.style.transform =\n    'rotateY(' + (px - 0.5) * 16 + 'deg) rotateX(' + (0.5 - py) * 16 + 'deg)';\n  card.style.setProperty('--gx', px * 100 + '%');\n  card.style.setProperty('--gy', py * 100 + '%');\n});\nscene.addEventListener('mouseleave', () => {\n  card.style.transform = 'rotateY(0) rotateX(0)';\n});",
  },
  {
    id: 'card-glass',
    name: '玻璃拟态卡',
    groupId: 'cards',
    desc: 'backdrop-filter 磨砂 + 双色光斑漂移背景',
    html: '<div class="scene">\n  <div class="blob blob-a"></div>\n  <div class="blob blob-b"></div>\n  <div class="glass-card">\n    <h3>GLASS</h3>\n    <p>backdrop-filter 磨砂玻璃，背后的光斑被柔化透出</p>\n    <button>了解更多</button>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  overflow: hidden;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.scene {\n  position: relative;\n  display: grid;\n  place-items: center;\n  width: 100%;\n  height: 100vh;\n}\n.blob {\n  position: absolute;\n  width: 220px;\n  height: 220px;\n  border-radius: 50%;\n  filter: blur(10px);\n  opacity: 0.8;\n  animation: drift 9s ease-in-out infinite alternate;\n}\n.blob-a { background: #14716a; top: 18%; left: 22%; }\n.blob-b { background: #66ccff; bottom: 16%; right: 22%; animation-delay: -4s; }\n@keyframes drift {\n  to { transform: translate(36px, -30px) scale(1.12); }\n}\n.glass-card {\n  position: relative;\n  width: 280px;\n  padding: 26px 24px;\n  border: 1px solid rgba(255, 255, 255, 0.22);\n  border-radius: 8px;\n  background: rgba(255, 255, 255, 0.08);\n  backdrop-filter: blur(16px) saturate(1.3);\n  -webkit-backdrop-filter: blur(16px) saturate(1.3);\n  color: #f0f6f8;\n  text-align: center;\n  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);\n}\n.glass-card h3 { margin: 0 0 10px; font-size: 18px; }\n.glass-card p {\n  margin: 0 0 18px;\n  font-size: 13px;\n  line-height: 1.7;\n  color: rgba(240, 246, 248, 0.75);\n}\n.glass-card button {\n  padding: 9px 26px;\n  border: none;\n  border-radius: 4px;\n  background: #39c5bb;\n  color: #062a28;\n  font-weight: 600;\n  cursor: pointer;\n}',
    js: "// backdrop-filter 采样元素背后的像素，blur + saturate 产生磨砂\nconsole.log('玻璃拟态：背后必须有内容才有磨砂效果');",
  },
  {
    id: 'card-flip',
    name: '3D 翻转卡',
    groupId: 'cards',
    desc: 'backface-visibility 双面卡，悬停绕 Y 轴翻转',
    html: '<div class="stage">\n  <div class="flip-scene">\n    <div class="flip-card">\n      <div class="face face-front">\n        <h3>FRONT</h3>\n        <p>悬停翻转</p>\n      </div>\n      <div class="face face-back">\n        <h3>BACK</h3>\n        <p>#39C5BB</p>\n      </div>\n    </div>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.flip-scene { perspective: 1000px; }\n.flip-card {\n  position: relative;\n  width: 240px;\n  height: 150px;\n  transform-style: preserve-3d;\n  transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1);\n}\n.flip-scene:hover .flip-card {\n  transform: rotateY(180deg);\n}\n.face {\n  position: absolute;\n  inset: 0;\n  display: grid;\n  place-content: center;\n  gap: 8px;\n  text-align: center;\n  border-radius: 6px;\n  backface-visibility: hidden;\n  -webkit-backface-visibility: hidden;\n}\n.face h3 { margin: 0; font-size: 20px; letter-spacing: 0.12em; }\n.face p { margin: 0; font-size: 12px; font-family: monospace; }\n.face-front {\n  border: 1px solid rgba(57, 197, 187, 0.5);\n  background: #0e1a18;\n  color: #4ffff2;\n}\n.face-back {\n  transform: rotateY(180deg);\n  border: 1px solid rgba(255, 136, 0, 0.5);\n  background: #26200f;\n  color: #ffb85c;\n}',
    js: "// 背面预先 rotateY(180deg)，正反两面靠 backface-visibility 互斥显示\nconsole.log('3D 翻转：preserve-3d + backface-visibility');",
  },
  {
    id: 'card-spot',
    name: '鼠标追光卡',
    groupId: 'cards',
    desc: '径向渐变光斑跟随鼠标，边框感应式点亮',
    html: '<div class="stage">\n  <div class="spot-card">\n    <h3>SPOTLIGHT</h3>\n    <p>移动鼠标，光斑与描边一起跟随</p>\n  </div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.spot-card {\n  position: relative;\n  width: 230px;\n  padding: 2px;\n  border-radius: 8px;\n  background: radial-gradient(\n    340px circle at var(--mx, 50%) var(--my, 50%),\n    rgba(57, 197, 187, 0.85),\n    rgba(57, 197, 187, 0.08) 45%\n  );\n}\n.spot-card h3 {\n  margin: 0;\n  padding: 22px 20px 0;\n  font-size: 15px;\n  letter-spacing: 0.18em;\n  color: #4ffff2;\n  font-family: monospace;\n}\n.spot-card p {\n  margin: 0;\n  padding: 8px 20px 22px;\n  font-size: 13px;\n  color: #9db2bd;\n}\n.spot-card::before {\n  content: "";\n  display: block;\n  border-radius: 6px;\n  background: #12181f;\n  position: absolute;\n  inset: 2px;\n  z-index: -1;\n}',
    js: "// 卡片坐标写入 CSS 变量，渐变圆心即光斑位置\nconst card = document.querySelector('.spot-card');\ncard.addEventListener('mousemove', (e) => {\n  const r = card.getBoundingClientRect();\n  card.style.setProperty('--mx', e.clientX - r.left + 'px');\n  card.style.setProperty('--my', e.clientY - r.top + 'px');\n});",
  },
  {
    id: 'text-flow',
    name: '流动渐变字',
    groupId: 'texts',
    desc: '渐变背景裁剪进文字，位移实现无限流动',
    html: '<div class="stage">\n  <h1 class="flow-text">FANDEX</h1>\n  <p class="hint">循序渐进的自学之旅</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.flow-text {\n  margin: 0;\n  font-size: clamp(48px, 12vw, 96px);\n  font-weight: 800;\n  letter-spacing: 0.06em;\n  background: linear-gradient(90deg, #39c5bb, #4ffff2, #66ccff, #39c5bb);\n  background-size: 200% 100%;\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n  animation: flow 4s linear infinite;\n}\n@keyframes flow {\n  to { background-position: -200% 0; }\n}\n.hint {\n  color: #8fa3b0;\n  font-size: 12px;\n  font-family: monospace;\n  letter-spacing: 0.4em;\n}',
    js: "// background-clip: text 把渐变裁进字形，位移动画让颜色循环流动\nconsole.log('FANDEX 字标同款：渐变流动文字');",
  },
  {
    id: 'text-type',
    name: '打字机',
    groupId: 'texts',
    desc: '逐字输出 + 光标闪烁，终端质感',
    html: '<div class="stage">\n  <p class="type-line"><span id="text"></span><span class="caret"></span></p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: monospace;\n}\n.type-line {\n  margin: 0;\n  font-size: 22px;\n  color: #dfe9ee;\n  letter-spacing: 0.04em;\n}\n.caret {\n  display: inline-block;\n  width: 10px;\n  height: 1.1em;\n  margin-left: 3px;\n  vertical-align: text-bottom;\n  background: #39c5bb;\n  animation: blink 0.9s steps(1) infinite;\n}\n@keyframes blink {\n  50% { opacity: 0; }\n}',
    js: "// 定时追加字符，到底后停一拍再清空，循环播放\nconst target = 'fandex://init --learner guest';\nconst el = document.getElementById('text');\nlet i = 0;\n(function tick() {\n  el.textContent = target.slice(0, i++);\n  if (i <= target.length) {\n    setTimeout(tick, 90);\n  } else {\n    setTimeout(() => { i = 0; tick(); }, 2200);\n  }\n})();",
  },
  {
    id: 'text-neon',
    name: '霓虹灯字',
    groupId: 'texts',
    desc: '多层 text-shadow 光晕 + 呼吸动画，偶发闪烁',
    html: '<div class="stage">\n  <h1 class="neon">OPEN ALL NIGHT</h1>\n  <p class="hint">neon sign</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #07090d;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.neon {\n  margin: 6px 0;\n  font-size: clamp(40px, 9vw, 76px);\n  font-weight: 800;\n  letter-spacing: 0.18em;\n  color: #4ffff2;\n  text-shadow:\n    0 0 6px rgba(79, 255, 242, 0.9),\n    0 0 18px rgba(79, 255, 242, 0.55),\n    0 0 42px rgba(57, 197, 187, 0.5),\n    0 0 80px rgba(57, 197, 187, 0.35);\n  animation: hum 3.4s ease-in-out infinite;\n}\n@keyframes hum {\n  50% {\n    text-shadow:\n      0 0 4px rgba(79, 255, 242, 0.7),\n      0 0 12px rgba(79, 255, 242, 0.4),\n      0 0 28px rgba(57, 197, 187, 0.35),\n      0 0 56px rgba(57, 197, 187, 0.25);\n  }\n}\n.hint {\n  color: #5c6b76;\n  font-size: 12px;\n  font-family: monospace;\n  letter-spacing: 0.4em;\n}',
    js: "// 光晕由内向外四层：越远越大越淡，呼吸时整体变弱\nconsole.log('霓虹灯字：多层 text-shadow 堆叠');",
  },
  {
    id: 'text-stagger',
    name: '逐字升起',
    groupId: 'texts',
    desc: '每个字符独立延迟入场，带回弹缓动',
    html: '<div class="stage">\n  <h1 class="stagger" aria-label="FANDEX"></h1>\n  <button class="replay" id="replay">REPLAY</button>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.stagger {\n  margin: 0 0 26px;\n  font-size: clamp(40px, 8vw, 72px);\n  font-weight: 800;\n  letter-spacing: 0.08em;\n  color: #e8f6f8;\n}\n.stagger .ch {\n  display: inline-block;\n  opacity: 0;\n  transform: translateY(0.6em);\n  animation: rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;\n}\n@keyframes rise {\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n.replay {\n  padding: 9px 24px;\n  border: 1px solid #39c5bb;\n  border-radius: 4px;\n  background: transparent;\n  color: #4ffff2;\n  font-size: 13px;\n  cursor: pointer;\n}\n.replay:hover { background: rgba(57, 197, 187, 0.12); }',
    js: "// 每个字包一层 span，animation-delay 递增形成接力感\nconst host = document.querySelector('.stagger');\nfunction play() {\n  host.innerHTML = '';\n  [...'FANDEX'].forEach((ch, i) => {\n    const s = document.createElement('span');\n    s.className = 'ch';\n    s.textContent = ch;\n    s.style.animationDelay = i * 0.09 + 's';\n    host.appendChild(s);\n  });\n}\nplay();\ndocument.getElementById('replay').addEventListener('click', play);",
  },
  {
    id: 'bg-synthwave',
    name: '合成波地网',
    groupId: 'backgrounds',
    desc: '透视网格向后滚动，雾化地平线，赛博日落',
    html: '<div class="scene">\n  <div class="grid-floor"></div>\n  <h1 class="headline">SYNTHWAVE</h1>\n</div>',
    css:
      'body {\n  margin: 0;\n  overflow: hidden;\n  background: #07090d;\n  font-family: monospace;\n}\n.scene {\n  position: relative;\n  height: 100vh;\n  display: grid;\n  place-items: center;\n  perspective: 380px;\n  overflow: hidden;\n}\n.grid-floor {\n  position: absolute;\n  inset: 40% -60% -30%;\n  background-image:\n    linear-gradient(rgba(57, 197, 187, 0.35) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(57, 197, 187, 0.35) 1px, transparent 1px);\n  background-size: 44px 44px;\n  transform: rotateX(62deg);\n  animation: roll 2.4s linear infinite;\n}\n@keyframes roll {\n  to { background-position-y: 44px; }\n}\n.scene::after {\n  content: "";\n  position: absolute;\n  inset: 0 0 55%;\n  background: linear-gradient(180deg, #07090d 30%, transparent);\n}\n.headline {\n  position: relative;\n  color: #4ffff2;\n  font-size: clamp(28px, 6vw, 52px);\n  letter-spacing: 0.4em;\n  text-shadow: 0 0 22px rgba(57, 197, 187, 0.6);\n}',
    js: "// rotateX 把平面压成地面，background-position-y 滚动网格线\nconsole.log('合成波地网：透视 + 滚动 + 雾化遮罩');",
  },
  {
    id: 'bg-aurora',
    name: '极光渐变',
    groupId: 'backgrounds',
    desc: '多层大尺寸模糊色块缓慢漂移，呼吸式氛围底色',
    html: '<div class="scene">\n  <div class="aurora aurora-a"></div>\n  <div class="aurora aurora-b"></div>\n  <div class="aurora aurora-c"></div>\n  <h1 class="title">AURORA</h1>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  overflow: hidden;\n  display: grid;\n  place-items: center;\n  background: #07090d;\n  font-family: sans-serif;\n}\n.scene { position: relative; width: 100%; height: 100vh; }\n.aurora {\n  position: absolute;\n  width: 60vw;\n  height: 40vh;\n  border-radius: 50%;\n  filter: blur(80px);\n  opacity: 0.35;\n  animation: sway 14s ease-in-out infinite alternate;\n}\n.aurora-a { background: #14716a; top: 8%; left: -10%; }\n.aurora-b { background: #11606b; bottom: 4%; right: -8%; animation-delay: -5s; }\n.aurora-c { background: #0e4a5e; top: 36%; left: 30%; animation-delay: -9s; }\n@keyframes sway {\n  to { transform: translate(8vw, -6vh) scale(1.15); }\n}\n.title {\n  position: relative;\n  color: #e8f6f8;\n  font-size: clamp(32px, 7vw, 64px);\n  letter-spacing: 0.3em;\n}',
    js: "// 大 blur 值 + 低透明度 + alternate 漂移 = 呼吸式极光\nconsole.log('极光：模糊色块漂移，注意 blur 的性能开销');",
  },
  {
    id: 'bg-starfield',
    name: '星尘闪烁',
    groupId: 'backgrounds',
    desc: '多层 box-shadow 星点 + 闪烁相位差，静态元素做出星空',
    html: '<div class="scene">\n  <div class="starfield"></div>\n  <h1 class="title">STARDUST</h1>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #07090d;\n  font-family: monospace;\n}\n.scene { position: relative; width: 100%; height: 100vh; }\n.starfield {\n  position: absolute;\n  inset: 0;\n  background:\n    radial-gradient(1.5px 1.5px at 20% 30%, #4ffff2, transparent),\n    radial-gradient(1px 1px at 40% 70%, #66ccff, transparent),\n    radial-gradient(1.5px 1.5px at 60% 20%, #fff, transparent),\n    radial-gradient(1px 1px at 80% 50%, #39c5bb, transparent),\n    radial-gradient(1.5px 1.5px at 10% 80%, #fff, transparent),\n    radial-gradient(1px 1px at 70% 85%, #66ccff, transparent),\n    radial-gradient(1px 1px at 30% 10%, #39c5bb, transparent),\n    radial-gradient(1.5px 1.5px at 90% 15%, #fff, transparent);\n  animation: twinkle 4s ease-in-out infinite alternate;\n}\n@keyframes twinkle {\n  from { opacity: 0.4; }\n  to { opacity: 1; }\n}\n.title {\n  position: absolute;\n  inset: 0;\n  display: grid;\n  place-items: center;\n  color: #e8f6f8;\n  font-size: clamp(28px, 6vw, 52px);\n  letter-spacing: 0.5em;\n}',
    js: "// 一层元素 + 多重 radial-gradient 星点，透明度整体呼吸即闪烁\nconsole.log('星尘：无 JS 的静态星空，开销极低');",
  },
  {
    id: 'widget-switch',
    name: '开关组件',
    groupId: 'widgets',
    desc: 'checkbox 可达性开关，回弹缓动与焦点描边',
    html: '<div class="stage">\n  <label class="switch-row">\n    <input class="switch-input" type="checkbox" checked />\n    <span class="switch-track"><span class="switch-thumb"></span></span>\n    <span>自动保存到本地</span>\n  </label>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.switch-row {\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  cursor: pointer;\n  color: #dfe9ee;\n  font-size: 15px;\n}\n.switch-input {\n  position: absolute;\n  opacity: 0;\n}\n.switch-track {\n  position: relative;\n  width: 46px;\n  height: 24px;\n  border-radius: 12px;\n  background: #2a333c;\n  transition: background 0.25s ease;\n}\n.switch-thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 18px;\n  height: 18px;\n  border-radius: 9px;\n  background: #8fa3b0;\n  transition:\n    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),\n    background 0.25s ease;\n}\n.switch-input:checked + .switch-track { background: #14716a; }\n.switch-input:checked + .switch-track .switch-thumb {\n  transform: translateX(22px);\n  background: #39c5bb;\n}\n.switch-input:focus-visible + .switch-track {\n  outline: 2px solid #39c5bb;\n  outline-offset: 2px;\n}',
    js: "// 真实的 checkbox 元素保证键盘与读屏可达，视觉只是它的外壳\nconsole.log('开关：input:checked + 兄弟选择器驱动');",
  },
  {
    id: 'widget-tabs',
    name: '滑轨标签页',
    groupId: 'widgets',
    desc: '指示条测量目标位置滑动过去，内容面板联动',
    html: '<div class="tabs">\n  <div class="tab-list" role="tablist">\n    <button class="tab is-active" role="tab">HTML</button>\n    <button class="tab" role="tab">CSS</button>\n    <button class="tab" role="tab">JS</button>\n  </div>\n  <div class="tab-ink"></div>\n  <div class="tab-panel is-active" data-for="0">结构层：语义与可达性是骨架</div>\n  <div class="tab-panel" data-for="1">表现层：布局、动效与色彩系统</div>\n  <div class="tab-panel" data-for="2">行为层：交互逻辑与状态管理</div>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.tabs { width: min(420px, 88vw); }\n.tab-list {\n  position: relative;\n  display: flex;\n  border-bottom: 1px solid #26313a;\n}\n.tab {\n  padding: 11px 18px;\n  border: none;\n  background: transparent;\n  color: #8fa3b0;\n  font-size: 14px;\n  cursor: pointer;\n  transition: color 0.2s ease;\n}\n.tab:hover { color: #c6d4dd; }\n.tab.is-active { color: #39c5bb; }\n.tab-ink {\n  position: absolute;\n  bottom: -1px;\n  height: 2px;\n  background: #39c5bb;\n  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n}\n.tab-panel {\n  display: none;\n  padding: 20px 4px;\n  color: #aebdc7;\n  font-size: 14px;\n  line-height: 1.8;\n}\n.tab-panel.is-active { display: block; animation: panel-in 0.3s ease; }\n@keyframes panel-in {\n  from { opacity: 0; transform: translateY(6px); }\n  to { opacity: 1; transform: translateY(0); }\n}',
    js: "// 指示条读取目标标签的 offsetLeft/Width，用 transition 滑过去\nconst tabs = [...document.querySelectorAll('.tab')];\nconst ink = document.querySelector('.tab-ink');\nconst panels = [...document.querySelectorAll('.tab-panel')];\nfunction activate(tab) {\n  tabs.forEach((t) => t.classList.toggle('is-active', t === tab));\n  ink.style.left = tab.offsetLeft + 'px';\n  ink.style.width = tab.offsetWidth + 'px';\n  panels.forEach((p) =>\n    p.classList.toggle('is-active', p.dataset.for === String(tabs.indexOf(tab))));\n}\ntabs.forEach((t) => t.addEventListener('click', () => activate(t)));\nactivate(tabs[0]);",
  },
  {
    id: 'widget-toast',
    name: '通知弹层',
    groupId: 'widgets',
    desc: '右下角堆叠通知，进出场动画与自动消失',
    html: '<div class="stage">\n  <button class="toast-btn">发送一条通知</button>\n</div>\n<div class="toast-zone" id="zone"></div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.toast-btn {\n  padding: 12px 30px;\n  border: 1px solid #39c5bb;\n  border-radius: 4px;\n  background: transparent;\n  color: #4ffff2;\n  font-size: 14px;\n  cursor: pointer;\n}\n.toast-btn:hover { background: rgba(57, 197, 187, 0.1); }\n.toast-zone {\n  position: fixed;\n  right: 18px;\n  bottom: 18px;\n  display: grid;\n  gap: 10px;\n  z-index: 10;\n}\n.toast {\n  display: flex;\n  align-items: center;\n  min-width: 240px;\n  padding: 12px 14px;\n  border: 1px solid #26313a;\n  border-left: 3px solid #39c5bb;\n  border-radius: 4px;\n  background: #16202a;\n  color: #dfe9ee;\n  font-size: 13px;\n  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);\n  animation: toast-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);\n}\n.toast.is-leaving {\n  animation: toast-out 0.3s ease forwards;\n}\n@keyframes toast-in {\n  from { opacity: 0; transform: translateX(30px); }\n  to { opacity: 1; transform: translateX(0); }\n}\n@keyframes toast-out {\n  to { opacity: 0; transform: translateX(30px); }\n}',
    js: "// 通知 3 秒自动退场：先挂离场动画类，animationend 后移除节点\nconst zone = document.getElementById('zone');\nlet n = 0;\ndocument.querySelector('.toast-btn').addEventListener('click', () => {\n  n += 1;\n  const toast = document.createElement('div');\n  toast.className = 'toast';\n  toast.textContent = '已保存修改 #' + n;\n  zone.appendChild(toast);\n  setTimeout(() => {\n    toast.classList.add('is-leaving');\n    toast.addEventListener('animationend', () => toast.remove());\n  }, 3000);\n});",
  },
  {
    id: 'fdx-decor',
    name: '几何装饰复刻',
    groupId: 'fandex',
    desc: '站点 GeoBgDecor 的极简变体：网格打底、竖条呼吸、涟漪点缀',
    html: '<div class="scene">\n  <div class="geo-grid"></div>\n  <div class="geo-bars">\n    <span></span><span></span><span></span><span></span><span></span>\n  </div>\n  <div class="geo-ripple"></div>\n  <div class="geo-caption">GEOMETRIC DECOR</div>\n</div>',
    css:
      'body { margin: 0; font-family: sans-serif; }\n.scene {\n  position: relative;\n  min-height: 100vh;\n  overflow: hidden;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n}\n.geo-grid {\n  position: absolute;\n  inset: 0;\n  background-image:\n    linear-gradient(rgba(57, 197, 187, 0.05) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(57, 197, 187, 0.05) 1px, transparent 1px);\n  background-size: 48px 48px;\n}\n.geo-bars {\n  position: absolute;\n  top: 18%;\n  left: 12%;\n  display: flex;\n  gap: 6px;\n  align-items: flex-end;\n  height: 40px;\n}\n.geo-bars span {\n  width: 2px;\n  background: rgba(57, 197, 187, 0.55);\n  animation: bar-breathe 2.8s ease-in-out infinite;\n}\n.geo-bars span:nth-child(1) { height: 40%; animation-delay: 0s; }\n.geo-bars span:nth-child(2) { height: 100%; animation-delay: 0.35s; }\n.geo-bars span:nth-child(3) { height: 70%; animation-delay: 0.7s; }\n.geo-bars span:nth-child(4) { height: 90%; animation-delay: 1.05s; }\n.geo-bars span:nth-child(5) { height: 55%; animation-delay: 1.4s; }\n@keyframes bar-breathe {\n  0%, 100% { transform: scaleY(0.5); opacity: 0.4; }\n  50% { transform: scaleY(1); opacity: 1; }\n}\n.geo-ripple {\n  position: absolute;\n  right: 14%;\n  bottom: 16%;\n  width: 120px;\n  height: 120px;\n  border-radius: 50%;\n  border: 1px solid rgba(57, 197, 187, 0.35);\n}\n.geo-ripple::before,\n.geo-ripple::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  border-radius: 50%;\n  border: 1px solid rgba(57, 197, 187, 0.35);\n  animation: ripple-out 3.2s ease-out infinite;\n}\n.geo-ripple::after { animation-delay: 1.6s; }\n@keyframes ripple-out {\n  from { transform: scale(0.4); opacity: 0.8; }\n  to { transform: scale(1.5); opacity: 0; }\n}\n.geo-caption {\n  position: relative;\n  color: #4e5e6b;\n  font-family: monospace;\n  font-size: 13px;\n  letter-spacing: 0.5em;\n}',
    js: "// FANDEX 页面装饰三原则：网格打底、竖条代替点、几何切片点缀\n// 全部低透明度，永远不与内容抢视觉\nconsole.log('GeoBgDecor 的 minimal 变体复刻');",
  },
  {
    id: 'fdx-stat-row',
    name: '统计刻度行',
    groupId: 'fandex',
    desc: '等宽数字 + 竖条分隔 + 克制标签，首页数据栏同款',
    html: '<div class="stage">\n  <div class="stat-row">\n    <div class="stat">\n      <span class="stat-num">1 803</span>\n      <span class="stat-label">篇教程</span>\n    </div>\n    <i class="stat-divider"></i>\n    <div class="stat">\n      <span class="stat-num">38</span>\n      <span class="stat-label">个模块</span>\n    </div>\n    <i class="stat-divider"></i>\n    <div class="stat">\n      <span class="stat-num">3 端</span>\n      <span class="stat-label">全平台</span>\n    </div>\n  </div>\n  <p class="hint">数字使用 tabular-nums 等宽排版</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.stat-row {\n  display: flex;\n  align-items: center;\n  gap: 28px;\n}\n.stat {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 6px;\n}\n.stat-num {\n  font-family: monospace;\n  font-size: 30px;\n  font-weight: 700;\n  color: #e8eef2;\n  font-variant-numeric: tabular-nums;\n  letter-spacing: 0.04em;\n  transition: color 0.2s ease;\n}\n.stat:hover .stat-num {\n  color: #39c5bb;\n}\n.stat-label {\n  font-size: 12px;\n  letter-spacing: 0.2em;\n  color: #4e5e6b;\n}\n.stat-divider {\n  width: 2px;\n  height: 26px;\n  border-radius: 1px;\n  background: #2a3547;\n}\n.hint {\n  margin-top: 22px;\n  color: #4e5e6b;\n  font-size: 11px;\n  font-family: monospace;\n  letter-spacing: 0.1em;\n}',
    js: "// tabular-nums 是数据栏排版的细节关键：数字滚动时列宽不抖动\nconsole.log('悬停数字变品牌青色');",
  },
  {
    id: 'fdx-button',
    name: '按钮体系',
    groupId: 'fandex',
    desc: 'primary/ghost/danger 三变体，直角 + 边框转色 + 焦点环',
    html: '<div class="stage">\n  <div class="btn-row">\n    <button class="fbtn fbtn--primary">开始学习</button>\n    <button class="fbtn fbtn--ghost">查看文档</button>\n    <button class="fbtn fbtn--danger">删除数据</button>\n  </div>\n  <p class="hint">用 Tab 键查看 focus-visible 焦点环</p>\n</div>',
    css:
      'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #0a0e14;\n  font-family: sans-serif;\n}\n.stage { text-align: center; }\n.btn-row {\n  display: flex;\n  gap: 12px;\n  flex-wrap: wrap;\n  justify-content: center;\n  padding: 0 16px;\n}\n.fbtn {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  height: 36px;\n  padding: 0 20px;\n  border: 1px solid transparent;\n  border-radius: 4px;\n  font-size: 13px;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  cursor: pointer;\n  transition:\n    color 0.12s ease-out,\n    background-color 0.12s ease-out,\n    border-color 0.12s ease-out;\n}\n.fbtn:active {\n  transform: translateY(1px);\n}\n.fbtn--primary {\n  background: #39c5bb;\n  border-color: #39c5bb;\n  color: #04252c;\n}\n.fbtn--primary:hover {\n  background: #4ffff2;\n  border-color: #4ffff2;\n}\n.fbtn--ghost {\n  background: transparent;\n  border-color: #2a3547;\n  color: #9fadb9;\n}\n.fbtn--ghost:hover {\n  color: #39c5bb;\n  border-color: rgba(57, 197, 187, 0.5);\n  background: rgba(57, 197, 187, 0.08);\n}\n.fbtn--danger {\n  background: transparent;\n  border-color: rgba(239, 68, 68, 0.5);\n  color: #ef4444;\n}\n.fbtn--danger:hover {\n  background: rgba(239, 68, 68, 0.1);\n  border-color: #ef4444;\n}\n.fbtn:focus-visible {\n  outline: 2px solid #39c5bb;\n  outline-offset: 2px;\n}',
    js: "// :focus-visible 与 :focus 的区别：只有键盘焦点才显示描边\nconsole.log('直角 + 细边框 + 边框转色 = FANDEX 按钮三要素');",
  },
];

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
