---
order: 370
title: HTML5 项目示例：交互式表单应用
module: 'html5'
category: 前端技术
difficulty: intermediate
description: 综合运用表单验证、Canvas 与本地存储的交互式应用。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'html5/035-CrossDocumentCommunication'
  - 'html5/036-ViewportConfigMobileFirst'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---


| 实时验证      | 内置验证 + 自定义验证逻辑 |
| ------------- | ------------------------- |
| Canvas 签名板 | 手写签名，支持清除和导出  |
| 拖拽排序      | 拖拽调整表单字段顺序      |
| 文件上传      | 拖拽上传 + 预览 + 进度条  |
| 数据持久化    | LocalStorage 自动保存草稿 |
| 数据导出      | JSON/PDF 导出             |
| 地理位置      | Geolocation API 获取位置  |
| 通知          | Notification API 推送提醒 |

> 前置要求：本篇是 HTML5 模块的"毕业设计"，默认你已完成 001-029 与 JavaScript 基础（`javascript/001`-`030`）。它综合 HTML + CSS + JS + 表单验证 + 存储 + 事件；如果某一环薄弱，可以**先跳过本篇**，回头补完对应章节再回来，不要硬啃。

## 需求分析

### 数据需求

- 个人信息：姓名、邮箱、手机、生日、性别
- 地址信息：国家、省份、城市、详细地址、邮编
- 附加信息：头像上传、手写签名、技能标签
- 偏好设置：通知偏好、主题选择

### 功能需求

- 每步验证通过才能进入下一步
- 支持返回上一步修改
- 草稿自动保存，刷新不丢失
- 签名板支持鼠标和触摸
- 文件上传支持图片预览

## 完整代码

### HTML 结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Interactive Form Application</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="app">
      <header class="app-header">
        <h1>Registration Form</h1>
        <div class="progress-bar">
          <div class="progress-bar__fill" id="progressFill"></div>
        </div>
        <div class="step-indicators" id="stepIndicators">
          <div class="step-dot active" data-step="1">1</div>
          <div class="step-dot" data-step="2">2</div>
          <div class="step-dot" data-step="3">3</div>
          <div class="step-dot" data-step="4">4</div>
        </div>
      </header>

      <form class="form" id="mainForm" novalidate>
        <!-- Step 1: Personal Info -->
        <div class="form-step active" id="step1">
          <h2 class="form-step__title">Personal Information</h2>

          <div class="form-group">
            <label for="fullName">Full Name <span class="required">*</span></label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              required
              minlength="2"
              maxlength="50"
              placeholder="Enter your full name"
              autocomplete="name"
            />
            <span class="error-msg" id="fullNameError"></span>
          </div>

          <div class="form-group">
            <label for="email">Email <span class="required">*</span></label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="example@domain.com"
              autocomplete="email"
            />
            <span class="error-msg" id="emailError"></span>
          </div>

          <div class="form-group">
            <label for="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              pattern="[0-9+\-\(\)\s]{7,20}"
              placeholder="+86 138 0000 0000"
              autocomplete="tel"
            />
            <span class="error-msg" id="phoneError"></span>
          </div>

          <div class="form-group">
            <label for="birthday">Date of Birth</label>
            <input type="date" id="birthday" name="birthday" max="2010-12-31" min="1920-01-01" />
            <span class="error-msg" id="birthdayError"></span>
          </div>

          <div class="form-group">
            <label>Gender</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="gender" value="male" /> Male
              </label>
              <label class="radio-label">
                <input type="radio" name="gender" value="female" /> Female
              </label>
              <label class="radio-label">
                <input type="radio" name="gender" value="other" /> Other
              </label>
            </div>
          </div>
        </div>

        <!-- Step 2: Address -->
        <div class="form-step" id="step2">
          <h2 class="form-step__title">Address Information</h2>

          <div class="form-group">
            <label for="country">Country <span class="required">*</span></label>
            <select id="country" name="country" required>
              <option value="">Select country</option>
              <option value="CN">China</option>
              <option value="US">United States</option>
              <option value="JP">Japan</option>
              <option value="KR">South Korea</option>
              <option value="GB">United Kingdom</option>
            </select>
            <span class="error-msg" id="countryError"></span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="province">Province/State</label>
              <input
                type="text"
                id="province"
                name="province"
                placeholder="Enter province or state"
              />
            </div>
            <div class="form-group">
              <label for="city">City</label>
              <input type="text" id="city" name="city" placeholder="Enter city" />
            </div>
          </div>

          <div class="form-group">
            <label for="address">Detail Address</label>
            <textarea
              id="address"
              name="address"
              rows="3"
              placeholder="Street, building, room number"
              maxlength="200"
            ></textarea>
            <div class="char-count"><span id="addressCount">0</span>/200</div>
          </div>

          <div class="form-group">
            <label for="postalCode">Postal Code</label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              pattern="[0-9A-Za-z\s\-]{3,10}"
              placeholder="Enter postal code"
            />
          </div>

          <div class="form-group">
            <button type="button" class="btn btn--secondary" id="getLocationBtn">
              Get Current Location
            </button>
            <p class="location-info" id="locationInfo"></p>
          </div>
        </div>

        <!-- Step 3: Additional Info -->
        <div class="form-step" id="step3">
          <h2 class="form-step__title">Additional Information</h2>

          <div class="form-group">
            <label>Profile Photo</label>
            <div class="upload-area" id="uploadArea">
              <input type="file" id="avatar" name="avatar" accept="image/*" hidden />
              <div class="upload-placeholder" id="uploadPlaceholder">
                <p>Drag & drop or click to upload</p>
                <p class="upload-hint">JPG, PNG, GIF (max 5MB)</p>
              </div>
              <div class="upload-preview" id="uploadPreview" hidden>
                <img id="previewImage" alt="Preview" />
                <button type="button" class="remove-btn" id="removeImage">&times;</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Skills (drag to reorder)</label>
            <div class="tag-list" id="skillTags">
              <div class="tag" draggable="">JavaScript</div>
              <div class="tag" draggable="">Python</div>
              <div class="tag" draggable="">Java</div>
              <div class="tag" draggable="">CSS</div>
              <div class="tag" draggable="">SQL</div>
            </div>
            <div class="tag-input-group">
              <input type="text" id="newSkill" placeholder="Add a skill" />
              <button type="button" class="btn btn--small" id="addSkillBtn">Add</button>
            </div>
          </div>

          <div class="form-group">
            <label>Signature</label>
            <div class="signature-pad">
              <canvas id="signatureCanvas" width="500" height="150"></canvas>
              <div class="signature-controls">
                <button type="button" class="btn btn--small" id="clearSignature">Clear</button>
                <button type="button" class="btn btn--small" id="undoSignature">Undo</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Review & Submit -->
        <div class="form-step" id="step4">
          <h2 class="form-step__title">Review & Submit</h2>
          <div class="review-section" id="reviewContent">
            <!-- Populated by JavaScript -->
          </div>
        </div>

        <!-- Navigation -->
        <div class="form-nav">
          <button type="button" class="btn btn--secondary" id="prevBtn" hidden>Previous</button>
          <button type="button" class="btn btn--primary" id="nextBtn">Next</button>
          <button type="submit" class="btn btn--primary" id="submitBtn" hidden>Submit</button>
        </div>
      </form>

      <!-- Toast -->
      <div class="toast-container" id="toastContainer"></div>
    </div>

    <script src="app.js"></script>
  </body>
</html>
```

### CSS 样式

```css
:root {
  --primary: #4361ee;
  --primary-hover: #3a56d4;
  --danger: #e74c3c;
  --success: #27ae60;
  --warning: #f39c12;
  --bg: #f5f7fa;
  --card: #ffffff;
  --text: #1a1a2e;
  --text-secondary: #6c757d;
  --border: #dde1e6;
  --radius: 8px;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.app {
  max-width: 640px;
  margin: 40px auto;
  padding: 0 20px;
}

.app-header {
  margin-bottom: 32px;
}
.app-header h1 {
  font-size: 1.8rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 20px;
}

.progress-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-bar__fill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  width: 25%;
  transition: width 0.4s ease;
}

.step-indicators {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  background: var(--border);
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.step-dot.active {
  background: var(--primary);
  color: #fff;
}
.step-dot.completed {
  background: var(--success);
  color: #fff;
}

.form-step {
  display: none;
}
.form-step.active {
  display: block;
  animation: fadeIn 0.3s ease;
}

.form-step__title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--primary);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.9rem;
}

.required {
  color: var(--danger);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  background: var(--card);
  color: var(--text);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--primary);
}

.form-group input.invalid,
.form-group select.invalid {
  border-color: var(--danger);
}

.form-group input.valid {
  border-color: var(--success);
}

.error-msg {
  display: block;
  color: var(--danger);
  font-size: 0.8rem;
  margin-top: 4px;
  min-height: 1.2em;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.radio-group {
  display: flex;
  gap: 20px;
  margin-top: 4px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.char-count {
  text-align: right;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.upload-area {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.upload-area:hover,
.upload-area.dragover {
  border-color: var(--primary);
  background: rgba(67, 97, 238, 0.05);
}

.upload-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 8px;
}

.upload-preview {
  position: relative;
  display: inline-block;
}

.upload-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: var(--radius);
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--danger);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  min-height: 40px;
}

.tag {
  padding: 4px 12px;
  background: var(--primary);
  color: #fff;
  border-radius: 16px;
  font-size: 0.85rem;
  cursor: grab;
  user-select: none;
  transition: opacity 0.2s;
}

.tag.dragging {
  opacity: 0.5;
}

.tag-input-group {
  display: flex;
  gap: 8px;
}

.tag-input-group input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.9rem;
  outline: none;
}

.signature-pad {
  border: 2px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.signature-pad canvas {
  display: block;
  width: 100%;
  background: #fff;
  cursor: crosshair;
  touch-action: none;
}

.signature-controls {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--bg);
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.2s,
    opacity 0.2s;
}

.btn--primary {
  background: var(--primary);
  color: #fff;
}
.btn--primary:hover {
  background: var(--primary-hover);
}
.btn--secondary {
  background: var(--bg);
  color: var(--text);
  border: 2px solid var(--border);
}
.btn--secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.btn--small {
  padding: 6px 14px;
  font-size: 0.85rem;
}

.form-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 32px;
  gap: 12px;
}

.review-section {
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}

.review-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.review-item:last-child {
  border-bottom: none;
}
.review-label {
  font-weight: 500;
  color: var(--text-secondary);
}
.review-value {
  font-weight: 600;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  padding: 12px 20px;
  border-radius: var(--radius);
  color: #fff;
  font-size: 0.9rem;
  box-shadow: var(--shadow);
  animation: slideIn 0.3s ease;
}

.toast--success {
  background: var(--success);
}
.toast--error {
  background: var(--danger);
}
.toast--info {
  background: var(--primary);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .radio-group {
    flex-direction: column;
    gap: 8px;
  }
}
```

### JavaScript 核心逻辑

```javascript
const DRAFT_KEY = 'form_draft';
const TOTAL_STEPS = 4;
let currentStep = 1;

const form = document.getElementById('mainForm');
const progressFill = document.getElementById('progressFill');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');

function showStep(step) {
  document.querySelectorAll('.form-step').forEach((el) => el.classList.remove('active'));
  document.getElementById(`step${step}`).classList.add('active');

  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'completed');
    if (i + 1 < step) dot.classList.add('completed');
    if (i + 1 === step) dot.classList.add('active');
  });

  progressFill.style.width = `${(step / TOTAL_STEPS) * 100}%`;
  prevBtn.hidden = step === 1;
  nextBtn.hidden = step === TOTAL_STEPS;
  submitBtn.hidden = step !== TOTAL_STEPS;

  if (step === TOTAL_STEPS) populateReview();
  currentStep = step;
}

function validateStep(step) {
  const stepEl = document.getElementById(`step${step}`);
  const inputs = stepEl.querySelectorAll('input[required], select[required], textarea[required]');
  let valid = true;

  inputs.forEach((input) => {
    const errorEl = document.getElementById(`${input.id}Error`);
    if (!input.checkValidity()) {
      input.classList.add('invalid');
      input.classList.remove('valid');
      if (errorEl) {
        if (input.validity.valueMissing) errorEl.textContent = 'This field is required';
        else if (input.validity.typeMismatch) errorEl.textContent = `Invalid ${input.type} format`;
        else if (input.validity.tooShort)
          errorEl.textContent = `Minimum ${input.minLength} characters`;
        else if (input.validity.patternMismatch) errorEl.textContent = 'Invalid format';
        else errorEl.textContent = input.validationMessage;
      }
      valid = false;
    } else {
      input.classList.remove('invalid');
      input.classList.add('valid');
      if (errorEl) errorEl.textContent = '';
    }
  });

  return valid;
}

nextBtn.addEventListener('click', () => {
  if (validateStep(currentStep)) {
    saveDraft();
    showStep(currentStep + 1);
  }
});

prevBtn.addEventListener('click', () => {
  showStep(currentStep - 1);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (validateStep(currentStep)) {
    showToast('Form submitted successfully!', 'success');
    localStorage.removeItem(DRAFT_KEY);
    console.log('Form data:', getFormData());
  }
});

// Real-time validation
form.addEventListener('input', (e) => {
  const input = e.target;
  if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' || input.tagName === 'SELECT') {
    if (input.required) {
      const errorEl = document.getElementById(`${input.id}Error`);
      if (input.checkValidity()) {
        input.classList.remove('invalid');
        input.classList.add('valid');
        if (errorEl) errorEl.textContent = '';
      }
    }
  }
});

// Character count
const addressInput = document.getElementById('address');
const addressCount = document.getElementById('addressCount');
addressInput.addEventListener('input', () => {
  addressCount.textContent = addressInput.value.length;
});

// Draft auto-save
function saveDraft() {
  const data = getFormData();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

function loadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!draft) return;
    Object.entries(draft).forEach(([name, value]) => {
      const input = form.elements[name];
      if (!input) return;
      if (input.type === 'radio') {
        const radio = form.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else {
        input.value = value;
      }
    });
  } catch (e) {
    /* ignore */
  }
}

function getFormData() {
  const fd = new FormData(form);
  const data = {};
  fd.forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

// Auto-save on input
form.addEventListener('change', saveDraft);
form.addEventListener('input', debounce(saveDraft, 1000));

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Canvas Signature
const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let strokes = [];
let currentStroke = [];

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width - 4;
  canvas.height = 150;
  redrawStrokes();
}

function redrawStrokes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokes.forEach((stroke) => {
    ctx.beginPath();
    stroke.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  });
}

function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  currentStroke = [getCanvasPoint(e)];
});
canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  currentStroke.push(getCanvasPoint(e));
  redrawStrokes();
  ctx.beginPath();
  currentStroke.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
});
canvas.addEventListener('mouseup', () => {
  if (isDrawing && currentStroke.length > 0) {
    strokes.push([...currentStroke]);
  }
  isDrawing = false;
  currentStroke = [];
});
canvas.addEventListener('mouseleave', () => {
  if (isDrawing && currentStroke.length > 0) {
    strokes.push([...currentStroke]);
  }
  isDrawing = false;
  currentStroke = [];
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isDrawing = true;
  currentStroke = [getCanvasPoint(e)];
});
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDrawing) return;
  currentStroke.push(getCanvasPoint(e));
  redrawStrokes();
  ctx.beginPath();
  currentStroke.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
});
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (isDrawing && currentStroke.length > 0) {
    strokes.push([...currentStroke]);
  }
  isDrawing = false;
  currentStroke = [];
});

document.getElementById('clearSignature').addEventListener('click', () => {
  strokes = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('undoSignature').addEventListener('click', () => {
  strokes.pop();
  redrawStrokes();
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// File Upload
const uploadArea = document.getElementById('uploadArea');
const avatarInput = document.getElementById('avatar');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const uploadPreview = document.getElementById('uploadPreview');
const previewImage = document.getElementById('previewImage');

uploadArea.addEventListener('click', () => avatarInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleImageFile(file);
});

avatarInput.addEventListener('change', () => {
  if (avatarInput.files[0]) handleImageFile(avatarInput.files[0]);
});

function handleImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    showToast('File size must be less than 5MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    uploadPlaceholder.hidden = true;
    uploadPreview.hidden = false;
  };
  reader.readAsDataURL(file);
}

document.getElementById('removeImage').addEventListener('click', (e) => {
  e.stopPropagation();
  avatarInput.value = '';
  uploadPlaceholder.hidden = false;
  uploadPreview.hidden = true;
});

// Geolocation
document.getElementById('getLocationBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported', 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      document.getElementById('locationInfo').textContent =
        `Latitude: ${pos.coords.latitude.toFixed(4)}, Longitude: ${pos.coords.longitude.toFixed(4)}`;
    },
    (err) => showToast(`Location error: ${err.message}`, 'error'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// Drag & Drop Tags
const skillTags = document.getElementById('skillTags');
let draggedTag = null;

skillTags.addEventListener('dragstart', (e) => {
  draggedTag = e.target;
  e.target.classList.add('dragging');
});

skillTags.addEventListener('dragover', (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(skillTags, e.clientX);
  if (afterElement) skillTags.insertBefore(draggedTag, afterElement);
  else skillTags.appendChild(draggedTag);
});

skillTags.addEventListener('dragend', (e) => {
  e.target.classList.remove('dragging');
  draggedTag = null;
});

function getDragAfterElement(container, x) {
  const elements = [...container.querySelectorAll('.tag:not(.dragging)')];
  return elements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

document.getElementById('addSkillBtn').addEventListener('click', () => {
  const input = document.getElementById('newSkill');
  const value = input.value.trim();
  if (!value) return;
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.draggable = true;
  tag.textContent = value;
  skillTags.appendChild(tag);
  input.value = '';
});

// Review
function populateReview() {
  const data = getFormData();
  const review = document.getElementById('reviewContent');
  const labels = {
    fullName: 'Name',
    email: 'Email',
    phone: 'Phone',
    birthday: 'Birthday',
    country: 'Country',
    province: 'Province',
    city: 'City',
    address: 'Address',
    postalCode: 'Postal Code',
  };
  review.innerHTML = Object.entries(labels)
    .map(([key, label]) => {
      const value = data[key] || 'Not provided';
      return `<div class="review-item"><span class="review-label">${label}</span><span class="review-value">${value}</span></div>`;
    })
    .join('');
}

// Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Init
loadDraft();
```

## 运行说明

用浏览器打开 HTML 文件即可。文件结构：

```
form-app/
  index.html
  style.css
  app.js
```

## 部署上线

项目做完不部署 = 半成品。本项目是纯静态页面（HTML/CSS/JS + localStorage），两种免费方案任选：

### 方案 A：GitHub Pages

```bash
# 1. 在 GitHub 新建仓库并上传项目（或用 git 命令）
git init
git add .
git commit -m "form app"
git branch -M main
git remote add origin https://github.com/<你的用户名>/form-app.git
git push -u origin main
```

1. 仓库页面 → Settings → Pages → Source 选择 `main` 分支，保存；
2. 等待 1-2 分钟，访问 `https://<你的用户名>.github.io/form-app/`；
3. 之后的更新：`git add . && git commit -m "更新" && git push` 自动重新部署。

### 方案 B：Vercel

```bash
npm i -g vercel
vercel          # 在项目目录执行，按提示登录并确认
vercel --prod   # 部署到生产环境
```

**讲解：**

1. GitHub Pages 适合静态项目且免费，配合 Git 学习正好一体化。
2. Vercel 会自动识别静态目录，`vercel` 交互式完成部署，连接 GitHub 仓库后每次 `git push` 可自动触发。
3. 本项目使用 localStorage 存储，数据只在访问者的浏览器里；部署上线后行为与本地完全一致。
4. 部署后记得用手机访问一次，验证 029 学过的移动端适配。

## 扩展方向

1. **PDF 导出** -- 使用 jsPDF 生成 PDF
2. **多语言** -- i18n 国际化
3. **步骤间数据联动** -- 根据国家动态加载省份
4. **WebSocket 实时协作** -- 多人同时填写
5. **离线支持** -- Service Worker + IndexedDB
6. **OCR 识别** -- 上传证件自动填充

> 下一步学习出路：项目已经用上了 HTML5 的表单验证、存储、事件与拖拽，接下来三选一继续深入——CSS 进阶（`css/034-ResponsiveDesign` 与 `css/068-CSSProjectExampleResponsiveHomepage`）、JavaScript 进阶（`javascript/059-JavaScriptProjectPractice`）、或框架入门（`vue3/001-OverviewEnv`、`react/001-OverviewEnvSetup`）。记住：项目能力来自写出的代码量，继续做第二个、第三个项目比反复读文档更有效。

---

## 关键代码速查

### HTML5 表单验证

```html
<input type="email" required pattern="..." minlength="2" maxlength="50" />
```

```javascript
input.checkValidity(); // 返回 true/false
input.validity.valueMissing; // 是否为空
input.validity.typeMismatch; // 类型不匹配
input.validationMessage; // 浏览器默认错误消息
```

### Canvas 绑图

```javascript
const ctx = canvas.getContext('2d');
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();
```

### LocalStorage

```javascript
localStorage.setItem('key', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('key'));
localStorage.removeItem('key');
```

### Geolocation

```javascript
navigator.geolocation.getCurrentPosition(
  (pos) => {
    /* pos.coords.latitude, pos.coords.longitude */
  },
  (err) => {
    /* error */
  },
  { enableHighAccuracy: true, timeout: 10000 }
);
```

### 拖拽上传

```javascript
element.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    /* e.target.result = data URL */
  };
  reader.readAsDataURL(file);
});
```

### Drag and Drop 排序

```javascript
element.addEventListener('dragstart', (e) => {
  /* 记录拖拽元素 */
});
element.addEventListener('dragover', (e) => {
  e.preventDefault(); /* 插入位置 */
});
element.addEventListener('drop', (e) => {
  /* 重新排序 */
});
```
## form 表单容器

**form 元素**
`<form action="<url>" method="GET|POST" [target] [enctype] [autocomplete] [novalidate]></form>`

```html
<!-- 基础表单 -->
<form action="/submit" method="POST">
  <!-- 表单控件 -->
</form>

<!-- 文件上传表单(必须指定 enctype) -->
<form action="/upload" method="POST" enctype="multipart/form-data">
  <input type="file" name="avatar" />
</form>

<!-- 禁用浏览器自动验证 -->
<form action="/submit" method="POST" novalidate>
  <!-- 表单控件 -->
</form>

<!-- 自动填充提示 -->
<form action="/submit" method="POST" autocomplete="on">
  <!-- 表单控件 -->
</form>
```

**form 属性表**

| 属性            | 作用                              | 取值示例                            |
| --------------- | --------------------------------- | ----------------------------------- |
| `action`        | 提交目标 URL                       | `"/submit"`                         |
| `method`        | 提交方法                           | `GET` 或 `POST`                     |
| `enctype`       | 编码类型(POST 时有效)             | `application/x-www-form-urlencoded` |
|                 |                                    | `multipart/form-data`(文件上传)    |
|                 |                                    | `text/plain`                        |
| `target`        | 提交后跳转位置                     | `_self` / `_blank`                  |
| `autocomplete`  | 自动填充                           | `on` / `off`                        |
| `novalidate`    | 禁用浏览器验证                     | 布尔属性                            |
| `accept-charset`| 字符编码                           | `UTF-8`                             |
| `name`          | 表单名称                           | `"loginForm"`                       |

---

## input 输入控件

**input 类型表**

| `type` 值        | 作用                   | 示例                                       |
| ---------------- | ---------------------- | ------------------------------------------ |
| `text`           | 单行文本               | `<input type="text">`                      |
| `password`       | 密码(隐藏字符)        | `<input type="password">`                  |
| `email`          | 邮箱(自带验证)        | `<input type="email">`                     |
| `url`            | URL(自带验证)         | `<input type="url">`                       |
| `tel`            | 电话号码               | `<input type="tel">`                       |
| `number`         | 数字输入               | `<input type="number" min="0" max="100">`  |
| `search`         | 搜索框                 | `<input type="search">`                    |
| `date`           | 日期选择               | `<input type="date">`                      |
| `time`           | 时间选择               | `<input type="time">`                      |
| `datetime-local` | 本地日期时间           | `<input type="datetime-local">`            |
| `month`          | 月份选择               | `<input type="month">`                     |
| `week`           | 周选择                 | `<input type="week">`                      |
| `color`          | 颜色选择器             | `<input type="color" value="#ff0000">`     |
| `range`          | 范围滑块               | `<input type="range" min="0" max="100">`   |
| `file`           | 文件上传               | `<input type="file" accept="image/*">`     |
| `checkbox`       | 复选框                 | `<input type="checkbox" checked>`          |
| `radio`          | 单选框                 | `<input type="radio" name="gender">`       |
| `submit`         | 提交按钮               | `<input type="submit" value="提交">`       |
| `reset`          | 重置按钮               | `<input type="reset">`                     |
| `button`         | 普通按钮               | `<input type="button" value="点击">`       |
| `image`          | 图像提交按钮           | `<input type="image" src="btn.png">`       |
| `hidden`         | 隐藏字段               | `<input type="hidden" name="id">`          |

**input 通用属性表**

| 属性            | 作用                          | 示例                              |
| --------------- | ----------------------------- | --------------------------------- |
| `name`          | 字段名(提交时的键)           | `name="username"`                 |
| `value`         | 字段值                         | `value="default"`                 |
| `placeholder`   | 占位提示文本                  | `placeholder="请输入"`            |
| `required`      | 必填字段                       | 布尔属性                          |
| `disabled`      | 禁用字段                       | 布尔属性                          |
| `readonly`      | 只读字段                       | 布尔属性                          |
| `autofocus`     | 自动聚焦                       | 布尔属性                          |
| `autocomplete`  | 自动填充提示                  | `autocomplete="email"`            |
| `min` / `max`   | 数值/日期范围                  | `min="0" max="100"`               |
| `step`          | 步长                           | `step="0.01"`                     |
| `minlength`     | 最小字符数                    | `minlength="6"`                   |
| `maxlength`     | 最大字符数                    | `maxlength="20"`                  |
| `pattern`       | 正则验证模式                  | `pattern="[0-9]{11}"`             |
| `multiple`      | 允许多选(file/email)         | 布尔属性                          |
| `accept`        | 文件类型过滤(file 专用)      | `accept="image/png, image/jpeg"`  |
| `capture`       | 调用设备摄像头(file 专用)    | `capture="user"`                  |
| `list`          | 关联 datalist                 | `list="browsers"`                 |
| `form`          | 指定所属表单(无需嵌套)      | `form="myForm"`                   |

**常用 input 组合**

```html
<!-- 必填邮箱 -->
<input
  type="email"
  name="email"
  required
  placeholder="example@domain.com"
  autocomplete="email"
/>

<!-- 密码(最少 8 位) -->
<input
  type="password"
  name="password"
  required
  minlength="8"
  maxlength="32"
  placeholder="至少 8 位字符"
/>

<!-- 手机号(中国大陆 11 位) -->
<input
  type="tel"
  name="phone"
  pattern="1[3-9]\d{9}"
  placeholder="请输入手机号"
  autocomplete="tel"
/>

<!-- 数字范围(0-100,步长 5) -->
<input type="number" name="score" min="0" max="100" step="5" value="60" />

<!-- 日期范围限制 -->
<input type="date" name="birthday" min="1920-01-01" max="2010-12-31" />

<!-- 文件上传(限制类型和大小由 JS 处理) -->
<input type="file" name="avatar" accept="image/png, image/jpeg" />

<!-- 多文件上传 -->
<input type="file" name="photos" multiple accept="image/*" />

<!-- 范围滑块 -->
<input type="range" name="volume" min="0" max="100" step="1" value="50" />

<!-- 颜色选择器 -->
<input type="color" name="theme" value="#4361ee" />
```

---

## textarea 多行文本

**textarea 元素**
`<textarea name="<name>" [rows] [cols] [maxlength] [placeholder] [required]></textarea>`

```html
<!-- 基础多行文本 -->
<textarea
  name="address"
  rows="3"
  cols="40"
  placeholder="请输入详细地址"
  maxlength="200"
  required
></textarea>

<!-- 字符计数(配合 JavaScript) -->
<textarea name="comment" id="comment" rows="4" maxlength="500"></textarea>
<div class="char-count"><span id="commentCount">0</span>/500</div>
```

**textarea 属性表**

| 属性          | 作用                | 示例                |
| ------------- | ------------------- | ------------------- |
| `rows`        | 可见行数            | `rows="5"`          |
| `cols`        | 可见列数            | `cols="40"`         |
| `maxlength`   | 最大字符数          | `maxlength="500"`   |
| `minlength`   | 最小字符数          | `minlength="10"`    |
| `wrap`        | 换行模式            | `soft` / `hard`     |
| `placeholder` | 占位文本            | `placeholder="..."` |
| `required`    | 必填                | 布尔属性            |
| `readonly`    | 只读                | 布尔属性            |
| `disabled`    | 禁用                | 布尔属性            |

---

## select 与 option

**select 下拉选择**
`<select name="<name>" [multiple] [size] [required]></select>`

```html
<!-- 基础下拉框 -->
<select name="country" required>
  <option value="">请选择国家</option>
  <option value="CN">中国</option>
  <option value="US">美国</option>
  <option value="JP">日本</option>
</select>

<!-- 分组下拉框 -->
<select name="city">
  <optgroup label="一线城市">
    <option value="beijing">北京</option>
    <option value="shanghai">上海</option>
  </optgroup>
  <optgroup label="二线城市">
    <option value="hangzhou">杭州</option>
    <option value="chengdu">成都</option>
  </optgroup>
</select>

<!-- 多选下拉框 -->
<select name="languages" multiple size="5">
  <option value="js">JavaScript</option>
  <option value="py">Python</option>
  <option value="java">Java</option>
</select>
```

**select 属性表**

| 属性          | 作用                  | 示例              |
| ------------- | --------------------- | ----------------- |
| `name`        | 字段名                | `name="country"`  |
| `multiple`    | 允许多选              | 布尔属性          |
| `size`        | 可见选项数            | `size="5"`        |
| `required`    | 必填                  | 布尔属性          |
| `disabled`    | 禁用                  | 布尔属性          |
| `autofocus`   | 自动聚焦              | 布尔属性          |

**option 属性表**

| 属性        | 作用                | 示例             |
| ----------- | ------------------- | ---------------- |
| `value`     | 提交值              | `value="CN"`     |
| `selected`  | 默认选中            | 布尔属性         |
| `disabled`  | 禁用选项            | 布尔属性         |
| `label`     | 选项显示文本        | `label="中国"`   |

---

## button 按钮

**button 元素**
`<button type="submit | reset | button" [name] [value] [disabled]></button>`

```html
<!-- 提交按钮(默认 type) -->
<button type="submit">提交</button>

<!-- 重置按钮 -->
<button type="reset">重置</button>

<!-- 普通按钮(配合 JavaScript) -->
<button type="button" onclick="handleClick()">点击</button>

<!-- 带图标的按钮 -->
<button type="submit">
  <i class="fa fa-search" aria-hidden="true"></i>
  <span>搜索</span>
</button>

<!-- 禁用按钮 -->
<button type="submit" disabled>提交中...</button>

<!-- 表单外提交按钮(通过 form 属性关联) -->
<button type="submit" form="myForm" value="save">保存</button>
```

**button 属性表**

| 属性        | 作用                           | 示例             |
| ----------- | ------------------------------ | ---------------- |
| `type`      | 按钮类型                       | `submit`/`reset`/`button` |
| `name`      | 按钮名(提交时作为键)         | `name="action"`  |
| `value`     | 按钮值                         | `value="save"`   |
| `disabled`  | 禁用按钮                       | 布尔属性         |
| `autofocus` | 自动聚焦                       | 布尔属性         |
| `form`      | 关联表单 ID                    | `form="loginForm"`|

---

## label 标签关联

**label 元素**
`<label for="<input-id>">文本</label>` 或 `<label><input> 文本</label>`

```html
<!-- 方式1:label 包裹输入框 -->
<label>
  用户名:
  <input type="text" name="username" required />
</label>

<!-- 方式2:label 的 for 属性关联 -->
<label for="email">邮箱:</label>
<input type="email" id="email" name="email" required />

<!-- 必填字段提示 -->
<label for="phone">
  电话:<span aria-label="必填">*</span>
</label>
<input type="tel" id="phone" name="phone" required />

<!-- 单选框/复选框包裹 -->
<label class="radio-label">
  <input type="radio" name="gender" value="male" /> 男
</label>
<label class="radio-label">
  <input type="radio" name="gender" value="female" /> 女
</label>
```

---

## fieldset 与 legend

**字段分组**
`<fieldset [disabled]><legend>分组标题</legend>...</fieldset>`

```html
<!-- 表单字段分组 -->
<form>
  <fieldset>
    <legend>个人信息</legend>
    <label>姓名:<input type="text" name="name" /></label>
    <label>年龄:<input type="number" name="age" /></label>
  </fieldset>

  <fieldset>
    <legend>联系方式</legend>
    <label>邮箱:<input type="email" name="email" /></label>
    <label>电话:<input type="tel" name="phone" /></label>
  </fieldset>

  <!-- 禁用整个分组 -->
  <fieldset disabled>
    <legend>已禁用分组</legend>
    <input type="text" name="readonly-field" />
  </fieldset>
</form>
```

---

## datalist 预定义选项

**输入框联想**
`<input list="<datalist-id>">` + `<datalist id="..."><option></datalist>`

```html
<!-- 输入框带联想选项 -->
<label for="browser">浏览器:</label>
<input list="browsers" id="browser" name="browser" />
<datalist id="browsers">
  <option value="Chrome"></option>
  <option value="Firefox"></option>
  <option value="Safari"></option>
  <option value="Edge"></option>
</datalist>

<!-- 邮箱联想 -->
<input type="email" list="common-emails" name="email" />
<datalist id="common-emails">
  <option value="@gmail.com"></option>
  <option value="@outlook.com"></option>
  <option value="@qq.com"></option>
</datalist>
```

---

## output 与 progress

**output 输出元素**
`<output name="<name>" for="<input-ids>">值</output>`

```html
<!-- 实时显示计算结果 -->
<form oninput="result.value=parseInt(a.value)+parseInt(b.value)">
  <input type="number" name="a" value="10" /> +
  <input type="number" name="b" value="20" /> =
  <output name="result">30</output>
</form>
```

**progress 进度条**
`<progress value="<current>" max="<total>"></progress>`

```html
<!-- 任务进度 -->
<label>上传进度:</label>
<progress id="uploadProgress" value="70" max="100">70%</progress>

<!-- 不确定进度(加载中) -->
<progress>加载中...</progress>
```

**meter 度量条**
`<meter value="<value>" [min] [max] [low] [high] [optimum]></meter>`

```html
<!-- 磁盘使用率 -->
<label>磁盘占用:</label>
<meter value="0.6" min="0" max="1" low="0.3" high="0.7" optimum="0.2">60%</meter>

<!-- 分数评估 -->
<meter value="85" min="0" max="100" low="40" high="80" optimum="100">85 分</meter>
```

---

## 表单验证 API

**HTML5 内置验证属性**

```html
<!-- 必填 -->
<input type="text" required />

<!-- 类型验证(邮箱/URL/数字等) -->
<input type="email" required />
<input type="url" required />
<input type="number" min="0" max="100" />

<!-- 长度验证 -->
<input type="text" minlength="2" maxlength="50" />

<!-- 正则验证 -->
<input type="text" pattern="[A-Za-z]{3,}" title="至少3个字母" />

<!-- 自定义验证消息 -->
<input type="text" required oninput="setCustomValidity('')" 
       oninvalid="setCustomValidity('请输入有效值')" />
```

**ValidityState 对象属性表**

```javascript
// 检查单个输入框的验证状态
const input = document.getElementById('email');
input.checkValidity();              // 返回 true/false
input.reportValidity();             // 验证并显示错误消息
input.setCustomValidity('msg');     // 设置自定义错误消息
input.validationMessage;            // 浏览器默认错误消息

// ValidityState 属性
input.validity.valid;               // 是否通过所有验证
input.validity.valueMissing;        // required 但为空
input.validity.typeMismatch;        // 类型不匹配(email/url)
input.validity.patternMismatch;     // pattern 不匹配
input.validity.tooShort;            // 长度小于 minlength
input.validity.tooLong;             // 长度大于 maxlength
input.validity.rangeUnderflow;      // 值小于 min
input.validity.rangeOverflow;       // 值大于 max
input.validity.stepMismatch;        // 不符合 step 要求
input.validity.badInput;            // 浏览器无法转换输入
input.validity.customError;         // 已设置自定义错误
```

**表单验证流程**

```javascript
// 验证整个表单
const form = document.getElementById('myForm');
const isValid = form.checkValidity();   // 返回是否全部通过
form.reportValidity();                  // 显示所有错误

// 验证单个字段并显示错误
function validateField(input) {
  const errorEl = document.getElementById(`${input.id}Error`);
  if (!input.checkValidity()) {
    input.classList.add('invalid');
    if (errorEl) {
      if (input.validity.valueMissing) {
        errorEl.textContent = '该字段必填';
      } else if (input.validity.typeMismatch) {
        errorEl.textContent = `请输入有效的${input.type}格式`;
      } else if (input.validity.tooShort) {
        errorEl.textContent = `至少 ${input.minLength} 个字符`;
      } else if (input.validity.patternMismatch) {
        errorEl.textContent = '格式不正确';
      } else {
        errorEl.textContent = input.validationMessage;
      }
    }
    return false;
  }
  input.classList.remove('invalid');
  if (errorEl) errorEl.textContent = '';
  return true;
}

// 表单提交前验证
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  let valid = true;
  inputs.forEach((input) => {
    if (!validateField(input)) valid = false;
  });
  if (valid) {
    // 提交表单
    form.submit();
  }
});
```

---

## 表单事件

**表单相关事件表**

| 事件         | 触发时机                    | 应用元素               |
| ------------ | --------------------------- | ---------------------- |
| `submit`     | 表单提交时                  | `<form>`               |
| `reset`      | 表单重置时                  | `<form>`               |
| `input`      | 输入值改变(实时)          | input、textarea、select |
| `change`     | 值改变并失焦时              | input、select、textarea |
| `focus`      | 获得焦点                    | 所有表单元素           |
| `blur`       | 失去焦点                    | 所有表单元素           |
| `invalid`    | 验证失败                    | 表单控件               |
| `valid`      | 验证通过(自定义)          | 表单控件               |

```javascript
// 实时验证(input 事件)
form.addEventListener('input', (e) => {
  const input = e.target;
  if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
    validateField(input);
  }
});

// 表单提交
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (form.checkValidity()) {
    const formData = new FormData(form);
    // 提交数据
  }
});

// 阻止无效提交
form.addEventListener('invalid', (e) => {
  e.preventDefault();
  validateField(e.target);
}, true);
```

---

## FormData 数据提交

**FormData 对象**
`const formData = new FormData([form])`

```javascript
// 从表单创建 FormData
const form = document.getElementById('myForm');
const formData = new FormData(form);

// 遍历所有字段
for (const [key, value] of formData.entries()) {
  console.log(`${key}: ${value}`);
}

// 获取单个字段
const name = formData.get('name');
const files = formData.getAll('photos');  // 多值字段

// 添加/修改字段
formData.append('key', 'value');
formData.set('key', 'new-value');
formData.delete('key');

// 转为普通对象
const data = Object.fromEntries(formData.entries());

// 通过 fetch 提交
fetch('/api/submit', {
  method: 'POST',
  body: formData  // 自动设置 multipart/form-data
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

**FormData 方法表**

| 方法                    | 说明                       |
| ----------------------- | -------------------------- |
| `append(name, value)`   | 添加字段                   |
| `set(name, value)`      | 设置(覆盖)字段           |
| `get(name)`             | 获取第一个值               |
| `getAll(name)`          | 获取所有值(多选)        |
| `has(name)`             | 是否存在字段               |
| `delete(name)`          | 删除字段                   |
| `entries()`             | 遍历所有键值对             |
| `keys()`                | 遍历所有键名               |
| `values()`              | 遍历所有值                 |

---

## autocomplete 自动填充

**autocomplete 值表**

| 值             | 作用                  | 应用字段            |
| -------------- | --------------------- | ------------------- |
| `on`           | 启用自动填充          | 通用                |
| `off`          | 禁用自动填充          | 敏感字段            |
| `name`         | 全名                  | `<input type="text">` |
| `given-name`   | 名字                  | 文本输入            |
| `family-name`  | 姓氏                  | 文本输入            |
| `email`        | 邮箱                  | `<input type="email">` |
| `tel`          | 电话                  | `<input type="tel">` |
| `address-line1`| 地址行 1              | 文本输入            |
| `address-line2`| 地址行 2              | 文本输入            |
| `country`      | 国家                  | 文本/select         |
| `postal-code`  | 邮政编码              | 文本输入            |
| `username`     | 用户名                | 文本输入            |
| `current-password` | 当前密码          | `<input type="password">` |
| `new-password` | 新密码                | `<input type="password">` |
| `cc-number`    | 信用卡号              | 文本输入            |
| `cc-exp`       | 信用卡有效期          | 文本输入            |
| `cc-csc`       | 信用卡安全码          | 文本输入            |
| `bday`          | 生日                  | `<input type="date">` |

```html
<!-- 启用自动填充(浏览器记住用户信息) -->
<form autocomplete="on">
  <input type="text" name="name" autocomplete="name" />
  <input type="email" name="email" autocomplete="email" />
  <input type="tel" name="phone" autocomplete="tel" />
  <input type="password" name="password" autocomplete="current-password" />
</form>

<!-- 禁用自动填充(敏感字段) -->
<input type="text" name="captcha" autocomplete="off" />
<input type="password" name="new-password" autocomplete="new-password" />
```

---

## 文件上传

**file 输入与 FileReader**

```html
<!-- 单文件上传 -->
<input type="file" id="avatar" name="avatar" accept="image/png, image/jpeg" />

<!-- 多文件上传 -->
<input type="file" id="photos" name="photos" multiple accept="image/*" />

<!-- 调用摄像头 -->
<input type="file" accept="image/*" capture="user" />
<!-- 调用麦克风 -->
<input type="file" accept="audio/*" capture />
```

```javascript
// 监听文件选择
const fileInput = document.getElementById('avatar');
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  // 文件信息
  console.log('文件名:', file.name);
  console.log('文件大小:', file.size, 'bytes');
  console.log('文件类型:', file.type);
  console.log('最后修改:', file.lastModified);

  // 文件大小校验(限制 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('文件大小不能超过 5MB');
    return;
  }

  // 读取为 Data URL(图片预览)
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('preview');
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// 拖拽上传
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleImageFile(file);
  }
});
```

**FileReader 方法表**

| 方法                       | 说明                       |
| -------------------------- | -------------------------- |
| `readAsDataURL(file)`      | 读取为 Base64 Data URL     |
| `readAsText(file, [enc])`  | 读取为文本                 |
| `readAsArrayBuffer(file)`  | 读取为 ArrayBuffer         |
| `readAsBinaryString(file)` | 读取为二进制字符串         |
| `abort()`                  | 中断读取                   |

**FileReader 事件表**

| 事件          | 触发时机                |
| ------------- | ----------------------- |
| `onloadstart` | 开始读取                |
| `onprogress`  | 读取进度更新            |
| `onload`      | 读取完成                |
| `onerror`     | 读取错误                |
| `onabort`     | 读取中断                |
| `onloadend`   | 读取结束(无论成功失败)|

---

## 表单序列化

**序列化方法对比**

```javascript
// 方式1:FormData(推荐,支持文件)
const formData = new FormData(form);
fetch('/api/submit', { method: 'POST', body: formData });

// 方式2:URLSearchParams(适合 GET 请求或 x-www-form-urlencoded)
const params = new URLSearchParams();
params.append('name', 'Alice');
params.append('email', 'alice@example.com');
fetch('/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: params
});

// 方式3:JSON 提交
const data = Object.fromEntries(new FormData(form).entries());
fetch('/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// 方式4:直接获取表单值
const form = document.getElementById('myForm');
const data = {
  name: form.elements.name.value,
  email: form.elements.email.value,
  gender: form.elements.gender.value
};
```

---

## 注意事项

- **novalidate**:默认浏览器会在表单提交时自动验证,设置 `novalidate` 可禁用此行为
- **autocomplete**:推荐启用以提升用户体验,敏感字段(验证码、新密码)使用 `off` 或 `new-password`
- **type 优先**:使用正确的 `type`(email/url/number)可触发浏览器内置验证和移动端键盘适配
- **pattern 配合 title**:`pattern` 属性必须配合 `title` 提示用户正确的格式
- **maxlength**:`textarea` 早期不支持 `maxlength`,现代浏览器已支持
- **required**:`checkbox` 类型的 `required` 表示必须勾选,`radio` 同 name 组至少选一个
- **FormData**:直接作为 `fetch` 的 `body` 时不要手动设置 `Content-Type`,浏览器会自动添加 boundary
- **FileReader 异步**:`readAsDataURL` 等方法为异步,需在 `onload` 回调中处理结果
- **accept 仅提示**:`accept` 属性只是浏览器提示,用户仍可选择其他类型,服务端必须再次校验
- **大文件上传**:大文件建议分片上传,避免使用 FileReader 一次性读取

## 动手试试

### 入门版（必做）

1. 运行项目，走完“填写 → 签名 → 上传 → 提交”完整流程；
2. 刷新页面，确认草稿自动恢复；
3. 故意不填必填项，观察每步验证的拦截与提示。

### 进阶版（选做）

1. 增加一个“紧急联系人”步骤，并补充相应的校验规则；
2. 把签名导出改为 PNG 下载（参考 006 的 `toBlob`）；
3. 用 `sessionStorage` 增加“离开确认”：刷新前提示未保存的修改；
4. 把项目拆分成模块（HTML/CSS/JS 分离），用 `fetch` 把表单数据提交到本地 JSON 服务。

## 核心知识点

> 一句话记住综合项目：验证靠原生属性 + `validity`，签名靠 Canvas，草稿靠 LocalStorage，上传靠拖拽 + FileReader，反馈靠 toast 与 Notification。

- 多步骤表单：每步校验通过才可下一步，支持返回修改；
- Canvas 签名板：鼠标/触摸绘制 + `toDataURL` 导出；
- 拖拽上传：`dragover` 放行、`drop` 读取、FileReader 预览；
- LocalStorage 自动保存草稿，刷新不丢失；
- Geolocation 自动填充位置，Notification 提交后提醒；
- 一个综合项目 = 多个 HTML5 API 的协作，重点是模块划分与状态管理。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 全部代码写在一个文件 | 难以维护 | 拆分为 index.html/style.css/app.js |
| 草稿数据无版本 | 表单结构变化后旧草稿报错 | 草稿带版本号，读取时迁移 |
| 签名导出跨域图片 | 画布被污染无法导出 | 使用同源图片或加 CORS |
| 上传无大小限制 | 大文件卡死页面 | 校验 `file.size` 并压缩 |
| 通知被浏览器拦截 | 未授权或非用户手势 | 提交动作中请求权限 |
| 状态散落各处 | 步骤间同步困难 | 统一 `state` 对象管理表单数据 |

## 扩展学习

- 表单基础：`html5/012-HTML5FormValidation`（本项目的验证部分）；
- 签名板：`html5/013-HTML5MultimediaCanvasDrawing`（Canvas 绘制与导出）；
- 存储：`html5/015-HTML5OfflineStorageWebAPI`（LocalStorage/File API）；
- 拖拽：`html5/026-DragAPI`（拖拽排序与上传）；
- 工程化：`javascript/059-JavaScriptProjectPractice` 中小型项目的组织方式。
