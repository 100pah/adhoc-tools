# adhoc-tools

Some code for learning and adhoc usage.

<br>

## Features

+ `adhoc/ndk-backtrace`: Print C++ backtrace.
+ `adhoc/ndk-uncaught`: Catch and print uncaught crash and C++ exceptions.

<br>

## Install (manually)

### Sample config in `CMakeLists.txt`

#### You can use the template in `resource/adhoc-tools.cmake`

#### Or manually set like that

Firstly we can set in `CMakeLists.txt`:
```shell
set(USE_ADHOC_NDK_UNCAUGHT 1)
# set(USE_ADHOC_PERF 1)
```
Or in build.gradle (only for Android)
```groovy
android {
    defaultConfig {
        externalNativeBuild {
            cmake {
                arguments "-DUSE_ADHOC_NDK_UNCAUGHT=1",
                        // "-DUSE_ADHOC_PERF=1"
            }
        }
    }
}
```

Then in `CMakeLists.txt`
```shell

if(
    (DEFINED USE_ADHOC_NDK_UNCAUGHT)
    OR (DEFINED USE_ADHOC_PERF)
)
    set(ADHOC_TOOLS_PROJECT_DIR /your/path/to/adhoc-tools)
    set(ADHOC_TOOLS_SRC_DIR ${ADHOC_TOOLS_PROJECT_DIR}/src/cpp)

    # If intending to print backtrace in assertion fail,
    # We can use this prepared `assert.h` for NDK version 20.1.5948944,
    # or make your own dummy `assert.h` for other NDK version.
    # See "Make dummy `assert.h`" below for details.
    set(ADHOC_TOOLS_NDK_MOD_INCLUDE_DIR ${ADHOC_TOOLS_PROJECT_DIR}/ndk-mod-include/20.1.5948944)

    # Or use `target_include_directories`
    include_directories(
        ${ADHOC_TOOLS_NDK_MOD_INCLUDE_DIR}
        ${ADHOC_TOOLS_SRC_DIR}
        # ...
    )
endif()

if((DEFINED USE_ADHOC_NDK_UNCAUGHT))
    target_compile_definitions(your_so_name PUBLIC "-DUSE_ADHOC_NDK_UNCAUGHT=${USE_ADHOC_NDK_UNCAUGHT}")
    # Or use:
    # add_definitions("-DUSE_ADHOC_NDK_UNCAUGHT=${USE_ADHOC_NDK_UNCAUGHT}")

    add_library(
        your_so_name
        SHARED # or others
        # If use adhoc-ndk-uncaught & adhoc-ndk-backtrace
        ${ADHOC_TOOLS_SRC_DIR}/adhoc/ndk-backtrace/adhoc-ndk-backtrace.cpp
        # If use adhoc-ndk-backtrace
        ${ADHOC_TOOLS_SRC_DIR}/adhoc/ndk-uncaught/adhoc-ndk-uncaught.cpp
    )
    # Or use `add_executable`.
    # Or use `target_sources` to add source to the existing targets.
endif()

if((DEFINED USE_ADHOC_PERF))
    target_compile_definitions(your_so_name PUBLIC "-DUSE_ADHOC_PERF=${USE_ADHOC_PERF}")
    # Or use:
    # add_definitions("-DUSE_ADHOC_PERF=${USE_ADHOC_PERF}")

    add_library(
        your_so_name
        SHARED # or others
        ${ADHOC_TOOLS_SRC_DIR}/adhoc/perf/adhoc-perf.cpp
    )
    # Or use `add_executable`.
    # Or use `target_sources` to add source to the existing targets.
endif()
```

### Make a dummy `assert.h`
If intent to run it in assertion fail, we need to make a dummy `assert.h`.

For example, `assert.h` can be copied from: `~/Library/Android/sdk/ndk/20.1.5948944/toolchains/llvm/prebuilt/darwin-x86_64/sysroot/usr/include/assert.h`, which is the original `assert.h` you included from the NDK version you are using. And put the new `assert.h` under a directory like `${ADHOC_TOOLS_PROJECT_DIR}/ndk-mod-include/${NDK_VERSION}`, and pub the directory path to `ADHOC_TOOLS_NDK_MOD_INCLUDE_DIR` in `CMakeLists.txt` above, which enables substitution for the original `assert.h` while header file searching.

And then modify the new `assert.h`:
```cpp
#ifdef USE_ADHOC_NDK_UNCAUGHT
#include "adhoc/ndk-backtrace/adhoc-ndk-backtrace.h"
#endif // USE_ADHOC_NDK_UNCAUGHT
// ...
#ifdef USE_ADHOC_NDK_UNCAUGHT
#  define assert(e) ((e) ? __assert_no_op : (adhoc_dumpCppBacktrace("adhoc"), __assert2(__FILE__, __LINE__, __PRETTY_FUNCTION__, #e)))
#else
#  define assert(e) ((e) ? __assert_no_op : __assert2(__FILE__, __LINE__, __PRETTY_FUNCTION__, #e))
#endif // USE_ADHOC_NDK_UNCAUGHT
// ...
#ifdef USE_ADHOC_NDK_UNCAUGHT
define assert(e) ((e) ? __assert_no_op : (adhoc_dumpCppBacktrace("adhoc"), __assert(__FILE__, __LINE__, #e)))
#else
#  define assert(e) ((e) ? __assert_no_op : __assert(__FILE__, __LINE__, #e))
#endif // USE_ADHOC_NDK_UNCAUGHT
// ...
```

### In Your Code
+ If use adhoc-ndk-uncaught
    ```cpp
    #ifdef USE_ADHOC_NDK_UNCAUGHT
    #include "adhoc/ndk-uncaught/adhoc-ndk-uncaught.h"
    #endif // USE_ADHOC_NDK_UNCAUGHT

    jint JNI_OnLoad(JavaVM* vm, void* reserved) {
        // ...
    #ifdef USE_ADHOC_NDK_UNCAUGHT
        adhoc_initializeNativeCrashHandler("adhoc");
    #endif // USE_ADHOC_NDK_UNCAUGHT
        // ...
    }
    ```
+ If use adhoc-perf
    + Config `adhoc/perf/config.h` first to add your timer items.
    ```cpp
    #include "adhoc/perf/adhoc-perf.h"

    void someFn() {
        adhocperf::someTimeItemAAA.start();
        for (int i = 0; i < 100; i++) {
            adhocperf::someTimeItemBBB.start();
            int b = 5;
            adhocperf::someTimeItemBBB.end();
        }
        adhocperf::someTimeItemAAA.end();
        adhocperf::summarizeAndPrintPerf();
    }
    ```


<br>

## Get the output from this tool

Use adb logcat, for example:
```shell
adb logcat "adhoc:* *:F"
```

### If use adhoc-ndk-uncaught

If `assert(false)` or crash happen, you may receive the log like (the log content below is fake):
```log
nativeCrashSignalHandler enter
03-03 19:51:16.468  8123 12345 E adhoc  : ============ C++ StackTrace End ============
03-03 19:51:16.468  8123 12345 E adhoc  :     # 0: 0x123456  adhoc_dumpCppBacktrace @/data/app/com.xxx.yyy-nABCDEabcde123_xyz==/lib/arm/libxxyyzz.so
03-03 19:51:16.469  8123 12345 E adhoc  :     # 1: 0x654321  xxx::Xxxx::XxxXXx(_jobject*) const  (original mangled symbol: _ZN12345678ABCDEF_jobject) @/xxx/com.android.runtime/lib/libxxx.so
03-03 19:51:16.469  8123 12345 E adhoc  :     # 2: 0x987654  _JNIEnv::CallVoidMethod(_jobject*, _jmethodID*, ...)  (original mangled symbol: _ZNxxxxxxxxx_jobject_jmethod) @/data/app/com.xxx.yyy-nABCDEabcde123_xyz==/lib/arm/libxxyyzz.so
03-03 19:51:16.469  8123 12345 E adhoc  :     # 3: 0x456789  MySomeClass::createSomething(_JNIEnv*, _jobject*)  (original mangled symbol: _ZNxxxxxxxxx_JNIEnv_jobject) @/data/app/com.xxx.yyy-nABCDEabcde123_xyz==/lib/arm/libxxyyzz.so
03-03 19:51:16.470  8123 12345 E adhoc  : ============ C++ StackTrace End ============
03-03 19:51:16.470  8123 12345 E adhoc  : Terminating with a C crash.
03-03 19:51:16.470  8123 12345 E adhoc  : Signal Number: 4 (illegal instruction) Signal Code: 1
```

You may find the meaning of the signal number and signal code from `signal.h`. For example, `/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/usr/include/sys/signal.h`.

You can get the source file line number by `addr2line` if you need. For example:
```shell
# Note: find the addr2line from the ndk exactly that you used.
~/Library/Android/sdk/ndk/20.1.5948944/toolchains/llvm/prebuilt/darwin-x86_64/bin/aarch64-linux-android-addr2line  \
-C -f -e \
~/my-proj/intermediates/cmake/debug/obj/armeabi-v7a/libxxyyzz.so \
0x456789
# 0x456789 is the address get from the log above.
```


### If use adhoc-perf

You can get the timer output like:
```log
adhoc  someTimeItemAAA: {count: 1, average: 0.606000 ms}, someTimeItemBBB: {count: 1, average: 0.008000 ms}, someTimeItemCCC: {count: 1000, average: 0.000038 ms},
```
