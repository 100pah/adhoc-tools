# Ad-hoc cli tools

## adbop

UI like:
<img width="1576" alt="image" src="https://github.com/100pah/adhoc-tools/assets/1956569/aa1f3ad6-3ce3-4728-aa24-06dd1f95ab52">

Read or monitor Android app or device operation info:
- memory (process/device, virutal/physical)
- ... TODO.

[Usage]:
```shell
adbop --help

# Watch all cmd types (includes all of the CMD_TYPE below),
# open a browser tab and keep printing result on it.
adbop --process-name adhoc.android.playground

# If specify multiple processes, use it like this:
adbop \
    --process-name adhoc.android.playground \
    --process-name com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedProcessService0:0

# Read `adb shell dumpsys meminfo 123 -d` once. (123 is pid)
adbop dumpsys meminfo --process-name adhoc.android.playground
# Read `adb shell cat /proc/meminfo` once.
adbop proc meminfo --process-name adhoc.android.playground
# Read `adb shell cat "/proc/123/status"` once. (123 is pid)
adbop proc status --process-name adhoc.android.playground

# Note:
#   `--package-name` can be used the same as `--process-name`
```
