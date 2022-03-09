#include "adhoc-perf.h"

#include <chrono>
#include <string>
#include <sstream>

#include "config.h"
#include "../common/adhoc-private.h"
#include _ADHOC_TOOLS_PERF_LOG_INCLUDE_

namespace adhocperf {

void TimerItem::start() {
    mStart = std::chrono::system_clock::now();
}

void TimerItem::end() {
    if (mLen >= LIST_MAX_LENGTH) { return; }
    mList[mLen++] = std::chrono::duration_cast<std::chrono::duration<double, std::milli>>(
            std::chrono::system_clock::now() - mStart).count();
}

std::string TimerItem::flush() {
    if (mLen == 0) { return "{count: 0}"; }
    double totalTime = 0;
    for (int i = 0; i < mLen; i++) { totalTime += mList[i]; }
    double avg = totalTime / (double)mLen;
    std::string msg = "{count: " + std::to_string(mLen) + ", average: " + std::to_string(avg) + " ms}, ";
    mLen = 0;
    return msg;
}


#define _ADHOC_TOOLS_PERF_DFINE_TIMER_ITME_(name) \
        TimerItem name;

_ADHOC_TOOLS_PERF_TIMER_ITEMS_(_ADHOC_TOOLS_PERF_DFINE_TIMER_ITME_)

#define _ADHOC_TOOLS_PERF_PRINT_TIMER_ITME_(name) \
        << terminalcolor::lightGreen << #name ": " << terminalcolor::reset << name.flush().c_str()

void summarizeAndPrintPerf() {
    std::stringstream strToPrint;

    strToPrint _ADHOC_TOOLS_PERF_TIMER_ITEMS_(_ADHOC_TOOLS_PERF_PRINT_TIMER_ITME_);

    _ADHOC_TOOLS_PERF_LOG_("%s", strToPrint.str().c_str());
}

} // end of namespace adhocperf
