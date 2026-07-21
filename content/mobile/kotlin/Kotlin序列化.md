# Kotlin 序列化速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 序列化基础

**基本写法：@Serializable 注解**
`@Serializable data class <Name>(val <prop>: <Type>)`
```kotlin
// 标记类为可序列化
@Serializable
data class User(val name: String, val age: Int);
```

**基本写法：encodeToString 序列化为字符串**
`Json.encodeToString(<obj>)`
```kotlin
// 序列化对象为 JSON 字符串
val json = Json.encodeToString(User("Alice", 25));
```

**基本写法：decodeFromString 反序列化**
`Json.decodeFromString<<Type>>(<json>)`
```kotlin
// 从 JSON 字符串反序列化
val user = Json.decodeFromString<User>("""{"name":"Alice","age":25}""");
```

**基本写法：Json 配置**
`Json { <options> }`
```kotlin
// 自定义 Json 配置
val json = Json {
    ignoreUnknownKeys = true;
    prettyPrint = true;
}
```

---

## 字段配置

**基本写法：@SerialName 自定义字段名**
`@SerialName("<name>") val <prop>: <Type>`
```kotlin
// 自定义 JSON 字段名
@Serializable
data class User(
    @SerialName("user_name") val name: String,
    @SerialName("user_age") val age: Int
);
```

**基本写法：@Transient 忽略字段**
`@Transient val <prop>: <Type> = <default>`
```kotlin
// 忽略字段不参与序列化
@Serializable
data class User(
    val name: String,
    @Transient val temp: String = ""
);
```

**基本写法：@Optional 可选字段**
`@Optional val <prop>: <Type> = <default>`
```kotlin
// 可选字段，缺失时使用默认值
@Serializable
data class User(
    val name: String,
    val email: String? = null
);
```

**基本写法：默认值字段**
`val <prop>: <Type> = <default>`
```kotlin
// 带默认值的字段
@Serializable
data class Config(
    val host: String = "localhost",
    val port: Int = 8080
);
```

---

## 多态序列化

**基本写法：@Polymorphic 多态标记**
`@Polymorphic open class <Name>`
```kotlin
// 标记类支持多态序列化
@Serializable
@Polymorphic
open class Animal;
```

**基本写法：@SerialName 子类注册**
`@Serializable @SerialName("<name>") class <SubName> : <BaseName>()`
```kotlin
// 子类使用 @SerialName 注册
@Serializable
@SerialName("dog")
class Dog : Animal();
```

**换行写法：SerializersModule 序列化模块**
`SerializersModule { polymorphic(<Base>::class) { subclass(<Sub>::class) } }`
```kotlin
// 注册多态子类
val module = SerializersModule {
    polymorphic(Animal::class) {
        subclass(Dog::class);
        subclass(Cat::class);
    }
}
```

**基本写法：使用多态模块**
`Json { serializersModule = <module> }`
```kotlin
// 使用多态模块
val json = Json {
    serializersModule = module;
}
```

---

## 集合序列化

**基本写法：List 序列化**
`@Serializable data class <Name>(val <prop>: List<<Type>>)`
```kotlin
// 序列化包含 List 的对象
@Serializable
data class UserList(val users: List<User>);
```

**基本写法：Map 序列化**
`@Serializable data class <Name>(val <prop>: Map<<KeyType>, <ValueType>>)`
```kotlin
// 序列化包含 Map 的对象
@Serializable
data class Config(val settings: Map<String, String>);
```

**基本写法：嵌套对象序列化**
`@Serializable data class <Outer>(val <inner>: <Inner>)`
```kotlin
// 序列化嵌套对象
@Serializable
data class Order(val id: String, val user: User);
```

**基本写法：可空字段序列化**
`@Serializable data class <Name>(val <prop>: <Type>?)`
```kotlin
// 序列化可空字段
@Serializable
data class User(val name: String, val email: String? = null);
```

---

## 自定义序列化器

**基本写法：KSerializer 自定义序列化器**
`object <Name>Serializer : KSerializer<<Type>> { override fun serialize(...); override fun deserialize(...) }`
```kotlin
// 自定义序列化器
object DateSerializer : KSerializer<Date> {
    override val descriptor = PrimitiveSerialDescriptor("Date", PrimitiveKind.STRING);
    override fun serialize(encoder: Encoder, value: Date) {
        encoder.encodeString(value.toString());
    }
    override fun deserialize(decoder: Decoder): Date {
        return Date(decoder.decodeString());
    }
}
```

**基本写法：@Serializable with 自定义序列化器**
`@Serializable(with = <Serializer>::class) val <prop>: <Type>`
```kotlin
// 使用自定义序列化器
@Serializable
data class Event(
    @Serializable(with = DateSerializer::class) val date: Date
);
```

**基本写法：@Serializer 文件级注册**
`@file:UseSerializers(<Serializer>::class)`
```kotlin
// 文件级注册序列化器
@file:UseSerializers(DateSerializer::class);
```

---

## 编码器与解码器

**基本写法：encode 编码**
`<encoder>.encode<<Type>>(<value>)`
```kotlin
// 使用编码器编码值
encoder.encodeInt(42);
encoder.encodeString("Hello");
```

**基本写法：decode 解码**
`<decoder>.decode<<Type>>()`
```kotlin
// 使用解码器解码值
val num = decoder.decodeInt();
val text = decoder.decodeString();
```

**基本写法：encodeNullable 编码可空值**
`<encoder>.encodeNullableValue(<value>)`
```kotlin
// 编码可空值
encoder.encodeNullableSerializableElement(descriptor, 0, value);
```

**基本写法：CompositeEncoder 复合编码**
`<encoder>.beginStructure(<descriptor>)`
```kotlin
// 复合编码器
val composite = encoder.beginStructure(descriptor);
composite.encodeStringElement(descriptor, 0, value.name);
composite.endStructure();
```

---

## JSON 配置选项

**基本写法：ignoreUnknownKeys 忽略未知键**
`Json { ignoreUnknownKeys = true }`
```kotlin
// 忽略 JSON 中未知的键
val json = Json { ignoreUnknownKeys = true };
```

**基本写法：prettyPrint 美化输出**
`Json { prettyPrint = true }`
```kotlin
// 美化 JSON 输出
val json = Json { prettyPrint = true };
```

**基本写法：encodeDefaults 编码默认值**
`Json { encodeDefaults = true }`
```kotlin
// 编码默认值字段
val json = Json { encodeDefaults = true };
```

**基本写法：explicitNulls 显式 null**
`Json { explicitNulls = false }`
```kotlin
// 不编码 null 值
val json = Json { explicitNulls = false };
```

**基本写法：coerceInputValues 强制输入值**
`Json { coerceInputValues = true }`
```kotlin
// 强制输入值（无效值使用默认值）
val json = Json { coerceInputValues = true };
```

**基本写法：classDiscriminator 类标识符**
`Json { classDiscriminator = "<name>" }`
```kotlin
// 自定义多态类标识符
val json = Json { classDiscriminator = "type" };
```

---

## 流式序列化

**基本写法：encodeToStream 编码到流**
`<format>.encodeToStream(<obj>, <stream>)`
```kotlin
// 编码到输出流
val stream = ByteArrayOutputStream();
Json.encodeToStream(User("Alice", 25), stream);
```

**基本写法：decodeFromStream 从流解码**
`<format>.decodeFromStream<<Type>>(<stream>)`
```kotlin
// 从输入流解码
val stream = ByteArrayInputStream(json.toByteArray());
val user = Json.decodeFromStream<User>(stream);
```

---

## 其他格式

**基本写法：ProtoBuf 序列化**
`ProtoBuf.encodeToString(<obj>)`
```kotlin
// ProtoBuf 序列化
val proto = ProtoBuf.encodeToString(User("Alice", 25));
```

**基本写法：ProtoBuf 反序列化**
`ProtoBuf.decodeFromString<<Type>>(<proto>)`
```kotlin
// ProtoBuf 反序列化
val user = ProtoBuf.decodeFromString<User>(proto);
```

**基本写法：@ProtoNumber 自定义字段编号**
`@ProtoNumber(<n>) val <prop>: <Type>`
```kotlin
// 自定义 ProtoBuf 字段编号
@Serializable
data class User(
    @ProtoNumber(1) val name: String,
    @ProtoNumber(2) val age: Int
);
```

**基本写法：CBOR 序列化**
`Cbor.encodeToByteArray(<obj>)`
```kotlin
// CBOR 序列化
val cbor = Cbor.encodeToByteArray(User("Alice", 25));
```

**基本写法：CBOR 反序列化**
`Cbor.decodeFromByteArray<<Type>>(<cbor>)`
```kotlin
// CBOR 反序列化
val user = Cbor.decodeFromByteArray<User>(cbor);
```

---

## 实战应用

**基本写法：网络请求响应解析**
`suspend fun <name>(<params>): <ReturnType> = withContext(Dispatchers.IO) { Json.decodeFromString<<Type>>(<response>) }`
```kotlin
// 解析网络请求响应
suspend fun fetchUser(id: String): User = withContext(Dispatchers.IO) {
    val response = api.getUser(id);
    Json.decodeFromString<User>(response);
}
```

**基本写法：列表数据解析**
`Json.decodeFromString<List<<Type>>>(<json>)`
```kotlin
// 解析 JSON 数组
val users = Json.decodeFromString<List<User>>(jsonArray);
```

**换行写法：复杂嵌套对象解析**
`@Serializable data class <Response>(val <data>: <Data>); @Serializable data class <Data>(<fields>)`
```kotlin
// 解析复杂嵌套 JSON
@Serializable
data class ApiResponse(
    val code: Int,
    val message: String,
    val data: User
);
val response = Json.decodeFromString<ApiResponse>(json);
```
