# HTML5 表单与交互 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数 | `{ }` 分组 | `|` 或 | `...` 重复

---

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
