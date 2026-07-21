# 自定义数据属性 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数 | `{ }` 分组 | `|` 或 | `...` 重复

---

## data-* 属性定义

**HTML 自定义数据属性**
`<element data-<name>="<value>">`

```html
<!-- 在 HTML 元素上存储自定义数据 -->
<div
  id="user"
  data-user-id="123"
  data-role="admin"
  data-login-count="42"
  data-last-active="2026-07-20"
>
  用户信息
</div>
```

**命名规则**

| 规则                       | 说明                                              |
| -------------------------- | ------------------------------------------------- |
| 必须以 `data-` 开头         | 前缀标识自定义属性                                |
| 仅允许小写字母、数字、连字符 | 不支持大写字母、下划线、特殊字符                  |
| 不能以连字符开头            | `data--name` 不合法                               |
| 不能以数字开头(连字符后)  | `data-1name` 不合法                               |
| XML 兼容                   | 名称必须符合 XML 规范                             |

---

## JavaScript 访问

**dataset 属性(驼峰命名)**
`element.dataset.<camelCaseName>`

```javascript
const el = document.getElementById('user');

// 读取 data-* 属性(连字符转驼峰)
console.log(el.dataset.userId);      // '123'(对应 data-user-id)
console.log(el.dataset.role);        // 'admin'
console.log(el.dataset.loginCount);  // '42'(对应 data-login-count)

// 设置 data-* 属性
el.dataset.active = 'true';          // 添加 data-active="true"
el.dataset.lastLogin = '2026-07-20'; // 添加 data-last-login

// 删除 data-* 属性
delete el.dataset.role;              // 移除 data-role
```

**getAttribute / setAttribute 方法**
`element.getAttribute('data-<name>')`

```javascript
const el = document.getElementById('user');

// 读取属性(原始连字符格式)
const userId = el.getAttribute('data-user-id'); // '123'

// 设置属性
el.setAttribute('data-user-id', '456');

// 判断属性是否存在
const hasRole = el.hasAttribute('data-role'); // true / false

// 删除属性
el.removeAttribute('data-role');
```

**dataset vs getAttribute 对比**

| 特性                | `dataset`                | `getAttribute / setAttribute` |
| ------------------- | ------------------------ | ----------------------------- |
| 属性名格式          | 驼峰(`userId`)          | 连字符(`data-user-id`)       |
| 性能                | 略慢                     | 略快                          |
| 类型                | DOMStringMap 对象        | 字符串                        |
| IE 支持             | IE11+                    | 所有版本                      |
| 推荐场景            | 现代 Web 应用            | 兼容旧浏览器                  |

---

## CSS 访问

**属性选择器**
`[data-<name>] | [data-<name>="<value>"]`

```css
/* 通过 data-* 属性选择元素 */
[data-role='admin'] {
  background-color: gold;
  font-weight: bold;
}

[data-role='user'] {
  background-color: #f0f0f0;
}

/* 仅判断属性存在性 */
[data-featured] {
  border: 2px solid blue;
}
```

**content 与 attr()**
`content: attr(data-<name>)`

```css
/* 使用 attr() 在 CSS 中读取 data-* 值 */
.tooltip::after {
  content: attr(data-tooltip);
  display: none;
  padding: 8px;
  background: #333;
  color: #fff;
  border-radius: 4px;
  position: absolute;
  top: 100%;
  left: 0;
}

.tooltip:hover::after {
  display: block;
}
```

```html
<!-- 配合 CSS 实现纯 CSS 提示框 -->
<button class="tooltip" data-tooltip="点击此处提交表单">提交</button>
```

**data-* 配合 CSS 状态切换**

```css
/* 通过 data-* 控制 Tab 切换 */
.tab-panel {
  display: none;
}

[data-active='true'].tab-panel {
  display: block;
}
```

```html
<div class="tab-panel" data-active="true">面板1</div>
<div class="tab-panel" data-active="false">面板2</div>
```

---

## 事件委托应用

**事件委托模式**
`container.addEventListener('click', handler)`

```html
<!-- 列表项通过 data-* 存储用户数据 -->
<ul id="user-list">
  <li data-user-id="1" data-name="张三" data-role="admin">张三</li>
  <li data-user-id="2" data-name="李四" data-role="user">李四</li>
  <li data-user-id="3" data-name="王五" data-role="user">王五</li>
</ul>
```

```javascript
// 事件委托:在父元素上监听,通过 data-* 获取数据
document.getElementById('user-list').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;

  console.log(`用户 ID: ${li.dataset.userId}`);
  console.log(`用户名: ${li.dataset.name}`);
  console.log(`角色: ${li.dataset.role}`);

  // 根据 data-* 执行不同操作
  if (li.dataset.role === 'admin') {
    showAdminPanel(li.dataset.userId);
  } else {
    showUserProfile(li.dataset.userId);
  }
});
```

---

## 类型转换

**手动类型转换**

```javascript
const el = document.getElementById('user');

// 字符串转数字
const userId = parseInt(el.dataset.userId, 10);      // 123
const loginCount = Number(el.dataset.loginCount);    // 42

// 字符串转布尔
const isActive = el.dataset.active === 'true';       // true

// 字符串转对象(需 JSON.parse)
const data = JSON.parse(el.dataset.config);          // 对象

// 存储对象需先序列化
el.dataset.user = JSON.stringify({ name: '张三', age: 25 });
const user = JSON.parse(el.dataset.user);
```

---

## 注意事项

- **字符串类型**:data-* 值始终是字符串,使用时需手动类型转换
- **大小限制**:不适合存储大量数据,大数据请用 `WeakMap` 或 `IndexedDB`
- **XSS 风险**:避免用 `innerHTML` 输出 data-* 值,防止 XSS 攻击
- **可读性**:data-* 会在 HTML 中可见,不要存储敏感信息(如 Token、密码)
- **语义化**:data-* 是自定义数据属性,不应替代 class、id 等语义化属性
- **性能优化**:大量元素访问 data-* 时,优先使用 `getAttribute`(略快于 `dataset`)
- **命名一致性**:全项目统一使用连字符命名(如 `data-user-id`),不要混用驼峰
