# FANDEX ProGuard 规则

# commonmark-java
-keep class org.commonmark.** { *; }
-dontwarn org.commonmark.**

# WorkManager 内嵌 Room 数据库（WorkDatabase_Impl）
# WorkManager 2.10 经 room-ktx 2.6.1 内嵌 Room 数据库 WorkDatabase，
# 其生成实现 WorkDatabase_Impl 由 Room 运行时经反射（getDeclaredConstructor）
# 实例化。Room 2.6.1 自带的 consumer 规则 "-keep class * extends
# androidx.room.RoomDatabase" 不含成员保留子句，AGP 9 的 R8 full mode
# 会把"无直接调用点"的无参构造器剥离，导致 androidx.startup 初始化
# WorkManager 时抛 NoSuchMethodException：应用进程一建立即崩溃，无法启动。
# 此处显式保留全部 RoomDatabase 子类的构造器，修复启动崩溃。
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-dontwarn androidx.room.paging.**

# Kotlinx 序列化
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

# Compose
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# LaTeX 数学公式渲染（JLatexMath，反射加载字体与符号资产）
-keep class ru.noties.jlatexmath.** { *; }
-keep class org.scifont.** { *; }
-keep class org.scilab.forge.jlatexmath.** { *; }
-dontwarn ru.noties.jlatexmath.**
-dontwarn org.scilab.forge.jlatexmath.**
