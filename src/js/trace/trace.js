
var adhocTrace = (function () {
    var delimiter = '^_^';
    function format(beginOrEnd, traceId, threadId, tagName, time, extMsg = '') {
        return '-o-o-[aDhOcTrAcE_' + beginOrEnd + delimiter + traceId
            + delimiter + threadId + delimiter + tagName
            + delimiter + time + delimiter + (extMsg || '') + ']-o-o-';
    }
    return function (logger, threadId, tagName, extMsg = '') {
        if (threadId == null || threadId === '' || tagName == null || tagName === '') {
            throw new Error('threadId or tagName is null, undefined or "" (' + threadId + ' ' + tagName + ')');
        }
        var time = (new Date()).getTime();
        var traceId = time + '_' + Math.random();
        logger(format('begin', traceId, threadId, tagName, time, extMsg));
        return function () {
            logger(format('end', traceId, threadId, tagName, (new Date()).getTime(), extMsg));
        }
    }
})();
