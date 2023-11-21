# Ad-hoc cli tools

## adbop

Read or monitor Android app or device operation info:
- memory (process/device, virutal/physical)
- 32/64bit
- webview sandboxed process
- ... TODO.

[Usage]:
```shell
adbop --help

# Watch all cmd types (includes all of the CMD_TYPE below),
# open a browser tab and keep printing result on it.
adbop --process-name zygoat
adbop --process-name adhoc.android.playground

# If specify multiple processes, use it like this:
adbop \
    --process-name adhoc.android.playground \
    --process-name com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedProcessService0:0

# Read `adb shell dumpsys meminfo 123 -d` once. (123 is pid)
adbop dumpsys meminfo --process-name adhoc.android.playground
# Read `adb shell cat /proc/meminfo` once.
adbop proc meminfo
# Read `adb shell cat "/proc/123/status"` once. (123 is pid)
adbop proc status --process-name adhoc.android.playground
# Read process base info, including ancestor pids.
adbop proc baseinfo --process-name adhoc.android.playground
# Find probably webview sandboxed process.
adbop proc webview

# Note:
#   `--package-name` can be used the same as `--process-name`
```

At present the simple UI is like:

<img width="1589" alt="image" src="https://github.com/100pah/adhoc-tools/assets/1956569/97a59c2b-6380-4ad0-aea3-080e881752b5">

