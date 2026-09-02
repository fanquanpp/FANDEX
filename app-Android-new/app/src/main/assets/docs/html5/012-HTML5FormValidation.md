---
order: 120
title: HTML5 表单与验证
module: 'html5'
category: 前端技术
difficulty: intermediate
description: 表单控件、输入类型、内建验证与自定义校验。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'html5/010-SemanticTag'
  - 'html5/011-Accessibility'
  - 'html5/013-HTML5MultimediaCanvasDrawing'
  - 'html5/014-DocTypeDeclaration'
prerequisites: []
---

## 0. 表单是什么？——生活中的“登记表”

你在生活中一定填过纸质登记表：姓名、电话、性别、备注……然后交给前台。

网页表单就是电子版的登记表。用户在网页上填写信息，点击“提交”，数据就发送到了服务器。

| 纸质登记表 | 网页表单 |
| --- | --- |
| 姓名填空 | `<input type="text">` |
| 性别勾选（男/女） | `<input type="radio">` |
| 备注栏（多行） | `<textarea>` |
| 提交按钮 | `<button type="submit">` |

这节课的目标：学会用 HTML 搭建一个能填、能提交、能自动检查错漏的网页表单。

## 1. 表单基础

表单是网页中用于收集用户输入的重要组件，HTML5 提供了丰富的表单元素和验证功能。

### 1.1 表单结构

一个基本的表单结构包含以下元素：

```html
<form action="submit.php" method="post">
  <!-- 表单元素 -->
  <input type="text" name="username" placeholder="用户名" />
  <input type="password" name="password" placeholder="密码" />
  <button type="submit">提交</button>
</form>
```

**属性说明**：

- `action`: 指定表单提交的目标 URL
- `method`: 指定表单提交的 HTTP 方法（`get` 或 `post`）
- `enctype`: 指定表单数据的编码方式，用于文件上传时设置为 `multipart/form-data`
- `autocomplete`: 指定是否启用自动补全功能
- `novalidate`: 禁用浏览器的原生验证

### 1.2 提交的底层本质：GET、POST 与 enctype

提交按钮按下后，浏览器要做两件事：决定"把数据送到哪"（`action`），决定"怎么送"（`method` + `enctype`）。这决定了数据包长什么样。

**GET 与 POST 的区别：**

| 对比项 | GET | POST |
| --- | --- | --- |
| 数据放在哪 | 拼在 URL 问号后面（查询串） | 放在 HTTP 请求体里 |
| 浏览器地址栏 | 能看到全部参数 | 看不到 |
| 数据长度限制 | 有（URL 有上限） | 几乎没有 |
| 幂等性 | 适合查询、跳转 | 适合提交、修改、上传 |
| 典型场景 | 搜索、翻页、筛选 | 登录、注册、文件上传 |

**enctype 三个取值：**

| enctype | 作用 | 何时用 |
| --- | --- | --- |
| `application/x-www-form-urlencoded` | 默认值：把表单字段编码成 `name=value&name=value` | 普通文本表单 |
| `multipart/form-data` | 按"边界分隔符"分段组装，每个字段一段 | 必须用：包含 `<input type="file">` 的表单 |
| `text/plain` | 纯文本，基本已废弃 | 不要用 |

**为什么上传文件必须 POST + multipart：** URL 编码只能安全传输文本字符，文件是二进制数据（图片、压缩包），硬塞进 `name=value` 串会损坏；`multipart/form-data` 用边界分隔符把每个字段（含文件二进制）切成独立片段，浏览器原样传输。类比：普通表单是"写在明信片上"，文件上传是"寄快递包裹"——明信片写不下，必须用带分区的包裹。

**零基础验证实验：** 打开 F12 的 Network 面板，提交一个 GET 表单，看请求 URL 尾部出现 `?username=...&password=...`；再提交一个带文件输入框的 POST 表单，看请求头里的 `Content-Type: multipart/form-data; boundary=...`。

## 2. 输入类型

HTML5 引入了多种新的输入类型，用于更精确地收集用户输入并提供更好的用户体验。

### 2.1 常用输入类型

输入类型不需要全部背下来，先掌握“必背”的 5 种，其余用到再查。

第一级：必背（每页必用）

| 输入类型         | 描述                                 | 示例                                                   |
| ---------------- | ------------------------------------ | ------------------------------------------------------ |
| `text`           | 文本输入框                           | `<input type="text" name="username">`                  |
| `password`       | 密码输入框                           | `<input type="password" name="password">`              |
| `email`          | 邮箱输入框，自动验证邮箱格式         | `<input type="email" name="email">`                    |
| `number`         | 数字输入框，支持数值验证             | `<input type="number" name="age" min="1" max="120">`   |
| `submit`         | 提交按钮                             | `<button type="submit">提交</button>`                  |

第二级：知道即可（用到再查）

| 输入类型         | 描述                                 | 示例                                                   |
| ---------------- | ------------------------------------ | ------------------------------------------------------ |
| `url`            | URL 输入框，自动验证 URL 格式        | `<input type="url" name="website">`                    |
| `range`          | 滑动条，用于选择范围内的值           | `<input type="range" name="volume" min="0" max="100">` |
| `date`           | 日期选择器，选择年、月、日           | `<input type="date" name="birthday">`                  |
| `month`          | 月份选择器，选择年、月               | `<input type="month" name="expiry">`                   |
| `week`           | 周选择器，选择年、周                 | `<input type="week" name="week">`                      |
| `time`           | 时间选择器，选择时、分               | `<input type="time" name="meeting-time">`              |
| `datetime-local` | 日期时间选择器，选择本地日期和时间   | `<input type="datetime-local" name="event-time">`      |
| `color`          | 颜色选择器                           | `<input type="color" name="favorite-color">`           |
| `search`         | 搜索输入框，通常带有清除按钮         | `<input type="search" name="query">`                   |
| `tel`            | 电话输入框，在移动设备上显示数字键盘 | `<input type="tel" name="phone">`                      |
| `file`           | 文件上传输入框                       | `<input type="file" name="avatar">`                    |
| `checkbox`       | 复选框，可多选                       | `<input type="checkbox" name="hobby" value="music">`   |
| `radio`          | 单选按钮，一组只能选一个             | `<input type="radio" name="gender" value="male">`      |

讲解：第一级的 5 种类型覆盖绝大多数表单；第二级了解存在即可，遇到对应需求时再查文档。

### 2.2 输入类型示例

```html
<!-- 邮箱输入 -->
<label for="email">邮箱:</label>
<input type="email" id="email" name="email" required />
<!-- 数字输入 -->
<label for="age">年龄:</label>
<input type="number" id="age" name="age" min="1" max="120" step="1" />
<!-- 日期选择 -->
<label for="birthday">生日:</label>
<input type="date" id="birthday" name="birthday" />
<!-- 颜色选择 -->
<label for="color">喜欢的颜色:</label>
<input type="color" id="color" name="color" value="#ff0000" />
<!-- 范围输入 -->
<label for="volume">音量:</label>
<input type="range" id="volume" name="volume" min="0" max="100" value="50" />
<span id="volume-value">50</span>
<script>
  // 实时显示范围输入的值
  const volumeInput = document.getElementById('volume');
  const volumeValue = document.getElementById('volume-value');
  volumeInput.addEventListener('input', function () {
    volumeValue.textContent = this.value;
  });
</script>
```

**讲解：**

- `type="email"` 自动校验邮箱格式，`required` 让空值无法通过校验；
- `type="number"` 配合 `min`/`max`/`step` 限制数值范围与步长；
- 每个输入框都应配 `label`，通过 `for` 指向 `id`，点击文字即可聚焦；
- `range` 滑块本身不显示数值，示例用 `input` 事件把当前值实时写回页面。

## 3. 表单增强属性

HTML5 为表单元素提供了多种增强属性，用于改善用户体验和数据验证。

### 3.1 常用表单属性

| 属性           | 描述                                 | 示例                                             |
| -------------- | ------------------------------------ | ------------------------------------------------ |
| `placeholder`  | 输入框的提示文本                     | `<input type="text" placeholder="请输入用户名">` |
| `required`     | 标记为必填项                         | `<input type="text" required>`                   |
| `autofocus`    | 页面加载时自动聚焦                   | `<input type="text" autofocus>`                  |
| `autocomplete` | 启用或禁用自动补全                   | `<input type="text" autocomplete="on">`          |
| `pattern`      | 使用正则表达式验证输入               | `<input type="text" pattern="[A-Za-z0-9]{6,}">`  |
| `min` / `max`  | 设置数值或日期的最小值和最大值       | `<input type="number" min="1" max="100">`        |
| `step`         | 设置数值输入的步长                   | `<input type="number" step="0.5">`               |
| `multiple`     | 允许选择多个值（用于文件上传或邮箱） | `<input type="file" multiple>`                   |
| `size`         | 设置输入框的宽度（以字符为单位）     | `<input type="text" size="30">`                  |
| `maxlength`    | 设置输入的最大字符数                 | `<input type="text" maxlength="50">`             |
| `minlength`    | 设置输入的最小字符数                 | `<input type="text" minlength="6">`              |
| `readonly`     | 设置输入框为只读                     | `<input type="text" readonly value="只读内容">`  |
| `disabled`     | 禁用输入框                           | `<input type="text" disabled>`                   |
| `value`        | 设置输入框的默认值                   | `<input type="text" value="默认值">`             |

### 3.2 属性示例

```html
<!-- 带占位符的输入框 -->
<input type="text" placeholder="请输入用户名" />
<!-- 必填项 -->
<input type="email" required placeholder="请输入邮箱" />
<!-- 自动聚焦 -->
<input type="text" autofocus placeholder="自动聚焦到这里" />
<!-- 正则表达式验证 -->
<input type="text" pattern="^[0-9]{6}$" placeholder="请输入6位数字" />
<!-- 数值范围 -->
<input type="number" min="0" max="100" step="5" placeholder="0-100之间的数字" />
<!-- 多个文件上传 -->
<input type="file" multiple accept="image/*" />
```

**讲解：**

- `placeholder` 是输入框内的灰色提示，不能替代 `label` 的可访问名称；
- `autofocus` 让页面加载后自动聚焦到该输入框，适合搜索框等场景；
- `pattern="^[0-9]{6}$"` 用正则限定输入内容，这里要求恰好 6 位数字；
- `multiple` + `accept="image/*"` 表示可多选图片文件。

## 4. 表单元素

### 4.1 基本表单元素

| 元素         | 描述           | 示例                                                               |
| ------------ | -------------- | ------------------------------------------------------------------ |
| `<form>`     | 表单容器       | `<form action="submit.php" method="post">...</form>`               |
| `<input>`    | 输入控件       | `<input type="text" name="username">`                              |
| `<label>`    | 输入控件的标签 | `<label for="username">用户名:</label>`                            |
| `<select>`   | 下拉选择框     | `<select name="country"><option value="cn">中国</option></select>` |
| `<textarea>` | 多行文本输入   | `<textarea name="message" rows="4" cols="50"></textarea>`          |
| `<button>`   | 按钮           | `<button type="submit">提交</button>`                              |
| `<fieldset>` | 表单分组       | `<fieldset><legend>个人信息</legend>...</fieldset>`                |
| `<legend>`   | 字段集的标题   | `<fieldset><legend>个人信息</legend>...</fieldset>`                |
| `<datalist>` | 输入建议列表   | `<input list="browsers"><datalist id="browsers">...</datalist>`    |
| `<output>`   | 计算结果输出   | `<output for="num1 num2">结果</output>`                            |

### 4.2 表单元素示例

#### 4.2.1 下拉选择框

```html
<label for="country">国家:</label>
<select id="country" name="country">
  <option value="">请选择</option>
  <option value="cn">中国</option>
  <option value="us">美国</option>
  <option value="jp">日本</option>
  <option value="kr">韩国</option>
</select>
<!-- 多选下拉框 -->
<label for="hobbies">爱好:</label>
<select id="hobbies" name="hobbies" multiple size="3">
  <option value="reading">阅读</option>
  <option value="music">音乐</option>
  <option value="sports">运动</option>
  <option value="travel">旅行</option>
</select>
```

**讲解：**

- `<select>` 是下拉选择框，`<option>` 的 `value` 是提交值，可见文本可与之不同；
- 首项 `value=""` 配合 `required` 可强制用户做出选择；
- `multiple` 让下拉变成多选列表，`size="3"` 控制同时可见的行数。

#### 4.2.2 文本域

```html
<label for="message">留言:</label>
<textarea id="message" name="message" rows="4" cols="50" placeholder="请输入您的留言"></textarea>
```

**讲解：**

- `<textarea>` 是多行文本输入，`rows`/`cols` 控制默认显示的行数与列数；
- 与 `input` 不同，它的初始内容写在标签之间而不是 `value` 属性里；
- 实际项目中通常用 CSS 控制尺寸，`rows`/`cols` 只作为无样式时的兜底。

#### 4.2.3 按钮

```html
<!-- 提交按钮 -->
<button type="submit">提交</button>
<!-- 重置按钮 -->
<button type="reset">重置</button>
<!-- 普通按钮 -->
<button type="button" onclick="alert('点击了按钮')">点击我</button>
```

**讲解：**

- `type="submit"` 提交表单，`type="reset"` 重置为初始值，`type="button"` 无默认行为；
- 按钮放在表单外时默认类型可能不触发提交，显式写明 `type` 更稳妥；
- 现代开发推荐用 `addEventListener` 绑定点击，避免内联 `onclick`。

#### 4.2.4 字段集

```html
<fieldset>
  <legend>个人信息</legend>
  <div>
    <label for="name">姓名:</label>
    <input type="text" id="name" name="name" />
  </div>
  <div>
    <label for="age">年龄:</label>
    <input type="number" id="age" name="age" />
  </div>
</fieldset>
```

**讲解：**

- `fieldset` 把相关控件分组，`legend` 提供分组标题；
- 单选按钮组放在同一 `fieldset` 内，读屏用户能听清选项归属；
- 分组让长表单的视觉与语义结构都更清晰。

#### 4.2.5 输入建议列表

```html
<label for="browser">浏览器:</label>
<input type="text" id="browser" name="browser" list="browsers" />
<datalist id="browsers">
  <option value="Chrome"></option>
  <option value="Firefox"></option>
  <option value="Safari"></option>
  <option value="Edge"></option>
  <option value="Opera"></option>
</datalist>
```

**讲解：**

- `datalist` 为输入框提供候选建议，但用户仍可自由输入；
- `input` 通过 `list="browsers"` 引用 `datalist` 的 `id`；
- 它不同于 `select`：`select` 限制选择，`datalist` 只做提示。

## 5. 客户端验证

HTML5 提供了强大的原生客户端验证功能，无需 JavaScript 即可实现基本的数据验证。

### 5.1 内置验证类型

| 验证类型     | 描述                       | 示例                                               |
| ------------ | -------------------------- | -------------------------------------------------- |
| 必填验证     | 确保字段不为空             | `<input type="text" required>`                     |
| 邮箱验证     | 确保输入是有效的邮箱地址   | `<input type="email">`                             |
| URL验证      | 确保输入是有效的URL        | `<input type="url">`                               |
| 数值范围验证 | 确保数值在指定范围内       | `<input type="number" min="1" max="100">`          |
| 长度验证     | 确保输入的长度在指定范围内 | `<input type="text" minlength="6" maxlength="20">` |
| 模式验证     | 使用正则表达式验证输入     | `<input type="text" pattern="[A-Za-z0-9]{6,}">`    |

### 5.2 验证示例

```html
<!-- 第 1 步：最简单的验证——只要 6 位数字 -->
<input type="text" pattern="[0-9]{6}" placeholder="请输入6位数字" />

<!-- 第 2 步：稍微复杂一点——字母开头，后面跟 5 位数字 -->
<input type="text" pattern="[A-Za-z][0-9]{5}" placeholder="1个字母+5个数字" />

<!-- 第 3 步：真实场景——必填、长度、格式交给原生属性组合 -->
<input type="email" required placeholder="邮箱会由浏览器自动校验格式" />
<input type="text" required minlength="6" maxlength="20" placeholder="用户名 6-20 位" />
```

**讲解：**

- `pattern` 的值是“正则表达式”，可以理解成“输入格式的说明书”：`[0-9]{6}` 表示“6 个数字”，`[A-Za-z]` 表示“1 个字母”；
- 复杂密码规则（同时要求大小写字母和数字）留到进阶章节用 JavaScript 实现，入门阶段先用简单正则；
- `required`/`minlength`/`maxlength` 都是声明式校验，浏览器原生执行，提交时自动拦截，无需手写 `if` 判断。

### 5.3 自定义验证消息

可以使用 JavaScript 自定义验证消息，提供更友好的错误提示。

```html
<form id="registrationForm">
  <div>
    <label for="username">用户名:</label>
    <input type="text" id="username" name="username" required minlength="6" />
    <div class="error" id="usernameError"></div>
  </div>
  <button type="submit">提交</button>
</form>
<script>
  const form = document.getElementById('registrationForm');
  const username = document.getElementById('username');
  const usernameError = document.getElementById('usernameError');
  username.addEventListener('input', function () {
    if (username.validity.valid) {
      usernameError.textContent = '';
      usernameError.className = 'error';
    } else {
      showError();
    }
  });
  form.addEventListener('submit', function (event) {
    if (!username.validity.valid) {
      showError();
      event.preventDefault();
    }
  });
  function showError() {
    if (username.validity.valueMissing) {
      usernameError.textContent = '请输入用户名';
    } else if (username.validity.tooShort) {
      usernameError.textContent = `用户名长度至少为 ${username.minLength} 个字符`;
    }
    usernameError.className = 'error active';
  }
</script>
    <!-- 样式将在后续 CSS 课程中学习，本示例只保留 HTML 结构与验证逻辑 -->
```

**讲解：**

- `input` 事件在每次输入时触发，可实时清除或显示错误；
- `validity` 对象暴露校验状态：`valueMissing` 表示空值，`tooShort` 表示长度不足；
- 提交时再次检查并 `preventDefault()` 拦截无效表单，错误文本写入页面的 `error` 容器；
- 示例中的错误样式依赖 CSS 类，样式部分将在后续 CSS 课程中学习。

### 5.4 表单验证 API

HTML5 提供了表单验证 API，用于在 JavaScript 中进行更复杂的验证。

| 属性/方法                    | 描述                         |
| ---------------------------- | ---------------------------- |
| `validity`                   | 返回元素的验证状态对象       |
| `validationMessage`          | 返回元素的验证错误消息       |
| `checkValidity()`            | 检查元素是否有效，返回布尔值 |
| `setCustomValidity(message)` | 设置自定义验证错误消息       |
| **示例**：                   |

```html
<form id="form">
  <div>
    <label for="password">密码:</label>
    <input type="password" id="password" name="password" required minlength="8" />
  </div>
  <div>
    <label for="confirmPassword">确认密码:</label>
    <input type="password" id="confirmPassword" name="confirmPassword" required />
  </div>
  <button type="submit">提交</button>
</form>
<script>
  const form = document.getElementById('form');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  form.addEventListener('submit', function (event) {
    if (password.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity('两次输入的密码不一致');
      event.preventDefault();
    } else {
      confirmPassword.setCustomValidity('');
    }
  });
  confirmPassword.addEventListener('input', function () {
    if (password.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity('两次输入的密码不一致');
    } else {
      confirmPassword.setCustomValidity('');
    }
  });
</script>
```

**讲解：**

- `setCustomValidity('消息')` 给元素设置自定义错误，传入空字符串则清除错误；
- 密码一致性是“跨字段校验”，原生约束无法表达，必须用 JS 对比两个输入框的值；
- 每次输入都要重新校验，否则错误状态会一直停留在上次的判定结果上。

## 6. 实际应用示例

### 6.1 示例 1：注册表单（纯 HTML + 原生验证）

先看“不写任何 JavaScript”的版本，验证完全由浏览器原生完成：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>用户注册</title>
    <!-- 本示例不写 JavaScript，也不写 CSS，验证全部由浏览器原生完成 -->
  </head>
  <body>
    <h1>用户注册</h1>
    <form action="/register" method="post">
      <div>
        <label for="username">用户名:</label>
        <input type="text" id="username" name="username" required minlength="4" maxlength="16" />
      </div>
      <div>
        <label for="email">邮箱:</label>
        <input type="email" id="email" name="email" required />
      </div>
      <div>
        <label for="password">密码:</label>
        <input type="password" id="password" name="password" required minlength="8" />
      </div>
      <div>
        <label for="age">年龄:</label>
        <input type="number" id="age" name="age" required min="18" max="120" />
      </div>
      <button type="submit">提交注册</button>
    </form>
  </body>
</html>
```

**讲解：**

- 这个表单一行 JavaScript 都没有，验证完全靠 `required`、`minlength`、`type="email"`、`min`/`max` 等原生属性；
- 空值、短用户名、错误邮箱、越界年龄都会在点击提交时被浏览器自动拦截并给出提示；
- 表单提交后会跳转到 `action` 指定的地址（这里仅作演示），真正的数据发送在 JavaScript 课程中学习。

### 6.2 示例 2：注册表单 JS 增强版（进阶，了解即可）

> 以下代码在纯 HTML 基础上加入了 JavaScript 增强验证（实时提示、两次密码一致等），属于进阶内容，入门阶段了解即可。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>用户注册</title>
    <!-- 样式将在后续 CSS 课程中学习，本示例只保留 HTML 结构与验证逻辑 -->
  </head>
  <body>
    <div class="container">
      <h1>用户注册</h1>
      <form id="registrationForm">
        <div class="form-group">
          <label for="username">用户名:</label>
          <input type="text" id="username" name="username" required minlength="6" maxlength="20" />
          <div class="error" id="usernameError"></div>
        </div>
        <div class="form-group">
          <label for="email">邮箱:</label>
          <input type="email" id="email" name="email" required />
          <div class="error" id="emailError"></div>
        </div>
        <div class="form-group">
          <label for="password">密码:</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            minlength="8"
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
          />
          <small>密码必须包含至少一个大写字母、一个小写字母和一个数字</small>
          <div class="error" id="passwordError"></div>
        </div>
        <div class="form-group">
          <label for="confirmPassword">确认密码:</label>
          <input type="password" id="confirmPassword" name="confirmPassword" required />
          <div class="error" id="confirmPasswordError"></div>
        </div>
        <div class="form-group">
          <label for="gender">性别:</label>
          <select id="gender" name="gender" required>
            <option value="">请选择</option>
            <option value="male">男</option>
            <option value="female">女</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="form-group">
          <label for="birthday">生日:</label>
          <input type="date" id="birthday" name="birthday" required />
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" name="terms" required />
            我同意<a href="#">服务条款</a>和<a href="#">隐私政策</a>
          </label>
          <div class="error" id="termsError"></div>
        </div>
        <button type="submit">注册</button>
      </form>
    </div>
    <script>
      const form = document.getElementById('registrationForm');
      const username = document.getElementById('username');
      const email = document.getElementById('email');
      const password = document.getElementById('password');
      const confirmPassword = document.getElementById('confirmPassword');
      const terms = document.querySelector('input[name="terms"]');
      const usernameError = document.getElementById('usernameError');
      const emailError = document.getElementById('emailError');
      const passwordError = document.getElementById('passwordError');
      const confirmPasswordError = document.getElementById('confirmPasswordError');
      const termsError = document.getElementById('termsError');
      // 实时验证
      username.addEventListener('input', function () {
        validateField(username, usernameError, {
          valueMissing: '请输入用户名',
          tooShort: `用户名长度至少为 ${username.minLength} 个字符`,
          tooLong: `用户名长度不能超过 ${username.maxLength} 个字符`,
        });
      });
      email.addEventListener('input', function () {
        validateField(email, emailError, {
          valueMissing: '请输入邮箱',
          typeMismatch: '请输入有效的邮箱地址',
        });
      });
      password.addEventListener('input', function () {
        validateField(password, passwordError, {
          valueMissing: '请输入密码',
          tooShort: `密码长度至少为 ${password.minLength} 个字符`,
          patternMismatch: '密码必须包含至少一个大写字母、一个小写字母和一个数字',
        });
      });
      confirmPassword.addEventListener('input', function () {
        if (confirmPassword.value !== password.value) {
          confirmPasswordError.textContent = '两次输入的密码不一致';
          confirmPasswordError.className = 'error';
        } else {
          confirmPasswordError.textContent = '';
        }
      });
      terms.addEventListener('input', function () {
        if (!terms.checked) {
          termsError.textContent = '请同意服务条款和隐私政策';
        } else {
          termsError.textContent = '';
        }
      });
      // 表单提交验证
      form.addEventListener('submit', function (event) {
        let isValid = true;
        isValid &= validateField(username, usernameError, {
          valueMissing: '请输入用户名',
          tooShort: `用户名长度至少为 ${username.minLength} 个字符`,
          tooLong: `用户名长度不能超过 ${username.maxLength} 个字符`,
        });
        isValid &= validateField(email, emailError, {
          valueMissing: '请输入邮箱',
          typeMismatch: '请输入有效的邮箱地址',
        });
        isValid &= validateField(password, passwordError, {
          valueMissing: '请输入密码',
          tooShort: `密码长度至少为 ${password.minLength} 个字符`,
          patternMismatch: '密码必须包含至少一个大写字母、一个小写字母和一个数字',
        });
        if (confirmPassword.value !== password.value) {
          confirmPasswordError.textContent = '两次输入的密码不一致';
          confirmPasswordError.className = 'error';
          isValid = false;
        } else {
          confirmPasswordError.textContent = '';
        }
        if (!terms.checked) {
          termsError.textContent = '请同意服务条款和隐私政策';
          isValid = false;
        } else {
          termsError.textContent = '';
        }
        if (!isValid) {
          event.preventDefault();
        } else {
          // 模拟表单提交
          event.preventDefault();
          alert('注册成功！');
        }
      });
      // 验证函数
      function validateField(field, errorElement, messages) {
        if (field.validity.valid) {
          errorElement.textContent = '';
          return true;
        } else {
          for (const [key, message] of Object.entries(messages)) {
            if (field.validity[key]) {
              errorElement.textContent = message;
              break;
            }
          }
          return false;
        }
      }
    </script>
  </body>
</html>
```

**代码结构解析：**

（1）表单结构：`registrationForm` 聚合用户名、邮箱、密码、确认密码、性别、生日等字段，每个字段都是“`label` + `input` + 错误提示容器”三件套；

（2）声明式校验：`required`、`minlength`、`pattern` 等属性由浏览器原生执行，无需 JavaScript；

（3）提交拦截：`submit` 事件中统一检查各字段的 `validity`，任一字段无效就 `preventDefault()` 阻止提交；

（4）实时反馈：`input` 事件在用户输入时即时校验并更新错误文本，让用户“边输入边纠错”。

### 6.3 示例 3：联系表单（进阶，了解即可）

> 联系表单同样使用 JavaScript 模拟异步提交，属于进阶内容，入门阶段只需看懂结构与 `FormData` 的用法。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>联系我们</title>
    <!-- 样式将在后续 CSS 课程中学习，本示例只保留 HTML 结构与验证逻辑 -->
  </head>
  <body>
    <div class="container">
      <h1>联系我们</h1>
      <form id="contactForm">
        <div class="form-group">
          <label for="name">姓名:</label>
          <input type="text" id="name" name="name" required />
          <div class="error" id="nameError"></div>
        </div>
        <div class="form-group">
          <label for="email">邮箱:</label>
          <input type="email" id="email" name="email" required />
          <div class="error" id="emailError"></div>
        </div>
        <div class="form-group">
          <label for="subject">主题:</label>
          <input type="text" id="subject" name="subject" required minlength="5" />
          <div class="error" id="subjectError"></div>
        </div>
        <div class="form-group">
          <label for="message">留言:</label>
          <textarea id="message" name="message" required minlength="10"></textarea>
          <div class="error" id="messageError"></div>
        </div>
        <button type="submit">发送留言</button>
      </form>
    </div>
    <script>
      const form = document.getElementById('contactForm');
      const name = document.getElementById('name');
      const email = document.getElementById('email');
      const subject = document.getElementById('subject');
      const message = document.getElementById('message');
      const nameError = document.getElementById('nameError');
      const emailError = document.getElementById('emailError');
      const subjectError = document.getElementById('subjectError');
      const messageError = document.getElementById('messageError');
      // 实时验证
      name.addEventListener('input', function () {
        if (name.validity.valid) {
          nameError.textContent = '';
        } else {
          nameError.textContent = '请输入您的姓名';
        }
      });
      email.addEventListener('input', function () {
        if (email.validity.valid) {
          emailError.textContent = '';
        } else if (email.validity.valueMissing) {
          emailError.textContent = '请输入您的邮箱';
        } else if (email.validity.typeMismatch) {
          emailError.textContent = '请输入有效的邮箱地址';
        }
      });
      subject.addEventListener('input', function () {
        if (subject.validity.valid) {
          subjectError.textContent = '';
        } else if (subject.validity.valueMissing) {
          subjectError.textContent = '请输入主题';
        } else if (subject.validity.tooShort) {
          subjectError.textContent = `主题长度至少为 ${subject.minLength} 个字符`;
        }
      });
      message.addEventListener('input', function () {
        if (message.validity.valid) {
          messageError.textContent = '';
        } else if (message.validity.valueMissing) {
          messageError.textContent = '请输入留言内容';
        } else if (message.validity.tooShort) {
          messageError.textContent = `留言长度至少为 ${message.minLength} 个字符`;
        }
      });
      // 表单提交验证
      form.addEventListener('submit', function (event) {
        let isValid = true;
        if (!name.validity.valid) {
          nameError.textContent = '请输入您的姓名';
          isValid = false;
        }
        if (!email.validity.valid) {
          if (email.validity.valueMissing) {
            emailError.textContent = '请输入您的邮箱';
          } else if (email.validity.typeMismatch) {
            emailError.textContent = '请输入有效的邮箱地址';
          }
          isValid = false;
        }
        if (!subject.validity.valid) {
          if (subject.validity.valueMissing) {
            subjectError.textContent = '请输入主题';
          } else if (subject.validity.tooShort) {
            subjectError.textContent = `主题长度至少为 ${subject.minLength} 个字符`;
          }
          isValid = false;
        }
        if (!message.validity.valid) {
          if (message.validity.valueMissing) {
            messageError.textContent = '请输入留言内容';
          } else if (message.validity.tooShort) {
            messageError.textContent = `留言长度至少为 ${message.minLength} 个字符`;
          }
          isValid = false;
        }
        if (!isValid) {
          event.preventDefault();
        } else {
          // 模拟表单提交
          event.preventDefault();
          alert('留言发送成功！我们会尽快回复您。');
          form.reset();
        }
      });
    </script>
  </body>
</html>
```

**代码结构解析：**

（1）表单结构：联系表单包含姓名、邮箱、主题、留言等字段，字段通过 `name` 属性确定提交参数名；

（2）提交处理：`submit` 事件中阻止默认跳转，改为使用 `FormData` 收集数据，并模拟异步提交；

（3）成功反馈：提交完成后重置表单并显示成功提示，`aria-live` 区域让读屏用户也能听到结果；

（4）示例中的样式依赖 CSS 类，具体美化将在后续 CSS 课程中学习，本课只需关注结构与逻辑。

## 7. 最佳实践

### 7.1 表单设计最佳实践

- **清晰的标签**：为每个输入字段提供清晰、描述性的标签，使用 `<label>` 元素并与输入字段关联。
- **合理的布局**：使用适当的空间和分组来组织表单元素，提高可读性。
- **输入反馈**：提供实时的输入验证反馈，帮助用户及时纠正错误。
- **错误提示**：使用清晰、具体的错误提示信息，告诉用户如何修正错误。
- **响应式设计**：确保表单在不同设备上都能正常显示和使用。
- **可访问性**：确保表单对使用屏幕阅读器的用户友好，使用适当的 ARIA 属性。
- **性能优化**：对于大型表单，考虑使用异步验证和懒加载技术。

### 7.2 验证最佳实践

- **客户端和服务器端验证**：虽然 HTML5 提供了强大的客户端验证，但仍需在服务器端进行验证，以防止恶意提交。
- **合理的验证规则**：设置合理的验证规则，不要过于严格或宽松。
- **友好的错误提示**：提供清晰、具体的错误提示，帮助用户理解并修正错误。
- **实时验证**：使用 JavaScript 实现实时验证，在用户输入过程中提供反馈。
- **自定义验证**：对于复杂的验证需求，使用 JavaScript 自定义验证逻辑。
- **测试**：在不同浏览器和设备上测试表单验证，确保兼容性。

### 7.3 安全性最佳实践

- **防止 XSS 攻击**：对用户输入进行过滤和转义，防止跨站脚本攻击。
- **防止 CSRF 攻击**：使用 CSRF 令牌来防止跨站请求伪造攻击。
- **密码安全**：对于密码字段，使用 `type="password"` 并设置合理的密码强度要求。
- **敏感信息**：对于敏感信息，确保使用 HTTPS 传输。
- **文件上传安全**：对于文件上传，限制文件类型和大小，防止恶意文件上传。

### 7.4 性能最佳实践

- **表单提交优化**：使用 AJAX 提交表单，提高用户体验。
- **数据验证优化**：使用防抖或节流技术，减少验证的频率。
- **资源加载**：优化表单相关的 CSS 和 JavaScript 文件，减少加载时间。
- **缓存**：对于频繁使用的表单数据，考虑使用本地存储进行缓存。

## 8. 进阶知识点

### 8.1 表单事件

```javascript
const form = document.querySelector('form');
const input = document.querySelector('input');

// 表单提交前拦截，统一校验
form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
  }
});

// 输入变化（实时触发）
input.addEventListener('input', (e) => {
  console.log(e.target.value);
});

// 值变化（失焦后才触发）
input.addEventListener('change', (e) => {
  console.log(e.target.value);
});

// 校验失败时触发
input.addEventListener('invalid', (e) => {
  e.target.setCustomValidity('请填写此字段');
});
```

**讲解：**

- `input` 与 `change` 的区别：前者每次击键都触发，后者在值改变且失焦后触发；
- `submit` 事件在点击提交按钮或按回车时触发，`checkValidity()` 返回整个表单是否有效；
- `invalid` 事件在字段校验失败时触发，可在此统一设置自定义错误消息。

| 事件 | 触发时机 |
| --- | --- |
| `submit` | 表单提交 |
| `reset` | 表单重置 |
| `input` | 输入变化（实时） |
| `change` | 值变化且失焦 |
| `invalid` | 校验失败 |
| `focus`/`blur` | 获得/失去焦点 |

### 8.2 FormData API

```javascript
const form = document.querySelector('form');

// 从表单自动收集所有字段
const formData = new FormData(form);

// 读取字段：get 取单个，getAll 取同名多个
console.log(formData.get('username'));
console.log(formData.getAll('hobbies'));

// 追加与修改字段
formData.append('file', fileInput.files[0]);
formData.set('key', 'new-value');

// 遍历全部键值对
for (const [key, value] of formData.entries()) {
  console.log(key, value);
}

// 直接作为 fetch 请求体提交
fetch('/api/submit', {
  method: 'POST',
  body: formData,
});
```

**讲解：**

- `new FormData(form)` 自动收集表单中所有带 `name` 的字段，无需逐个读取；
- `get` 取第一个值，`getAll` 取同名控件的全部值（如多选爱好）；
- `FormData` 可直接作为 `fetch` 的 `body`，浏览器会自动设置 `multipart/form-data` 编码，文件上传也适用。

## 9. 核心知识点

> 一句话记住表单：表单要提交，`action` 和 `method`；`name` 是参数名，`label` 要关联 `id`；必填写 `required`，长度用 `minlength`/`maxlength`；`type` 选 `email` 能校验，`pattern` 写格式。

- 表单三要素：`form`（容器）、控件（`input`/`select`/`textarea` 等）、`button`（触发提交）；
- `name` 属性决定提交参数名，`label` 通过 `for` 关联 `id` 提供可访问名称；
- HTML5 内置校验：`required`、`min/max`、`minlength/maxlength`、`pattern`、`type` 格式校验；
- 校验状态通过 `validity` 对象读取，`setCustomValidity()` 补充自定义错误；
- 跨字段规则（如两次密码一致）必须用 JavaScript 在 `submit` 事件中实现；
- `FormData` 是把表单数据交给 `fetch` 的标准方式。

## 10. 动手试试

### 入门版（必做）

写一个“注册表单”，只使用 HTML5 原生属性：

1. 用户名（必填，长度 4-16 位，用 `minlength`/`maxlength`）；
2. 密码（必填，至少 8 位）；
3. 邮箱（必填，`type="email"`）；
4. 提交按钮；
5. 打开浏览器，测试空值、短密码、错误邮箱格式——观察浏览器的自动报错。

### 进阶版（选做）

在入门版基础上，用 JavaScript 增加“两次密码一致”的校验（参考第 8.1 节）：

1. 增加“确认密码”输入框；
2. 用 `input` 事件实时对比两个输入框的值；
3. 不一致时调用 `setCustomValidity('两次输入的密码不一致')`，提交自动被拦截。

## 11. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 控件缺 `name` | 提交时该字段被忽略，后端收不到数据 | 每个提交控件都写 `name` |
| 校验只做前端 | 前端校验可被绕过，数据不安全 | 后端必须二次校验，前端校验只负责体验 |
| `placeholder` 当标签 | 输入内容后提示消失，读屏不播报 | 用 `label` 提供名称，`placeholder` 只做补充 |
| 密码规则难以表达 | `pattern` 正则复杂难读 | 拆成多个校验并用 `setCustomValidity` 给出明确文案 |
| 错误提示无关联 | 读屏用户不知道错误属于哪个字段 | 用 `aria-describedby` 关联错误容器 |
| 表单提交整页刷新 | 现代 SPA 体验差 | 用 `fetch` + `FormData` 异步提交 |
| 不区分 `input`/`change` | 实时校验与失焦校验行为混乱 | 按场景选择：输入即校验用 `input`，提交时统一校验 |

## 12. 扩展学习

- 交互进阶：`javascript/040-DOMOperationEvent` 全面掌握事件机制；
- 异步提交：`javascript/024-AsyncProgramming` 中 `fetch` 与 `FormData` 的完整用法；
- 后端配合：`sql/` 与 `backend` 模块了解服务端校验与数据存储；
- 无障碍：`html5/010-Accessibility` 中表单与 `aria-describedby` 的规范；
- 校验实践：在真实项目中把“声明式校验 + JS 补充校验 + 后端校验”三层都实现一遍。
