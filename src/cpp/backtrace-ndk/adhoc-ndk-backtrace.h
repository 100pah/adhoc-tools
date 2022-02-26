/// [Features]
/// Available to be included in <assert.h>
/// Available to be included in C.

/// [Usage]
/// 1. Put adhoc-ndk-backtrace.cpp to the first of the link files.
///
/// 2. If intent to run it in assertion fail:
///
///     Make a dummy `assert.h`.
///     For example, can be copied from:
///     `~/Library/Android/sdk/ndk/20.1.5948944/toolchains/llvm/prebuilt/darwin-x86_64/sysroot/usr/include/assert.h`
///     which is the real `assert.h` you included.
///     And put the `assert.h` under the include dir, which is specified in
///     `include_directories` or `target_include_directories` of `CMakeLists.txt`.
///     Then the `assert.h` can replace the system `assert.h` in header file searching.
///
///     And then modify the `assert.h`:
///     ```cpp
///     #include "adhoc/ndk-backtrace/adhoc-ndk-backtrace.h"
///     // ...
///     define assert(e) ((e) ? __assert_no_op : (adhoc_dumpCppBacktrace("adhoc"), __assert2(__FILE__, __LINE__, __PRETTY_FUNCTION__, #e)))
///     // ...
///     define assert(e) ((e) ? __assert_no_op : (adhoc_dumpCppBacktrace("adhoc"), __assert(__FILE__, __LINE__, #e)))
///     // ...
///     ```
///
/// [Get source file and line number]
/// Do not know how to implement it yet.
/// So we have to use `addr2line` to get line number.


#ifndef _ADHOC_CPP_BACKTRACE_
#define _ADHOC_CPP_BACKTRACE_

#ifdef __cplusplus
extern "C" __attribute__((visibility("default"))) __attribute__((used))
#endif
void adhoc_dumpCppBacktrace(const char* tag);

#endif // end of _ADHOC_CPP_BACKTRACE_
