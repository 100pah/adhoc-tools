/// ----------------------------
/// Add your timer items below:
/// For example, if you want to add a timer item named "invoke_java_method",
/// Add a line below like:
/// ```cpp
/// M(invoke_java_method) \
/// ```
/// ----------------------------
#define _ADHOC_TOOLS_PERF_TIMER_ITEMS_(M) \
    M(quickjsTimer) \
    M(v8Timer) \
    M(someTimeItemCCC) \

/// Modify the log tag here if needed.
#define _ADHOC_TOOLS_PERF_LOG_TAG_ "adhoc"

/// The max records to be recorded.
#define _ADHOC_TOOLS_PERF_RECORDS_CAPACITY_ 3000

/// If using in other envrioment, you can modify the log implementation here.
/// For example, if using in NDK, modify it to
/// ```cpp
/// #define _ADHOC_TOOLS_PERF_LOG_INCLUDE_ <android/log.h>
/// #define _ADHOC_TOOLS_PERF_LOG_(...) \
///     __android_log_print(ANDROID_LOG_INFO, "adhoc", __VA_ARGS__);
/// ```
/// Can also modify the log tag here if needed ("adhoc" by default).
#define _ADHOC_TOOLS_PERF_LOG_INCLUDE_ <android/log.h>
#define _ADHOC_TOOLS_PERF_LOG_(...) \
   __android_log_print(ANDROID_LOG_INFO, "QJS", __VA_ARGS__)