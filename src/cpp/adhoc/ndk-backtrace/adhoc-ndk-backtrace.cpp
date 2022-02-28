// There are some precondition for using demangling,
// see https://stackoverflow.com/a/35585744
// #define _ADHOC_TOOLS_NDK_BACKTRACE_DONT_DEMANGLE_ 1

#include "adhoc-ndk-backtrace.h"
#include <unwind.h>
#include <dlfcn.h> // For dladdr()
#include <cstdlib>
#include <sstream>
#include <iomanip> // For std::setw()
#include <android/log.h> // Only for __android_log_print
#ifndef _ADHOC_TOOLS_NDK_BACKTRACE_DONT_DEMANGLE_
#include <cxxabi.h> // Only for demangling
#endif

#include "../common/adhoc-private.h"


namespace {

const size_t BUFFER_MAX = 500;

struct BacktraceState {
    void** current; // pointer of addr
    void** end; // pointer of addr
};

static _Unwind_Reason_Code unwindCallback(
        _Unwind_Context* context, void* arg) {
    BacktraceState* state = static_cast<BacktraceState*>(arg);
    uintptr_t pc = _Unwind_GetIP(context);
    if (pc) {
        if (state->current == state->end) {
            return _URC_END_OF_STACK;
        }
        else {
            *state->current++ = reinterpret_cast<void*>(pc);
        }
    }
    return _URC_NO_REASON;
}

} // end of anonymous namespace


void adhoc_dumpCppBacktrace(const char* tag) {

    __android_log_print(ANDROID_LOG_ERROR, tag, "============ C++ StackTrace End ============");

    void *buffer[BUFFER_MAX];

    // capture backtrace
    BacktraceState state = {buffer, buffer + BUFFER_MAX};
    _Unwind_Backtrace(unwindCallback, &state);
    size_t count = state.current - buffer;

    // dump backtrace
    int index = 0;
    for (size_t idx = 0; idx < count; ++idx) {
        const void* addr = buffer[idx];
        const char* symbol = NULL;
        const char* objFileName = NULL;
        // const void* symbolAddr;
        // const void* objFileBaseAddr;
        void* addrToBase;
        Dl_info info;

        // Find the nearest symbol by the address.
        if (dladdr(addr, &info) && info.dli_sname) {
            symbol = info.dli_sname;
            objFileName = info.dli_fname;
            addrToBase = reinterpret_cast<void *>(
                    reinterpret_cast<const size_t>(addr) - reinterpret_cast<const size_t>(info.dli_fbase));
            // symbolAddr = info.dli_saddr;
            // objFileBaseAddr = info.dli_fbase;

            // FIXME:
            // How to implement addr2line here?
            // https://android.googlesource.com/platform/ndk/+/5e0720014efeafbf6228ae4cd93b3968c1de53fc/sources/host-tools/ndk-stack/elff/dwarf_cu.cc?autodive=0%2F%2F
        }
        if (!symbol) {
            continue;
        }
        std::stringstream symbolOut;

#ifndef _ADHOC_TOOLS_NDK_BACKTRACE_DONT_DEMANGLE_
        int demangleStatus = 0;
        char* demangled = __cxxabiv1::__cxa_demangle(symbol, 0, 0, &demangleStatus);
        // The output demangleStatus:
        //    demangle_invalid_args = -3,
        //    demangle_invalid_mangled_name = -2,
        //    demangle_memory_alloc_failure = -1,
        //    demangle_success = 0,
        // If the symbol is not mangled, demangleStatus can be -2.
        if (NULL != demangled && 0 == demangleStatus) {
            symbolOut << terminalcolor::red << demangled << terminalcolor::reset <<
                    "  (original mangled symbol: " << symbol << ")";
        }
        else {
            symbolOut << terminalcolor::red << symbol << terminalcolor::reset;
            // __android_log_print(ANDROID_LOG_ERROR, tag, "Demangle failed. status: %d", demangleStatus);
        }
#elif
        symbolOut << terminalcolor::red << symbol << terminalcolor::reset;
#endif

        std::stringstream lineStream;
        lineStream << terminalcolor::red << "    #" << std::setw(2) << index++ << ": " << terminalcolor::reset
                << addrToBase << "  " << symbolOut.str().c_str() << " @" << objFileName << "\n";
        __android_log_print(ANDROID_LOG_ERROR, tag, "%s", lineStream.str().c_str());

#ifndef _ADHOC_TOOLS_NDK_BACKTRACE_DONT_DEMANGLE_
        if (NULL != demangled) {
            std::free(demangled);
        }
#endif

    }

    __android_log_print(ANDROID_LOG_ERROR, tag, "============ C++ StackTrace End ============");
}
