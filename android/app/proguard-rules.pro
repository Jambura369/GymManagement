-keep class com.gymmanagement.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.google.firebase.** { *; }
-keepclassmembers class com.google.firebase.messaging.** { *; }

# Supabase / OkHttp
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# React Native Config
-keep class com.lugg.reactnativeconfig.** { *; }

# Kotlin
-keep class kotlin.** { *; }
-keepclassmembers class kotlin.Metadata { *; }
