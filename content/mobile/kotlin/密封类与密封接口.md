# Kotlin 密封类与密封接口速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 密封类基础

**基本写法：密封类定义**
`sealed class <Name>`
```kotlin
// 密封类定义，子类必须在同一文件或同一包
sealed class Result;
```

**基本写法：密封类带泛型**
`sealed class <Name><T>`
```kotlin
// 带泛型的密封类
sealed class Result<out T>;
```

**基本写法：密封类带抽象成员**
`sealed class <Name> { abstract fun <method>(): <ReturnType> }`
```kotlin
// 密封类定义抽象成员
sealed class Shape {
    abstract fun area(): Double;
}
```

---

## 密封类子类

**基本写法：data class 子类**
`data class <SubName>(val <prop>: <Type>) : <SealedClass>()`
```kotlin
// data class 作为密封类子类
data class Success(val value: Int) : Result<Int>();
```

**基本写法：object 子类**
`object <SubName> : <SealedClass>()`
```kotlin
// object 作为密封类子类
object Loading : Result<Nothing>();
```

**基本写法：普通 class 子类**
`class <SubName>(<params>) : <SealedClass>()`
```kotlin
// 普通 class 作为密封类子类
class Error(val message: String) : Result<Nothing>();
```

**单行写法：多子类密封类**
`sealed class <Name> { data class <A>(...); object <B>; class <C>(...) }`
```kotlin
// 单行定义多个子类
sealed class Result {
    data class Success<T>(val value: T) : Result<T>();
    object Loading : Result<Nothing>();
    class Error(val message: String) : Result<Nothing>();
}
```

**换行写法：多子类密封类**
`sealed class <Name> { <subclasses on separate lines> }`
```kotlin
// 换行定义多个子类
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>();
    object Loading : Result<Nothing>();
    data class Error(val message: String) : Result<Nothing>();
}
```

---

## 嵌套密封类子类

**基本写法：嵌套子类**
`sealed class <Name> { class <SubName> : <Name>() }`
```kotlin
// 嵌套子类定义
sealed class State {
    class Loading : State();
    class Loaded(val data: String) : State();
    class Error(val message: String) : State();
}
```

**基本写法：object 嵌套子类**
`sealed class <Name> { object <SubName> : <Name>() }`
```kotlin
// object 嵌套子类
sealed class Permission {
    object Granted : Permission();
    object Denied : Permission();
}
```

---

## when 表达式穷举

**基本写法：when 穷举密封类**
`fun <name>(<param>: <SealedClass>) = when (<param>) { is <Type> -> <expr> }`
```kotlin
// when 穷举所有子类，无需 else
fun handleResult(result: Result<Int>): String = when (result) {
    is Result.Success -> "成功: ${result.value}";
    Result.Loading -> "加载中";
    is Result.Error -> "错误: ${result.message}";
}
```

**基本写法：when 穷举 object 子类**
`fun <name>(<param>: <SealedClass>) = when (<param>) { <ObjectName> -> <expr> }`
```kotlin
// when 中直接匹配 object（无需 is）
fun checkPermission(permission: Permission): String = when (permission) {
    Permission.Granted -> "已授权";
    Permission.Denied -> "已拒绝";
}
```

**基本写法：when 穷举带返回值**
`val <name> = when (<param>) { <branches> }`
```kotlin
// when 表达式返回值
val stateText: String = when (state) {
    is State.Loading -> "正在加载";
    is State.Loaded -> "已加载: ${state.data}";
    is State.Error -> "错误: ${state.message}";
}
```

---

## 密封接口

**基本写法：密封接口定义**
`sealed interface <Name>`
```kotlin
// 密封接口定义
sealed interface Action;
```

**基本写法：密封接口带泛型**
`sealed interface <Name><T>`
```kotlin
// 带泛型的密封接口
sealed interface Event<out T>;
```

**基本写法：密封接口带方法**
`sealed interface <Name> { fun <method>(): <ReturnType> }`
```kotlin
// 密封接口定义方法
sealed interface Drawable {
    fun draw(): String;
}
```

---

## 密封接口实现

**基本写法：data class 实现密封接口**
`data class <Name>(val <prop>: <Type>) : <SealedInterface>`
```kotlin
// data class 实现密封接口
data class Click(val x: Int, val y: Int) : Action;
```

**基本写法：object 实现密封接口**
`object <Name> : <SealedInterface>`
```kotlin
// object 实现密封接口
object Idle : Action;
```

**基本写法：class 实现密封接口**
`class <Name>(<params>) : <SealedInterface>`
```kotlin
// 普通 class 实现密封接口
class Scroll(val delta: Int) : Action;
```

**换行写法：多实现密封接口**
`sealed interface <Name> { <implementations on separate lines> }`
```kotlin
// 换行定义多个实现
sealed interface Action {
    data class Click(val x: Int, val y: Int) : Action;
    data class LongPress(val duration: Long) : Action;
    object Idle : Action;
}
```

---

## 密封接口组合

**基本写法：密封接口继承**
`sealed interface <Name> : <Other>`
```kotlin
// 密封接口继承其他接口
sealed interface Clickable : Drawable {
    fun click();
}
```

**基本写法：密封接口多重继承**
`sealed interface <Name> : <Interface1>, <Interface2>`
```kotlin
// 密封接口多重继承
sealed interface UIEvent : Clickable, Focusable;
```

**基本写法：类实现多个密封接口**
`class <Name> : <SealedInterface1>, <SealedInterface2>`
```kotlin
// 类实现多个密封接口
class Button : Clickable, Focusable {
    override fun draw() = "Drawing button";
    override fun click() = println("Clicked");
}
```

---

## 密封类与密封接口结合

**基本写法：密封类实现密封接口**
`sealed class <Name> : <SealedInterface>`
```kotlin
// 密封类实现密封接口
sealed class UIComponent : Drawable {
    data class Button(val text: String) : UIComponent() {
        override fun draw() = "Button: $text";
    }
    data class TextField(val text: String) : UIComponent() {
        override fun draw() = "TextField: $text";
    }
}
```

**基本写法：when 穷举密封类与密封接口**
`fun <name>(<param>: <SealedClass>) = when (<param>) { is <Type> -> <expr> }`
```kotlin
// when 穷举密封类实现
fun render(component: UIComponent): String = when (component) {
    is UIComponent.Button -> component.draw();
    is UIComponent.TextField -> component.draw();
}
```

---

## 密封类递归类型

**基本写法：递归密封类**
`sealed class <Name><T> { data class <SubName><T>(val <prop>: <Name><T>) : <Name><T>() }`
```kotlin
// 递归密封类（链表结构）
sealed class List<out T> {
    object Nil : List<Nothing>();
    data class Cons<T>(val head: T, val tail: List<T>) : List<T>();
}
```

**基本写法：递归 when 处理**
`fun <name>(<param>: <SealedClass>): <ReturnType> = when (<param>) { is <Type> -> <expr> }`
```kotlin
// 递归处理密封类
fun <T> sum(list: List<T>): Int where T : Number = when (list) {
    List.Nil -> 0;
    is List.Cons -> list.head.toInt() + sum(list.tail);
}
```

---

## 密封类实战

**基本写法：状态机密封类**
`sealed class <State> { <subclasses> }`
```kotlin
// 状态机密封类
sealed class ViewState {
    object Loading : ViewState();
    data class Success(val data: List<String>) : ViewState();
    data class Error(val message: String, val retry: () -> Unit) : ViewState();
}
```

**基本写法：状态机 when 处理**
`fun <name>(<param>: <State>) = when (<param>) { is <Type> -> <expr> }`
```kotlin
// 状态机 when 处理
fun renderView(state: ViewState): String = when (state) {
    ViewState.Loading -> "显示加载动画";
    is ViewState.Success -> "显示数据: ${state.data}";
    is ViewState.Error -> "显示错误: ${state.message}";
}
```

**基本写法：网络请求结果密封类**
`sealed class <Result><T> { <subclasses> }`
```kotlin
// 网络请求结果密封类
sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>();
    data class Failure(val error: Throwable) : NetworkResult<Nothing>();
    object NetworkError : NetworkResult<Nothing>();
}
```

**基本写法：网络请求结果处理**
`fun <name>(<param>: <NetworkResult>) = when (<param>) { is <Type> -> <expr> }`
```kotlin
// 网络请求结果处理
fun <T> handleResult(result: NetworkResult<T>): String = when (result) {
    is NetworkResult.Success -> "成功: ${result.data}";
    is NetworkResult.Failure -> "失败: ${result.error.message}";
    NetworkResult.NetworkError -> "网络错误";
}
```
