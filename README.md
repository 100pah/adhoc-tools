# adhoc-tools

Some code for learning and adhoc usage.

<br>

## Features

+ `adhoc/ndk-backtrace`: Print C++ backtrace.
+ `adhoc/ndk-uncaught`: Catch and print uncaught crash and C++ exceptions.

<br>

## Configuration

### Sample config in `CMakeLists.txt`

```shell
# For example

set(ADHOC_PROJECT_DIR /your/path/to/adhoc-tools)
set(ADHOC_SRC_DIR ${ADHOC_PROJECT_DIR}/src/cpp)

# If intending to print backtrace in assertion fail,
# We can use this prepared `assert.h` for NDK version 20.1.5948944,
# or make your own dummy `assert.h` for other NDK version.
# See "Make dummy `assert.h`" below for details.
set(ADHOC_NDK_MOD_INCLUDE_DIR ${ADHOC_PROJECT_DIR}/ndk-mod-include/20.1.5948944)

# Or use `target_include_directories`
include_directories(
    ${ADHOC_NDK_MOD_INCLUDE_DIR}
    ${ADHOC_SRC_DIR}
    # ...
)

# Or use `add_executable`
add_library(
    your_so_name
    SHARED # or others

    ${ADHOC_SRC_DIR}/adhoc/ndk-backtrace/adhoc-ndk-backtrace.cpp
    ${ADHOC_SRC_DIR}/adhoc/ndk-backtrace/adhoc-ndk-uncaught.cpp
)
```

### Make a dummy `assert.h`
If intent to run it in assertion fail, we need to make a dummy `assert.h`.

For example, `assert.h` can be copied from: `~/Library/Android/sdk/ndk/20.1.5948944/toolchains/llvm/prebuilt/darwin-x86_64/sysroot/usr/include/assert.h`, which is the original `assert.h` you included from the NDK version you are using. And put the new `assert.h` under a directory like `${ADHOC_PROJECT_DIR}/ndk-mod-include/${NDK_VERSION}`, and pub the directory path to `ADHOC_NDK_MOD_INCLUDE_DIR` in `CMakeLists.txt` above, which enables substitution for the original `assert.h` while header file searching.

And then modify the new `assert.h`:
```cpp
#include "adhoc/ndk-backtrace/adhoc-ndk-backtrace.h"
// ...
define assert(e) ((e) ? __assert_no_op : (adhoc_dumpCppBacktrace("adhoc"), __assert2(__FILE__, __LINE__, __PRETTY_FUNCTION__, #e)))
// ...
define assert(e) ((e) ? __assert_no_op : (adhoc_dumpCppBacktrace("adhoc"), __assert(__FILE__, __LINE__, #e)))
// ...
```

### In Your Code
```cpp
#include "adhoc/ndk-uncaught/adhoc-ndk-uncaught.h"

jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    // ...
    adhoc_initializeNativeCrashHandler("adhoc");
    // ...
}
```


<br>

## Get the output from these tools

Use adb logcat, for example:
```shell
adb logcat "adhoc:* *:F"
```
