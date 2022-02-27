/// [Features]
/// Available to be included in <assert.h>
/// Available to be included in C.

/// [Get source file and line number]
/// Do not know how to implement it yet.
/// So we have to use `addr2line` to get line number.

#ifndef _ADHOC_NDK_BACKTRACE_H_
#define _ADHOC_NDK_BACKTRACE_H_

#include "../common/adhoc-common.h"

ADHOC_EXPORT
void adhoc_dumpCppBacktrace(const char* tag);

#endif // end of _ADHOC_NDK_BACKTRACE_H_
