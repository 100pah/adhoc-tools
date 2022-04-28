
## Trace log

Temp way:
Copy functions in `trace.js` and paste to your code,
and print the result to your app log.

Usage:
```js
var end1;
try {
    end1 = adhocTrace(console.log, 'threadA', 'worker_minify');
    doSomething();
    // NOTICE: trace async procedure will count sleeping time into the result!
    // await doSomething();
    end1();
    return result;
} catch (err) {
    end1();
    throw err;
}
```
The `log` function is your log function in your program: `(msg: string) => void`

## Parse log
```shell
node parse_trace.js /your/path/to/1.log
```
For example:
```shell
node parse_trace.js demo.log
```
