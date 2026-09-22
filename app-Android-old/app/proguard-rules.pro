-keepattributes *Annotation*
-keep class com.fandex.app.data.** { *; }

-keepattributes Signature
-keep class com.google.gson.** { *; }

-keep class org.commonmark.** { *; }
-dontwarn org.commonmark.**

-keepclassmembers class kotlinx.coroutines.** { *; }

-keep class androidx.work.** { *; }
-keep class androidx.work.impl.** { *; }
-keep class * extends androidx.room.RoomDatabase { *; }
-dontwarn androidx.work.**

-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
