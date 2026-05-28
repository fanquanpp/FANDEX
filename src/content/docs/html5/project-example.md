---
order: 70
tags:
  - 'html5'
  - 'project'
  - 'database'
  - 'networking'
  - 'functional'
  - 'memory'
  - 'css-layout'
  - 'data-structure'
  - 'web-api'
  - 'devops'
difficulty: 'intermediate'
title: 'HTML5 项目示例：交互式表单应用'
module: 'html5'
description: '综合运用表单验证、Canvas 与本地存储的交互式应用。'
---

| 实时验证 | 内置验证 + 自定义验证逻辑 |
| Canvas 签名板 | 手写签名，支持清除和导出 |
| 拖拽排序 | 拖拽调整表单字段顺序 |
| 文件上传 | 拖拽上传 + 预览 + 进度条 |
| 数据持久化 | LocalStorage 自动保存草稿 |
| 数据导出 | JSON/PDF 导出 |
| 地理位置 | Geolocation API 获取位置 |
| 通知 | Notification API 推送提醒 |

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

## 扩展方向

1. **PDF 导出** -- 使用 jsPDF 生成 PDF
2. **多语言** -- i18n 国际化
3. **步骤间数据联动** -- 根据国家动态加载省份
4. **WebSocket 实时协作** -- 多人同时填写
5. **离线支持** -- Service Worker + IndexedDB
6. **OCR 识别** -- 上传证件自动填充

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
