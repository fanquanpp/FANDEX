
-keep class org.commonmark.** { *; }
-dontwarn org.commonmark.**

-keep class * extends androidx.room.RoomDatabase { <init>(); }
-dontwarn androidx.room.paging.**

-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

-keep class ru.noties.jlatexmath.** { *; }
-keep class org.scifont.** { *; }
-keep class org.scilab.forge.jlatexmath.** { *; }
-dontwarn ru.noties.jlatexmath.**
-dontwarn org.scilab.forge.jlatexmath.**
