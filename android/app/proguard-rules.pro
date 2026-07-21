# FANDEX ProGuard Rules
-keepattributes *Annotation*
-keep class com.fandex.app.data.** { *; }

# Gson（JSON 解析：保留泛型签名与反射访问的类成员）
-keepattributes Signature
-keep class com.google.gson.** { *; }

# commonmark-java（Markdown 渲染：保留 SPI 服务发现与反射加载的类成员）
-keep class org.commonmark.** { *; }
-dontwarn org.commonmark.**

# Kotlin Coroutines（协程：保留状态机字段与挂起函数实现，防止混淆破坏协程状态流转）
-keepclassmembers class kotlinx.coroutines.** { *; }

# WorkManager（更新自检后台任务：保留反射调用的构造函数与实现类）
# 原因：WorkManager 通过 Room 反射创建 WorkDatabase_Impl 实例，
#       R8 默认会移除未被代码直接引用的默认构造函数，导致运行时 NoSuchMethodException
# 参考：https://developer.android.com/topic/libraries/architecture/workmanager/how-to/define-work
-keep class androidx.work.** { *; }
-keep class androidx.work.impl.** { *; }
-keep class * extends androidx.room.RoomDatabase { *; }
-dontwarn androidx.work.**

# OkHttp / Okio（更新自检网络栈：保留内部反射与平台检测代码）
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

