/// -----------------------------------------
/// Should be able to included in <assert.h>
/// Should be able to compiled by C compiler.
/// -----------------------------------------

/// [Get source file and line number]
/// Do not know how to implement it yet.
/// So we have to use `addr2line` to get line number.

#ifndef _ADHOC_TOOLS_NDK_BACKTRACE_H_
#define _ADHOC_TOOLS_NDK_BACKTRACE_H_

#include "../common/adhoc-public.h"

_ADHOC_TOOLS_EXPORT_
void adhoc_dumpCppBacktrace(const char* tag);

#endif // end of _ADHOC_TOOLS_NDK_BACKTRACE_H_