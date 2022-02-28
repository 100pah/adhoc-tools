#ifndef _ADHOC_TOOLS_PRIVATE_H_
#define _ADHOC_TOOLS_PRIVATE_H_

namespace {

namespace terminalcolor {
#ifndef _ADHOC_TOOLS_DONT_USE_TERMINAL_COLOR_
    // See https://en.wikipedia.org/wiki/ANSI_escape_code
    static const char red[] = "\033[0;31m";
    static const char green[] = "\033[0;32m";
    static const char lightGreen[] = "\033[1;32m";
    static const char reset[] = "\033[0m";
#else
    static const char red[] = "";
    static const char green[] = "";
    static const char lightGreen[] = "";
    static const char reset[] = "";
#endif
};

} // end of anonymous namespace


#endif // end of _ADHOC_TOOLS_PRIVATE_H_