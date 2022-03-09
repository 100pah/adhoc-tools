#ifndef _ADHOC_TOOLS_PERF_H_
#define _ADHOC_TOOLS_PERF_H_

#include <chrono>
#include <string>

#include "config.h"

namespace adhocperf {

class TimerItem {
  public:
    void start();
    void end();
    std::string flush();
  private:
    static const int LIST_MAX_LENGTH = _ADHOC_TOOLS_PERF_RECORDS_CAPACITY_;
    double mList[LIST_MAX_LENGTH];
    int mLen = 0;
    std::chrono::time_point<std::chrono::system_clock> mStart;
};


extern void summarizeAndPrintPerf();

#define _ADHOC_TOOLS_PERF_DECLARE_TIMER_ITME_(name) \
        extern TimerItem name;

_ADHOC_TOOLS_PERF_TIMER_ITEMS_(_ADHOC_TOOLS_PERF_DECLARE_TIMER_ITME_)

} // end of namespace adhocperf

#endif // _ADHOC_TOOLS_PERF_H_
