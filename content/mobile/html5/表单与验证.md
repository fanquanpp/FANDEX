# 表单与验证 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 表单容器

**form 元素**
`<form action="<URL>" [method="get|post"] [enctype="<编码>"] [autocomplete="on|off"] [novalidate] [target]></form>`
```html
<!-- 基础表单 -->
<form action="/submit" method="post">
  <input type="text" name="username" />
  <button type="submit">提交</button>
</form>

<!-- 文件上传表单 -->
<form action="/upload" method="post" enctype="multipart/form-data">
  <input type="file" name="avatar" />
</form>

<!-- 禁用原生验证 -->
<form action="/api" method="post" novalidate>...</form>
```

| 属性           | 作用                                |
| -------------- | ----------------------------------- |
| `action`       | 提交目标 URL                        |
| `method`       | HTTP 方法 get/post/dialog           |
| `enctype`      | 编码方式 application/x-www-form-urlencoded / multipart/form-data / text/plain |
| `autocomplete` | 自动补全 on/off                     |
| `novalidate`   | 禁用浏览器原生验证                  |
| `target`       | 提交后响应显示位置                  |
| `accept-charset` | 字符编码                          |

---

## input 输入类型

**文本输入框**
`<input type="text" name="<名称>" [placeholder="<提示>"] [required] [maxlength] [minlength] />`
```html
<!-- 用户名输入框,必填 -->
<input type="text" name="username" placeholder="请输入用户名" required />
```

**密码输入框**
`<input type="password" name="<名称>" [required] [minlength] [pattern] />`
```html
<input type="password" name="password" required minlength="8" />
```

**邮箱输入框**
`<input type="email" name="<名称>" [multiple] [required] />`
```html
<!-- 支持多个邮箱(逗号分隔) -->
<input type="email" name="email" multiple required />
```

**URL 输入框**
`<input type="url" name="<名称>" [required] />`
```html
<input type="url" name="website" placeholder="https://" />
```

**数字输入框**
`<input type="number" name="<名称>" [min] [max] [step] [required] />`
```html
<input type="number" name="age" min="1" max="120" step="1" />
```

**滑块输入**
`<input type="range" name="<名称>" min="<最小>" max="<最大>" [step] [value] />`
```html
<input type="range" name="volume" min="0" max="100" value="50" />
```

**日期时间类型**

| 类型             | 描述               | 示例                                        |
| ---------------- | ------------------ | ------------------------------------------- |
| `date`           | 日期选择器         | `<input type="date" name="birthday">`       |
| `month`          | 月份选择器         | `<input type="month" name="expiry">`        |
| `week`           | 周选择器           | `<input type="week" name="week">`           |
| `time`           | 时间选择器         | `<input type="time" name="meeting">`        |
| `datetime-local` | 本地日期时间       | `<input type="datetime-local" name="event">`|

**其他类型**

| 类型      | 描述               | 示例                                       |
| --------- | ------------------ | ------------------------------------------ |
| `color`   | 颜色选择器         | `<input type="color" name="color">`        |
| `search`  | 搜索框(带清除)     | `<input type="search" name="q">`           |
| `tel`     | 电话(移动端数字键) | `<input type="tel" name="phone">`          |
| `file`    | 文件上传           | `<input type="file" name="avatar">`        |
| `hidden`  | 隐藏字段           | `<input type="hidden" name="id">`          |
| `checkbox`| 复选框             | `<input type="checkbox" name="agree">`     |
| `radio`   | 单选框             | `<input type="radio" name="gender">`       |
| `submit`  | 提交按钮           | `<input type="submit" value="提交">`       |
| `reset`   | 重置按钮           | `<input type="reset" value="重置">`        |
| `button`  | 普通按钮           | `<input type="button" value="点击">`       |
| `image`   | 图像提交按钮       | `<input type="image" src="btn.png">`       |

```html
<!-- 文件上传(限制类型和多选) -->
<input type="file" name="photos" accept="image/*" multiple />

<!-- 颜色选择器 -->
<input type="color" name="favorite" value="#ff0000" />

<!-- 复选框 -->
<label>
  <input type="checkbox" name="subscribe" checked /> 订阅 newsletter
</label>

<!-- 单选框组 -->
<label><input type="radio" name="gender" value="male" /> 男</label>
<label><input type="radio" name="gender" value="female" /> 女</label>
```

---

## 表单增强属性

**input 通用属性**

| 属性           | 作用                       | 示例                                |
| -------------- | -------------------------- | ----------------------------------- |
| `placeholder`  | 占位提示文本               | `placeholder="请输入"`              |
| `required`     | 必填                        | `required`                          |
| `autofocus`    | 自动聚焦                   | `autofocus`                         |
| `autocomplete` | 自动补全                   | `autocomplete="off"`                |
| `pattern`      | 正则验证                   | `pattern="[0-9]{6}"`                |
| `min` / `max`  | 数值/日期范围              | `min="1" max="100"`                 |
| `step`         | 步长                       | `step="0.5"`                        |
| `multiple`     | 多选(email/file)           | `multiple`                          |
| `size`         | 宽度(字符数)               | `size="30"`                         |
| `maxlength`    | 最大字符数                 | `maxlength="50"`                    |
| `minlength`    | 最小字符数                 | `minlength="6"`                     |
| `readonly`     | 只读                       | `readonly`                          |
| `disabled`     | 禁用                       | `disabled`                          |
| `value`        | 默认值                     | `value="default"`                   |
| `list`         | 关联 datalist              | `list="browsers"`                   |
| `form`         | 指定所属表单              | `form="formId"`                     |

```html
<!-- 综合验证属性 -->
<input
  type="text"
  name="username"
  placeholder="请输入用户名"
  required
  minlength="6"
  maxlength="20"
  pattern="^[a-zA-Z0-9_]+$"
  autofocus
  autocomplete="username"
/>
```

---

## 表单元素

**label 标签**
`<label for="<控件ID>">[文本]</label>` 或 `<label>[控件 + 文本]</label>`
```html
<!-- 显式关联 -->
<label for="username">用户名:</label>
<input type="text" id="username" name="username" />

<!-- 隐式关联 -->
<label>
  <input type="checkbox" name="agree" /> 我同意条款
</label>
```

**select 下拉框**
`<select name="<名称>" [multiple] [size="<可见行数>"] [required]>...<option>...</select>`
```html
<select name="country" required>
  <option value="">请选择</option>
  <option value="cn">中国</option>
  <option value="us" selected>美国</option>
</select>

<!-- 分组 -->
<select name="city">
  <optgroup label="华东">
    <option value="sh">上海</option>
    <option value="hz">杭州</option>
  </optgroup>
  <optgroup label="华北">
    <option value="bj">北京</option>
  </optgroup>
</select>

<!-- 多选 -->
<select name="hobbies" multiple size="4">
  <option value="reading">阅读</option>
  <option value="music">音乐</option>
</select>
```

**option 选项**
`<option value="<值>" [selected] [disabled]>[文本]</option>`

**textarea 多行文本**
`<textarea name="<名称>" [rows="<行数>"] [cols="<列数>"] [maxlength] [required] [placeholder]></textarea>`
```html
<textarea name="message" rows="4" cols="50" placeholder="请输入留言" maxlength="500"></textarea>
```

**button 按钮**
`<button type="submit|reset|button" [name] [value]>[内容]</button>`
```html
<button type="submit">提交</button>
<button type="reset">重置</button>
<button type="button" onclick="alert('hi')">点击</button>
```

**fieldset 与 legend 分组**
`<fieldset [disabled]><legend>[标题]</legend>...</fieldset>`
```html
<fieldset>
  <legend>个人信息</legend>
  <label>姓名:<input type="text" name="name" /></label>
  <label>年龄:<input type="number" name="age" /></label>
</fieldset>
```

**datalist 输入建议**
`<input list="<ID>" />` + `<datalist id="<ID>">...<option>...</datalist>`
```html
<input type="text" list="browsers" name="browser" />
<datalist id="browsers">
  <option value="Chrome"></option>
  <option value="Firefox"></option>
  <option value="Safari"></option>
</datalist>
```

**output 输出结果**
`<output for="<关联ID>" name="<名称>">[结果]</output>`
```html
<form oninput="result.value=parseInt(a.value)+parseInt(b.value)">
  <input type="number" id="a" value="10" />
  +<input type="number" id="b" value="20" />
  =<output name="result" for="a b">30</output>
</form>
```

---

## 客户端验证

**内置验证类型**

| 验证类型     | 触发属性                    | 示例                              |
| ------------ | --------------------------- | --------------------------------- |
| 必填         | `required`                  | `<input required>`                |
| 邮箱格式     | `type="email"`              | `<input type="email">`            |
| URL 格式     | `type="url"`                | `<input type="url">`              |
| 数值范围     | `min` / `max`               | `<input min="1" max="100">`       |
| 长度限制     | `minlength` / `maxlength`   | `<input minlength="6">`           |
| 正则模式     | `pattern`                   | `<input pattern="[0-9]{6}">`      |
| 步长         | `step`                      | `<input step="0.5">`              |

**ValidityState API**
```javascript
const input = document.querySelector('input');

// 验证状态对象
const validity = input.validity;
console.log(validity.valid);           // 是否有效
console.log(validity.valueMissing);    // required 未填
console.log(validity.typeMismatch);    // 类型不匹配(email/url)
console.log(validity.patternMismatch); // pattern 不匹配
console.log(validity.tooShort);        // 长度小于 minlength
console.log(validity.tooLong);         // 长度大于 maxlength
console.log(validity.rangeUnderflow);  // 小于 min
console.log(validity.rangeOverflow);   // 大于 max
console.log(validity.stepMismatch);    // 步长不匹配
console.log(validity.badInput);        // 输入无效(如 number 中输入字母)
console.log(validity.customError);     // 自定义错误

// 验证方法
input.checkValidity();     // 触发验证,返回布尔值
input.reportValidity();    // 触发验证并显示错误
input.setCustomValidity('错误消息'); // 设置自定义错误
input.setCustomValidity('');         // 清除自定义错误

// 错误消息
console.log(input.validationMessage);
```

**自定义验证示例**
```javascript
// 密码确认验证
const password = document.getElementById('password');
const confirm = document.getElementById('confirmPassword');

confirm.addEventListener('input', () => {
  if (password.value !== confirm.value) {
    confirm.setCustomValidity('两次输入的密码不一致');
  } else {
    confirm.setCustomValidity('');
  }
});
```

---

## 表单事件

**表单相关事件**
```javascript
const form = document.querySelector('form');
const input = document.querySelector('input');

// 表单提交
form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
  }
});

// 输入变化(实时)
input.addEventListener('input', (e) => {
  console.log(e.target.value);
});

// 值变化(失焦后)
input.addEventListener('change', (e) => {
  console.log(e.target.value);
});

// 无效字段
input.addEventListener('invalid', (e) => {
  e.target.setCustomValidity('请填写此字段');
});

// 表单重置
form.addEventListener('reset', () => {
  console.log('表单已重置');
});
```

| 事件      | 触发时机                |
| --------- | ----------------------- |
| `submit`  | 表单提交                |
| `reset`   | 表单重置                |
| `input`   | 输入变化(实时)         |
| `change`  | 值变化且失焦            |
| `invalid` | 验证失败                |
| `focus`   | 获得焦点                |
| `blur`    | 失去焦点                |

---

## FormData API

**表单数据收集**
```javascript
const form = document.querySelector('form');

// 从表单创建 FormData
const formData = new FormData(form);

// 读取字段
console.log(formData.get('username'));
console.log(formData.getAll('hobbies'));

// 添加字段
formData.append('key', 'value');
formData.append('file', fileInput.files[0]);

// 修改字段
formData.set('key', 'new-value');

// 删除字段
formData.delete('key');

// 遍历
for (const [key, value] of formData.entries()) {
  console.log(key, value);
}

// 通过 fetch 提交
fetch('/api/submit', {
  method: 'POST',
  body: formData
});
```
