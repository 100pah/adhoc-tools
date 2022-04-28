const sysFS = require('fs');
const sysPath = require('path');

const greenColor='\033[0;32m';
const resetColor='\033[0m';


function main() {
    const args = parseCliArgs();

    const logContent = sysFS.readFileSync(args.absoluteInputFilePath);
    const resultData = parseLogFile(logContent);

    // console.log(JSON.stringify(resultData, null, 4));

    const date = new Date();
    const timeTag = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}_${date.getHours()}${date.getMinutes()}${date.getSeconds()}_${date.getMilliseconds()}`;
    const resultFilePath = args.absoluteInputFilePath + '.result.' + timeTag + '.html';

    generateResultFile(resultFilePath, resultData);

    console.log('Result generated: ' + greenColor + resultFilePath + resetColor);
}

function parseCliArgs() {
    const args = process.argv.splice(2);
    const inputFilePath = args[0];

    if (!inputFilePath) {
        throw new Error('log file name is not specified.');
    }
    const absoluteInputFilePath = sysPath.resolve(inputFilePath);
    if (!sysFS.existsSync(inputFilePath)) {
        throw new Error(`log file ${inputFilePath} does not exist.`);
    }

    return {
        absoluteInputFilePath: absoluteInputFilePath
    }
}

function parseLogFile(content) {
    const resultData = [];
    const pendingByThreadId = {};

    function getPendingInThread(threadId) {
        return pendingByThreadId[threadId] || (pendingByThreadId[threadId] = {});
    }
    function illegalThrow(msg, beginOrEnd, traceId, threadId, tagName, timestamp, extMsg) {
        console.log('pendingByThreadId: ', pendingByThreadId);
        throw new Error(
            'Illegal log:' + msg + ' ' + [
                'beginOrEnd=' + beginOrEnd,
                'traceId=' + traceId,
                'threadId=' + threadId,
                'tagName=' + tagName,
                'timestamp=' + timestamp,
                'extMsg=' + extMsg,
            ].join(' ')
        );
    }

    const reg = /\-o\-o\-\[aDhOcTrAcE_(begin|end)\^_\^(.+)\^_\^(.+)\^_\^(.+)\^_\^(.+)\^_\^(.*)\]\-o\-o\-/g;
    while ((result = reg.exec(content)) != null) {
        const beginOrEnd = result[1];
        const traceId = result[2];
        const threadId = result[3];
        const tagName = result[4];
        const timestamp = result[5];
        const extMsg = result[6];

        if (!traceId || !threadId || !tagName || !timestamp) {
            illegalThrow('1', beginOrEnd, traceId, threadId, tagName, timestamp, extMsg);
        }

        const pendingInThread = getPendingInThread(threadId);

        console.log(beginOrEnd, threadId, tagName, timestamp, extMsg);

        if (beginOrEnd === 'begin') {
            const item = [threadId, tagName, timestamp, null, extMsg || ''];

            if (pendingInThread[traceId]) {
                illegalThrow('2', beginOrEnd, threadId, tagName, timestamp, extMsg);
            }
            pendingInThread[traceId] = item;
        }
        else { // end
            const item = pendingInThread[traceId];
            if (!item) {
                illegalThrow('3', beginOrEnd, threadId, tagName, timestamp, extMsg);
            }
            item[3] = timestamp;
            resultData.push(item);
            pendingInThread[traceId] = null;
        }
    }

    return resultData;
}

function generateResultFile(resultFilePath, resultData) {
    const tplContent = sysFS.readFileSync(sysPath.join(__dirname, 'chart_template.html'), {encoding: 'utf8'});
    const ecContent = sysFS.readFileSync(sysPath.join(__dirname, 'echarts.min.js'), {encoding: 'utf8'});

    const resultContent = tplContent
        .replace('/*[_[_[ECHARTS_CONTENT]_]_]*/', ecContent)
        .replace('/*[_[_[RESULT_DATA]_]_]*/', JSON.stringify(resultData));

    sysFS.writeFileSync(resultFilePath, resultContent, {encoding: 'utf8'});
}

main();
