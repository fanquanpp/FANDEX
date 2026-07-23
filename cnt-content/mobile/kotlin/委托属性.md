# Kotlin 委托属性速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 标准委托

**基本写法：lazy 延迟初始化**
`val <name>: <Type> by lazy { <init> }`
```kotlin
// lazy 首次访问时初始化
val database: Database by lazy { Database.connect("localhost"); }
```

**基本写法：lazy 同步模式**
`val <name>: <Type> by lazy(LazyThreadSafetyMode.<mode>) { <init> }`
```kotlin
// 指定 lazy 的线程安全模式
val cache: Map<String, String> by lazy(LazyThreadSafetyMode.PUBLICATION) {
    loadCache();
}
```

**基本写法：observable 属性变化监听**
`var <name>: <Type> by Delegates.observable(<init>) { <prop>, <old>, <new> -> <body> }`
```kotlin
// observable 属性变化时回调
var name: String by Delegates.observable("initial") { prop, old, new ->
    println("${prop.name} changed from $old to $new");
}
```

**基本写法：vetoable 可否决属性变化**
`var <name>: <Type> by Delegates.vetoable(<init>) { <prop>, <old>, <new> -> <cond> }`
```kotlin
// vetoable 返回 false 时拒绝修改
var age: Int by Delegates.vetoable(0) { _, _, new -> new >= 0 };
```

**基本写法：.notNull 非空委托**
`var <name>: <Type> by Delegates.notNull()`
```kotlin
// notNull 委托，未初始化前访问抛出异常
var config: Config by Delegates.notNull();
fun init() {
    config = Config.load();
}
```

---

## Map 委托

**基本写法：只读 Map 委托**
`val <name>: <Type> by <map>`
```kotlin
// 从只读 Map 中读取属性
val map = mapOf("name" to "Alice", "age" to 25);
val name: String by map;
val age: Int by map;
```

**基本写法：可变 Map 委托**
`var <name>: <Type> by <mutableMap>`
```kotlin
// 从可变 Map 中读写属性
val mutableMap = mutableMapOf("name" to "Alice");
var name: String by mutableMap;
name = "Bob";  // 修改会同步到 map
```

---

## 自定义属性委托

**基本写法：只读属性委托**
`class <Delegate><T> { operator fun getValue(thisRef: Any?, property: KProperty<*>): T }`
```kotlin
// 只读属性委托实现
class StringDelegate(private val value: String) {
    operator fun getValue(thisRef: Any?, property: KProperty<*>): String {
        return "[$property] = $value";
    }
}
val greeting by StringDelegate("Hello");
```

**换行写法：可读写属性委托**
`class <Delegate><T> { operator fun getValue(...); operator fun setValue(...) }`
```kotlin
// 可读写属性委托实现
class Preference<T>(private val key: String, private val default: T) {
    operator fun getValue(thisRef: Any?, property: KProperty<*>): T {
        return preferences.get(key) as? T ?: default;
    }
    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        preferences.put(key, value);
    }
}
```

**基本写法：ReadOnlyProperty 接口实现**
`class <Delegate><T> : ReadOnlyProperty<Any?, T> { override fun getValue(...): T }`
```kotlin
// 实现 ReadOnlyProperty 接口
class ConstProperty<T>(private val value: T) : ReadOnlyProperty<Any?, T> {
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = value;
}
```

**基本写法：ReadWriteProperty 接口实现**
`class <Delegate><T> : ReadWriteProperty<Any?, T> { override fun getValue(...); override fun setValue(...) }`
```kotlin
// 实现 ReadWriteProperty 接口
class LoggingProperty<T>(private var value: T) : ReadWriteProperty<Any?, T> {
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        println("Getting ${property.name}");
        return value;
    }
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        println("Setting ${property.name} to $value");
        this.value = value;
    }
}
```

---

## 委托提供者

**基本写法：提供委托（provideDelegate）**
`operator fun <name>.provideDelegate(thisRef: Any?, property: KProperty<*>): <Delegate>`
```kotlin
// provideDelegate 在属性初始化时拦截
class ConfigDelegate<T>(private val default: T) {
    operator fun provideDelegate(thisRef: Any?, property: KProperty<*>): ReadWriteProperty<Any?, T> {
        return Preference(property.name, default);
    }
}
```

**基本写法：使用提供委托**
`val <name>: <Type> by <DelegateProvider>(<default>)`
```kotlin
// 使用提供委托
val host: String by ConfigDelegate("localhost");
val port: Int by ConfigDelegate(8080);
```

---

## 局部委托属性

**基本写法：局部变量 lazy 委托**
`val <name> by lazy { <init> }`
```kotlin
// 局部变量使用 lazy 委托
fun process(input: String) {
    val parsed by lazy { parseInput(input); }
    if (shouldProcess) {
        println(parsed);
    }
}
```

**基本写法：局部变量自定义委托**
`val <name> by <delegate>`
```kotlin
// 局部变量使用自定义委托
fun example() {
    val value by LoggingProperty("initial");
    println(value);
}
```

---

## 委托属性实战

**基本写法：SharedPreferences 委托**
`val <name>: <Type> by <Preference>(<key>, <default>)`
```kotlin
// SharedPreferences 委托
class Preference<T>(private val key: String, private val default: T) {
    operator fun getValue(thisRef: Any?, property: KProperty<*>): T {
        val prefs = context.getSharedPreferences("app", Context.MODE_PRIVATE);
        return when (default) {
            is String -> prefs.getString(key, default) as T;
            is Int -> prefs.getInt(key, default) as T;
            is Boolean -> prefs.getBoolean(key, default) as T;
            else -> default;
        }
    }
    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        val prefs = context.getSharedPreferences("app", Context.MODE_PRIVATE);
        val editor = prefs.edit();
        when (value) {
            is String -> editor.putString(key, value);
            is Int -> editor.putInt(key, value);
            is Boolean -> editor.putBoolean(key, value);
        }
        editor.apply();
    }
}
```

**基本写法：ObservableList 委托**
`val <name>: List<<T>> by <ObservableList>(<init>)`
```kotlin
// 可观察列表委托
class ObservableList<T>(initial: List<T>) {
    private val items = initial.toMutableList();
    var onChange: ((List<T>) -> Unit)? = null;
    operator fun getValue(thisRef: Any?, property: KProperty<*>): List<T> = items.toList();
    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: List<T>) {
        items.clear();
        items.addAll(value);
        onChange?.invoke(items.toList());
    }
}
```

---

## 委托属性与验证

**基本写法：带验证的属性委托**
`var <name>: <Type> by <ValidatedDelegate>(<init>, <validator>)`
```kotlin
// 带验证的属性委托
class ValidatedDelegate<T>(
    initialValue: T,
    private val validator: (T) -> Boolean
) {
    private var value = initialValue;
    operator fun getValue(thisRef: Any?, property: KProperty<*>): T = value;
    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        require(validator(value)) { "验证失败: $value" };
        this.value = value;
    }
}
```

---

## 委托属性与缓存

**基本写法：带过期时间的缓存委托**
`val <name>: <Type> by <CacheDelegate>(<ttl>) { <init> }`
```kotlin
// 带过期时间的缓存委托
class CacheDelegate<T>(private val ttlMillis: Long, private val loader: () -> T) {
    private var value: T? = null;
    private var lastLoadTime: Long = 0;
    operator fun getValue(thisRef: Any?, property: KProperty<*>): T {
        val now = System.currentTimeMillis();
        if (value == null || now - lastLoadTime > ttlMillis) {
            value = loader();
            lastLoadTime = now;
        }
        return value!!;
    }
}
```
