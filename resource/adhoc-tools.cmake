# Include this file in your own CMakeLists.txt or sub cmake files.
# And call `enable_adhoc_tools()`

function(enable_adhoc_tools)

    set(ADHOC_TOOLS_PROJECT_DIR /your/path/to/adhoc-tools)
    set(ADHOC_TOOLS_SRC_DIR ${ADHOC_TOOLS_PROJECT_DIR}/src/cpp)
    set(ADHOC_TOOLS_NDK_MOD_INCLUDE_DIR ${ADHOC_TOOLS_PROJECT_DIR}/ndk-mod-include/20.1.5948944)

    # Or use `target_include_directories`
    include_directories(
        ${ADHOC_TOOLS_NDK_MOD_INCLUDE_DIR}
        ${ADHOC_TOOLS_SRC_DIR}
        # ...
    )

    target_sources(
        your_so_name

        # If use adhoc-ndk-uncaught & adhoc-ndk-backtrace
        PRIVATE ${ADHOC_TOOLS_SRC_DIR}/adhoc/ndk-backtrace/adhoc-ndk-backtrace.cpp
        # If use adhoc-ndk-backtrace
        PRIVATE ${ADHOC_TOOLS_SRC_DIR}/adhoc/ndk-uncaught/adhoc-ndk-uncaught.cpp
        # If use adhoc-perf
        PRIVATE ${ADHOC_TOOLS_SRC_DIR}/adhoc/perf/adhoc-perf.cpp
    )

endfunction()
