/// Most of the code and comments are copied and modified from:
/// https://testfairy.com/blog/ndk-crash-handling/
/// Thanks to their great work.

#include "adhoc-ndk-uncaught.h"

#include <assert.h>

#include <jni.h>
#include <csignal>
#include <cstdio>
#include <cstring>
#include <exception>
#include <memory>
#include <cxxabi.h>
#include <android/log.h>
#include <unistd.h>

#include <sstream>
#include <map>
#include <string>

#include "../ndk-backtrace/adhoc-ndk-backtrace.h"

#include "../common/adhoc-private.h"


/// For some older systems, signal handlers eat crashes entirely. For those rare cases,
/// we will need to trigger a signal after our initial handling is done to be able to
/// crash properly. Checking the Linux kernel sources, the author learnt that __NR_tgkill
/// will do the trick. Let’s copy its value to our source to finalize our imports.
/// This is tgkill syscall id (more signals available in many linux kernels)
#define __NR_tgkill 270

/// Helper macro to get size of an fixed length array during compile time
#define sizeofa(array) sizeof(array) / sizeof(array[0])


namespace {

static const char* s_tag = nullptr;

/// Caught signal numbers
static const int SIGNALS_TO_CATCH[] = {
        SIGABRT,
        SIGBUS,
        SIGFPE,
        SIGSEGV,
        SIGILL,
        SIGSTKFLT,
        SIGTRAP,
};
static const std::map<int, std::string> SIGNALS_DESC {
    {SIGABRT, "abort"},
    {SIGBUS, "bus error"},
    {SIGFPE, "floating point exception"},
    {SIGSEGV, "segmentation violation"},
    {SIGILL, "illegal instruction"},
    {SIGSTKFLT, "Stack fault on coprocessor"},
    {SIGTRAP, "trace trap"},
};

/// Signal handler context
struct CrashInContext {
    /// Old handlers of signals that we restore on de-initialization. Keep values for all possible
    /// signals, for unused signals nullptr value is stored.
    struct sigaction old_handlers[NSIG];
};
/// Crash handler function signature
typedef void (*CrashSignalHandler)(int, siginfo*, void*);
/// Global instance of context. Since an app can't crash twice in a single run, we can make this singleton.
static CrashInContext* crashInContext = nullptr;

/// Register signal handler for crashes
/// See https://man7.org/linux/man-pages/man2/sigaction.2.html
/// See https://man7.org/linux/man-pages/man7/signal.7.html
static bool registerSignalHandler(CrashSignalHandler handler, struct sigaction old_handlers[NSIG]) {
    struct sigaction sigactionstruct;
    memset(&sigactionstruct, 0, sizeof(sigactionstruct));
    sigactionstruct.sa_flags = SA_SIGINFO;
    sigactionstruct.sa_sigaction = handler;

    // Register new handlers for all signals
    for (int index = 0; index < sizeofa(SIGNALS_TO_CATCH); ++index) {
        const int sigNum = SIGNALS_TO_CATCH[index];

        if (sigaction(sigNum, &sigactionstruct, &old_handlers[sigNum])) {
            return false;
        }
    }

    return true;
}

/// Unregister already register signal handler
static void unregisterSignalHandler(struct sigaction old_handlers[NSIG]) {
    // Recover old handler for all signals
    for (int sigNum = 0; sigNum < NSIG; ++sigNum) {
        const struct sigaction* old_handler = &old_handlers[sigNum];

        if (!old_handler->sa_handler) {
            continue;
        }

        sigaction(sigNum, old_handler, nullptr);
    }
}

/// FIXME: Try to find cpp exception but not working for me. Do not know why yet.
static bool tryPrintCppException(int sigNum, siginfo* sigInfo) {
    void* currException = __cxxabiv1::__cxa_current_primary_exception();
    std::type_info* currExceptionTypeInfo = __cxxabiv1::__cxa_current_exception_type();

    if (!currException) {
        return false;
    }
    try {
        // Check if we can get the message
        if (currExceptionTypeInfo) {
            const char* exceptionName = currExceptionTypeInfo->name();
            std::stringstream out;
            out << terminalcolor::red;

            // Try demangling exception name
            int demangleStatus = -1;
            char* demangled = __cxxabiv1::__cxa_demangle(exceptionName, 0, 0, &demangleStatus);
            // The output demangleStatus:
            //    demangle_invalid_args = -3,
            //    demangle_invalid_mangled_name = -2,
            //    demangle_memory_alloc_failure = -1,
            //    demangle_success = 0,
            // If the symbol is not mangled, demangleStatus can be -2.
            // Check demangle demangleStatus
            if (NULL == demangled || 0 != demangleStatus) {
                // Couldn't demangle, go with exceptionName
                out << "Uncaught exception: " << exceptionName;
            } else {
                if (strstr(demangled, "nullptr") || strstr(demangled, "NULL")) {
                    // Could demangle, go with demangled and state that it was null
                    out << "Uncaught exception: " << demangled;
                } else {
                    // Could demangle, go with demangled and exception.what() if exists
                    try {
                        __cxxabiv1::__cxa_rethrow_primary_exception(currException);
                    } catch (std::exception& e) {
                        // Include message from what() in the abort message
                        out << "Uncaught exception: " << demangled << " " << e.what();
                    } catch (...) {
                        // Just report the exception type since it is not an std::exception
                        out << "Uncaught exception: " << demangled;
                    }
                }
            }
            out << terminalcolor::reset;
            __android_log_print(ANDROID_LOG_ERROR, s_tag, "%s", out.str().c_str());

            return true;
        } else {
            // Not a cpp exception, assume a custom crash and act like C
        }
    }
    catch (std::bad_cast& bc) {
        // Not a cpp exception, assume a custom crash and act like C
    }

    return false;
}

/// Create a crash message using whatever available such as signal, C++ exception etc
static void printCrashMessage(int sigNum, siginfo* sigInfo) {
    // It works to pring backtrace use this approach.
    adhoc_dumpCppBacktrace(s_tag);

    std::stringstream out;

    // See: https://man7.org/linux/man-pages/man2/sigaction.2.html
    // sigNum: signal number that caused the crash, lile SIGILL, SIGSEGV, SIGFPE, etc.
    // sigInfo->si_code: signal code for the signal number.
    //      For example, SIGILL has signal code like ILL_ILLOPC, ILL_ILLTRP, etc.
    if (!tryPrintCppException(sigNum, sigInfo)) {
        // Assume C crash and print signal no and code
        out << "Terminating with a C crash." << std::endl;
    }

    const char* sigNumDesc = "?";
    auto sigFindIt = SIGNALS_DESC.find(sigNum);
    if (sigFindIt != SIGNALS_DESC.end()) {
        sigNumDesc = sigFindIt->second.c_str();
    }

    out << terminalcolor::red
            << "Signal Number: " << sigNum << " (" << sigNumDesc << ") "
            << "Signal Code: " << sigInfo->si_code
            << terminalcolor::reset << std::endl;

    if (SIGSEGV == sigNum) {
        out << terminalcolor::lightGreen
                << "Notice: when segmentation violation occurs, the printed call stack may not be actually where the problem is."
                << terminalcolor::reset << std::endl;
    }

     __android_log_print(ANDROID_LOG_ERROR, s_tag, "%s", out.str().c_str());
}

/// Main signal handling function.
static void nativeCrashSignalHandler(int sigNum, siginfo* sigInfo, void* uctxvoid) {
    __android_log_print(ANDROID_LOG_ERROR, s_tag, "%s nativeCrashSignalHandler enter %s",
            terminalcolor::red, terminalcolor::reset);

    // Restoring an old handler to make built-in Android crash mechanism work.
    sigaction(sigNum, &crashInContext->old_handlers[sigNum], nullptr);

    // Log crash message
    printCrashMessage(sigNum, sigInfo);

    // In some cases we need to re-send a signal to run standard bionic handler.
    if (sigInfo->si_code <= 0 || sigNum == SIGABRT) {
        if (syscall(__NR_tgkill, getpid(), gettid(), sigNum) < 0) {
            __android_log_print(ANDROID_LOG_ERROR, s_tag, "%s nativeCrashSignalHandler __NR_tgkill exit %s",
                    terminalcolor::red, terminalcolor::reset);
            _exit(1);
        }
    }

    __android_log_print(ANDROID_LOG_ERROR, s_tag, "%s nativeCrashSignalHandler leave %s",
            terminalcolor::red, terminalcolor::reset);
}

} // end of anonymous namespace


void adhoc_initializeNativeCrashHandler(const char* tag) {
    assert(tag != nullptr);
    assert(s_tag == nullptr);
    assert(!crashInContext);

    s_tag = tag;

    __android_log_print(ANDROID_LOG_INFO, s_tag, "%s adhoc_initializeNativeCrashHandler init %s",
            terminalcolor::green, terminalcolor::reset);

    // Initialize singleton crash handler context
    crashInContext = static_cast<CrashInContext *>(malloc(sizeof(CrashInContext)));
    memset(crashInContext, 0, sizeof(CrashInContext));

    // Trying to register signal handler.
    if (!registerSignalHandler(&nativeCrashSignalHandler, crashInContext->old_handlers)) {
        adhoc_deinitializeNativeCrashHandler();
        __android_log_print(ANDROID_LOG_ERROR, s_tag, "%s adhoc_initializeNativeCrashHandler init failed. %s",
                terminalcolor::red, terminalcolor::reset);
        return;
    }

    __android_log_print(ANDROID_LOG_ERROR, s_tag, "adhoc_initializeNativeCrashHandler initialized.");
}

bool adhoc_deinitializeNativeCrashHandler() {
    // Check if already deinitialized
    if (!crashInContext) {
        return false;
    }

    // Unregister signal handlers
    unregisterSignalHandler(crashInContext->old_handlers);

    // Free singleton crash handler context
    free(crashInContext);
    crashInContext = nullptr;
    s_tag = nullptr;

    __android_log_print(ANDROID_LOG_ERROR, s_tag, "Native crash handler successfully deinitialized.");

    return true;
}

