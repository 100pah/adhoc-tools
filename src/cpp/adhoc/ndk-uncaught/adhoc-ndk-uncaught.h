/// [Usage]
/// 1. Put adhoc-ndk-backtrace.cpp to the first of the link files.
/// 2. Call `adhoc_listenToUncaught` at the begining of the program, like in `JNI_OnLoad()`.

#ifndef _ADHOC_TOOLS_NDK_UNCAUGHT_H_
#define _ADHOC_TOOLS_NDK_UNCAUGHT_H_

#include "../common/adhoc-public.h"

_ADHOC_TOOLS_EXPORT_
void adhoc_initializeNativeCrashHandler(const char* tag);

_ADHOC_TOOLS_EXPORT_
bool adhoc_deinitializeNativeCrashHandler();


#endif // end of _ADHOC_TOOLS_NDK_UNCAUGHT_H_