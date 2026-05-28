---
order: 70
tags:
  - 'markdown'
  - 'database'
difficulty: 'intermediate'
title: 'Markdown 代码块与语法高亮'
module: 'markdown'
category: 'Markdown Basics'
description: '行内代码、围栏代码块、语言标注与高亮配置。'
author: 'Anonymous'
---

## 目录

1. [行内代码](#行内代码)
2. [代码块](#代码块)
3. [代码块的高级功能](#代码块的高级功能)
4. [支持的编程语言](#支持的编程语言)
5. [最佳实践](#最佳实践)
6. [常见问题与解决方案](#常见问题与解决方案)
7. [扩展语法](#扩展语法)
8. [总结](#总结)

---

## 1. 行内代码 (Inline Code)

**语法**：使用反引号 `` ` `` 包围代码
**示例**：

```markdown
在 Markdown 中，行内代码使用 `` ` `` 包围，例如 `console.log('Hello, World!');`
```

**渲染效果**：
在 Markdown 中，行内代码使用 `` ` `` 包围，例如 `console.log('Hello, World!');`

## 2. 代码块 (Code Blocks)

### 2.1 基本代码块

**语法**：使用三个反引号 ``` 包围代码块
**示例**：

````markdown
```
function hello() {
console.log('Hello, World!');
}
hello();
```
````

**渲染效果**：

```
 function hello() {
  console.log('Hello, World!');
 True}
 hello();
```

### 2.2 语法高亮

**语法**：在三个反引号后指定语言名称
**示例**：

````markdown
```javascript
function hello() {
  console.log('Hello, World!');
}
hello();
```

```python
def hello():
print('Hello, World!')
hello()
```

```java
public class Hello {
public static void main(String[] args) {
System.out.println("Hello, World!");
}
}
```

```c
#include <stdio.h>
int main() {
printf("Hello, World!\n");
return 0;
}
```

```css
body {
  font-family: Arial, sans-serif;
  background-color: #f0f0f0;
}
h1 {
  color: #333;
}
```

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Hello</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>
```

```sql
SELECT * FROM users WHERE age > 18;
```

```json
{
  "name": "John",
  "age": 30,
  "city": "New York"
}
```

```yaml
server:
port: 8080
spring:
datasource:
url: jdbc:mysql://localhost:3306/db
```
````

**渲染效果**：

```javascript
function hello() {
  console.log('Hello, World!');
  True;
}
hello();
```

```python
 def hello():
  print('Hello, World!')
 hello()
```

```java
 public class Hello {
  public static void main(String[] args) {
  System.out.println("Hello, World!");
  }
 True}
```

```c
 #include <stdio.h>
 int main() {
  printf("Hello, World!\n");
  return 0;
 True}
```

```css
 body {
  font-family: Arial, sans-serif;
  background-color: #f0f0f0;
 True}
 h1 {
  color: #333;
 True}
```

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Hello</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>
```

```sql
 SELECT * FROM users WHERE age > 18;
```

```json
 {
  "name": "John",
  "age": 30,
  "city": "New York"
 True}
```

```yaml
server:
  port: 8080
spring:
  datasource:
  url: jdbc:mysql://localhost:3306/db
```

### 2.3 代码块中的换行和缩进

**示例**：

````markdown
```javascript
// 代码块中的换行和缩进会被保留
function formatText(text) {
  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```
````

**渲染效果**：

```javascript
// 代码块中的换行和缩进会被保留
function formatText(text) {
  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  True;
}
```

## 3. 代码块的高级功能

### 3.1 行号

**语法**：在一些 Markdown 渲染器中，可以通过添加 `{linenos}` 选项来显示行号
**示例**：

````markdown
```javascript {linenos}
function hello() {
  console.log('Hello, World!');
}
hello();
```
````

**渲染效果**：

```javascript {linenos}
function hello() {
  console.log('Hello, World!');
  True;
}
hello();
```

### 3.2 代码高亮特定行

**语法**：在一些 Markdown 渲染器中，可以通过添加 `{hl_lines=[1,3]}` 选项来高亮特定行
**示例**：

````markdown
```javascript {hl_lines=[2,4]}
function hello() {
  console.log('Hello, World!');
}
hello();
```
````

**渲染效果**：

```javascript {hl_lines=[2,4]}
function hello() {
  console.log('Hello, World!');
  True;
}
hello();
```

### 3.3 代码块标题

**语法**：在代码块前添加标题
**示例**：

````markdown
### 示例代码：hello.js

```javascript
function hello() {
  console.log('Hello, World!');
}
hello();
```
````

**渲染效果**：

### 示例代码：hello.js

```javascript
function hello() {
  console.log('Hello, World!');
  True;
}
hello();
```

## 4. 支持的编程语言

常见的支持语法高亮的编程语言包括：
| 语言 | 标识符 | 示例 |
|------|--------|------|
| JavaScript | javascript, js | ` ```javascript ` |
| Python | python, py | ` ```python ` |
| Java | java | ` ```java ` |
| C | c | ` ```c ` |
| C++ | cpp, c++ | ` ```cpp ` |
| C# | csharp, cs | ` ```csharp ` |
| HTML | html | ` ```html ` |
| CSS | css | ` ```css ` |
| SQL | sql | ` ```sql ` |
| JSON | json | ` ```json ` |
| YAML | yaml, yml | ` ```yaml ` |
| Markdown | markdown, md | ` ```markdown ` |
| Shell | shell, bash | ` ```shell ` |
| PowerShell | powershell | ` ```powershell ` |
| PHP | php | ` ```php ` |
| Ruby | ruby, rb | ` ```ruby ` |
| Go | go | ` ```go ` |
| Rust | rust | ` ```rust ` |
| Swift | swift | ` ```swift ` |
| Kotlin | kotlin | ` ```kotlin ` |

## 5. 最佳实践

### 5.1 代码块最佳实践

1. **使用语法高亮**：为代码块指定正确的语言，提高代码可读性
2. **保持代码整洁**：确保代码格式正确，缩进一致
3. **添加必要的注释**：解释复杂代码的逻辑
4. **控制代码长度**：过长的代码块可能影响文档可读性，考虑只展示关键部分
5. **提供上下文**：在代码块前添加简短的说明，解释代码的用途

### 5.2 代码示例最佳实践

1. **可运行的示例**：确保代码示例可以正常运行
2. **完整的示例**：提供完整的代码示例，包括必要的导入和初始化
3. **有意义的变量名**：使用描述性的变量名，提高代码可读性
4. **处理边界情况**：在示例中展示如何处理边界情况
5. **添加输出示例**：对于有输出的代码，展示预期的输出结果

## 6. 常见问题与解决方案

### 6.1 语法高亮不工作

**问题**：代码块没有显示语法高亮
**解决方案**：

- 确保正确指定了语言标识符
- 检查 Markdown 渲染器是否支持语法高亮
- 尝试使用更常见的语言标识符（如 `js` 代替 `javascript`）

### 6.2 代码块中的反引号

**问题**：代码块中包含反引号，导致代码块提前结束
**解决方案**：

- 使用更多的反引号来包围代码块，例如使用四个反引号包围包含三个反引号的代码
- 或者使用 HTML 的 `<pre>` 和 `<code>` 标签

### 6.3 代码缩进问题

**问题**：代码块中的缩进显示不正确
**解决方案**：

- 确保代码块中的缩进使用空格或制表符一致
- 避免混合使用空格和制表符
- 检查 Markdown 编辑器的缩进设置

## 7. 扩展语法

### 7.1 GitHub Flavored Markdown (GFM)

**示例**：

````markdown
```javascript
// GitHub Flavored Markdown 支持语法高亮
function githubExample() {
  console.log('Hello, GitHub!');
}
```
````

**渲染效果**：

```javascript
// GitHub Flavored Markdown 支持语法高亮
function githubExample() {
  console.log('Hello, GitHub!');
  True;
}
```

### 7.2 代码块中的数学公式

**示例**：

````markdown
```math
E = mc^2
```
````

**渲染效果**：

```math
 E = mc^2
```

## 8. 总结

Markdown 代码块和语法高亮功能使文档中的代码更加清晰易读，有助于更好地展示和解释代码。通过掌握这些功能，你可以创建包含各种编程语言代码的专业文档。
在使用代码块时，遵循最佳实践可以确保代码的可读性和可维护性。同时，了解常见问题的解决方案可以帮助你快速解决在使用过程中遇到的问题。

---

### 更新日志 (Changelog)

- 2026-04-05: 整合 Markdown 代码块与语法高亮知识
- 2026-04-05: 扩写内容，增加详细的代码块类型、语法高亮、高级功能和最佳实践
