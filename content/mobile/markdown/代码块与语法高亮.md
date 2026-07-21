# 代码块与语法高亮

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 行内代码

**单行写法：使用反引号包裹行内代码**
`` `<代码>` ``
```markdown
使用 `console.log()` 输出内容
```

---

## 基本代码块

**换行写法：使用三个反引号创建代码块**
` ``` \n<代码>\n``` `
```markdown
```
function hello() {
  console.log('Hello, World!');
}
```
```

---

## 语法高亮

**换行写法：指定 JavaScript 语言高亮**
` ```javascript \n<代码>\n``` `
```markdown
```javascript
function hello() {
  console.log('Hello, World!');
}
```
```

**换行写法：指定 Python 语言高亮**
` ```python \n<代码>\n``` `
```markdown
```python
def hello():
    print('Hello, World!')
```
```

**换行写法：指定 Java 语言高亮**
` ```java \n<代码>\n``` `
```markdown
```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```
```

**换行写法：指定 SQL 语言高亮**
` ```sql \n<代码>\n``` `
```markdown
```sql
SELECT * FROM users WHERE age > 18;
```
```

**换行写法：指定 JSON 语言高亮**
` ```json \n<代码>\n``` `
```markdown
```json
{
  "name": "John",
  "age": 30
}
```
```

**换行写法：指定 YAML 语言高亮**
` ```yaml \n<代码>\n``` `
```markdown
```yaml
server:
  port: 8080
```
```

**换行写法：指定 Bash 语言高亮**
` ```bash \n<代码>\n``` `
```markdown
```bash
echo "Hello, World!"
```
```

---

## 常用语言标识符

**单行写法：C 语言标识符**
` ```c `
```markdown
```c
printf("Hello, World!");
```
```

**单行写法：C++ 语言标识符**
` ```cpp `
```markdown
```cpp
cout << "Hello, World!";
```
```

**单行写法：C# 语言标识符**
` ```csharp `
```markdown
```csharp
Console.WriteLine("Hello, World!");
```
```

**单行写法：Go 语言标识符**
` ```go `
```markdown
```go
fmt.Println("Hello, World!")
```
```

**单行写法：Rust 语言标识符**
` ```rust `
```markdown
```rust
println!("Hello, World!");
```
```

**单行写法：Kotlin 语言标识符**
` ```kotlin `
```markdown
```kotlin
println("Hello, World!")
```
```

**单行写法：HTML 语言标识符**
` ```html `
```markdown
```html
<p>Hello, World!</p>
```
```

**单行写法：CSS 语言标识符**
` ```css `
```markdown
```css
body { color: red; }
```
```

**单行写法：PHP 语言标识符**
` ```php `
```markdown
```php
echo "Hello, World!";
```
```

---

## 代码块高级功能

**换行写法：显示行号**
` ```<语言> {linenos} `
```markdown
```javascript {linenos}
function hello() {
  console.log('Hello, World!');
}
```
```

**换行写法：高亮特定行**
` ```<语言> {hl_lines=[<行号>]} `
```markdown
```javascript {hl_lines=[2,4]}
function hello() {
  console.log('Hello, World!');
}
hello();
```
```

---

## 代码块中的反引号

**换行写法：使用四个反引号包围含三个反引号的代码**
` ```` \n```<代码> \n```` `
```markdown
````
```
代码块中包含三个反引号
```
````
```

---

## 数学公式代码块

**换行写法：使用 math 语言标识符**
` ```math \n<公式>\n``` `
```markdown
```math
E = mc^2
```
```
