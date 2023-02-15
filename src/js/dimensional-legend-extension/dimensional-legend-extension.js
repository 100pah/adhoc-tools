(function (root, factory) {
    if (typeof define === 'function' && define.amd) { define([], factory); }
    else if (typeof module === 'object' && module.exports) { module.exports = factory(); }
    else { root.dimensionalLegendExtension = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {


    var LEGEND_VALUE_MARK = 'l|^_^|ext' + Math.random().toFixed(3);
    var DUMMY_SERIES_ID = 's|^_^|ext' + Math.random().toFixed(3);
    var ENCODING_VALUE_INDEX = 0;
    var ENCODING_DIMENSION_INDEX = 1;
    var ENCODING_SERIES_INDEX = 2;
    var ENCODING_LEGEND_INDEX = 3;

    var arraySlice = Array.prototype.slice;
    var objToString = Object.prototype.toString;

    function isArray(value) {
        if (Array.isArray) {
            return Array.isArray(value);
        }
        return objToString.call(value) === '[object Array]';
    }

    function toArray(val) {
        return isArray(val) ? val
            : val == null ? []
            : [val]
    }

    function pushArray(targetArr, otherArr) {
        for (var i = 0; i < otherArr.length; i++) {
            targetArr.push(otherArr[i]);
        }
    }

    function isObject(value) {
        // Avoid a V8 JIT bug in Chrome 19-20.
        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
        const type = typeof value;
        return type === 'function' || (!!value && type === 'object');
    }

    function checkValid(condition, errorMessage) {
        if (!condition) {
            throw new Error(errorMessage);
        }
    }

    // Hint that the data is from legend and envelop the dimension info to it.
    function encodeValue(value, dimensionIndex, seriesIndex, legendIndex) {
        var arr = [];
        arr[ENCODING_VALUE_INDEX] = value;
        arr[ENCODING_DIMENSION_INDEX] = dimensionIndex;
        arr[ENCODING_SERIES_INDEX] = seriesIndex;
        arr[ENCODING_LEGEND_INDEX] = legendIndex;
        return arr.join(LEGEND_VALUE_MARK);
    }

    function decodeValue(value) {
        return value.split(LEGEND_VALUE_MARK);
    }

    function isEncodedValue(value) {
        return value && (value + '').indexOf(LEGEND_VALUE_MARK) >= 0;
    }

    function travelSourceData(sourceData, dimensionIndex, onValue) {
        for (var i = 0; i < sourceData.length; i++) {
            var itemArr = sourceData[i];
            if (!isArray(itemArr)) {
                continue;
            }
            if (dimensionIndex != null) {
                onValue(itemArr[dimensionIndex], i);
            }
            else {
                onValue(itemArr, i);
            }
        }
    }

    function queryDataIndex(encodedValue, chart) {
        var decoded = decodeValue(encodedValue);
        var valueStr = decoded[ENCODING_VALUE_INDEX];
        var dimensionIndex = +decoded[ENCODING_DIMENSION_INDEX];
        var seriesIndex = +decoded[ENCODING_SERIES_INDEX];

        var sourceData = chart.__dle_sourceData;
        var dataIndexArr = [];

        travelSourceData(sourceData, dimensionIndex, function (val, dataIndex) {
            if (val + '' === valueStr) {
                dataIndexArr.push(dataIndex);
            }
        });

        return {dataIndexArr: dataIndexArr, seriesIndex: seriesIndex};
    }

    function eachDimensionalLegendOption(legendOption, cb) {
        var legendOptionArr = toArray(legendOption);
        for (var legendIndex = 0; legendIndex < legendOptionArr.length; legendIndex++) {
            var singleLegendOption = legendOptionArr[legendIndex];
            if (!isObject(singleLegendOption)) {
                continue;
            }
            var dimensionIndex = getDimensionIndex(singleLegendOption);
            if (dimensionIndex != null) {
                cb(singleLegendOption, legendIndex, dimensionIndex);
            }
        }
    }

    function getDimensionIndex(legendOption) {
        // Do not use default value. No `__ext_dimensionIndex` means not
        // dimensional legend.
        return legendOption.__ext_dimensionIndex;
    }

    function getDatasetIndex(legendOption) {
        return legendOption.__ext_datasetIndex || 0;
    }

    function getSeriesIndex(legendOption) {
        return legendOption.__ext_seriesIndex || 0;
    }

    function collectLegendData(sourceData, dimensionIndex, seriesIndex, legendIndex) {
        // For removing duplicated.
        var selected = {};
        var data = [];

        travelSourceData(sourceData, dimensionIndex, function (val) {
            if (val == null) {
                return;
            }
            var encoded = encodeValue(val, dimensionIndex, seriesIndex, legendIndex);
            if (!selected.hasOwnProperty(encoded)) {
                data.push(encoded);
            }
            // By default, all legend items are selected.
            selected[encoded] = true;
        })

        return {data: data, selected: selected};
    }

    function hackLegendFormatter(originalLegendFormatter) {
        return function (value) {
            var args = arraySlice.call(arguments);
            var decoded = decodeValue(value);
            var newValue = args[0] = decoded[ENCODING_VALUE_INDEX];

            if (originalLegendFormatter) {
                return originalLegendFormatter.apply(this, args);
            }
            return newValue;
        };
    }

    function addColor(singleLegendOption, legendData) {
        var colors = singleLegendOption.__ext_colors;
        if (colors == null) {
            return legendData;
        }
        if (!isArray(colors)) {
            throw new Error('color needs to be an array');
        }
        var newLegendData = legendData.slice();
        for (var i = 0; i < legendData.length; i++) {
            newLegendData[i] = {
                name: legendData[i],
                itemStyle: {
                    color: colors[i % colors.length]
                }
            };
        }
        return newLegendData;
    }

    function hackOption(option, chart) {
        if (!option) {
            return option;
        }
        if (!isObject(option)) {
            throw new Error('Only object option is supported');
        }

        var originalLegendOptionArr = toArray(option.legend);
        if (!originalLegendOptionArr.length) {
            return option;
        }
        var originalDatasetOptionArr = toArray(option.dataset);

        var hasExtLengend = false;
        var dummySeriesData = [];
        var newOption = Object.assign({}, option);
        newOption.legend = originalLegendOptionArr.slice();

        var originalSeriesOptionArr = toArray(option.series);
        var newSeriesOptionArr = newOption.series = originalSeriesOptionArr.slice();

        eachDimensionalLegendOption(originalLegendOptionArr, handleDimensionalLegendOption);
        function handleDimensionalLegendOption(originalSingleLegendOption, legendIndex, dimensionIndex) {
            hasExtLengend = true;

            var datasetIndex = getDatasetIndex(originalSingleLegendOption);
            var datasetOption = originalDatasetOptionArr[datasetIndex];
            // TODO: At present only support to hit on one series when hover
            // or click on legend.
            // Because `payload.batch` not fully supported in focus-blur in echarts,
            // where only the seriesIndex declared in the last batch item will be hit.
            var seriesIndex = getSeriesIndex(originalSingleLegendOption);

            checkValid(isObject(datasetOption), 'dataset must be used');
            var dimensions = datasetOption.dimensions;
            checkValid(isArray(dimensions), '`dataset.dimensions` must be specified');
            var sourceData = datasetOption.source;
            checkValid(isArray(sourceData), '`dataset.source` must be specified');

            var newSingleLegendOption = newOption.legend[legendIndex] = Object.assign({}, originalSingleLegendOption);

            var collected = collectLegendData(sourceData, dimensionIndex, seriesIndex, legendIndex);
            var legendData = collected.data;
            legendData = addColor(originalSingleLegendOption, legendData);

            newSingleLegendOption.data = legendData;
            // If we do not set `selected`, the `chart.getOption().legend[i].selected` will not contain
            // all legend data values, which makes the latter calculations incorrect.
            newSingleLegendOption.selected = collected.selected;

            for (var j = 0; j < collected.data.length; j++) {
                dummySeriesData.push({name: collected.data[j], value: 1});
            }

            newSingleLegendOption.formatter = hackLegendFormatter(originalSingleLegendOption.formatter);

            chart.__dle_sourceData = sourceData;

            var singleSeriesOption = newSeriesOptionArr[seriesIndex];
            if (isObject(singleSeriesOption)) {
                var newSingleSeriesOption = newSeriesOptionArr[seriesIndex] = Object.assign({}, singleSeriesOption);
                // FIXME: warn users if overwrite their setting?
                newSingleSeriesOption.selectedMode = 'multiple';
                var originalSelectOption = Object.assign({}, singleSeriesOption.select || {});
                newSingleSeriesOption.select = Object.assign(originalSelectOption, {
                    itemStyle: {
                        borderWidth: 0,
                        opacity: 0.2,
                    },
                    label: {
                        show: false
                    }
                });
            }
        }

        if (hasExtLengend) {
            var hasDummySeries = false;
            // Only when using `chart.setOption(chart.getOption())` this case will be encountered:
            for (var i = 0; i < originalSeriesOptionArr.length; i++) {
                var originalSingleSeriesOption = originalSeriesOptionArr[i];
                if (isObject(originalSingleSeriesOption) && originalSingleSeriesOption.id == DUMMY_SERIES_ID) {
                    hasDummySeries = true;
                }
            }

            // Add a dummy pie series to make all the ext legend display.
            if (!hasDummySeries) {
                newSeriesOptionArr.push({
                    id: DUMMY_SERIES_ID,
                    type: 'pie',
                    data: dummySeriesData,
                    radius: 0,
                    center: [-10, -10],
                    label: {show: false},
                    labelLine: {show: false},
                    slient: true
                });
            }
        }

        return newOption;
    }

    function hackHighDownPayload(originalPayload, chart) {
        if (!isEncodedValue(originalPayload.name)) {
            // Payload is not from a dimesional legend.
            return originalPayload;
        }

        var target = queryDataIndex(originalPayload.name, chart);

        return {
            type: originalPayload.type,
            dataIndex: target.dataIndexArr,
            seriesIndex: target.seriesIndex
        };
    }

    function collectLegendSelectorPayloadData(chart) {
        // If two legend items control the same data item, and one legend item is selected and
        //  the other one is unselected, we follow the strategy:
        //  A data item will display if and only if:
        //  + The data item satisfies all of the legends selection ("and" relationship)
        //  + In any single legend, the data item satisfies some of the legend items ("or" relationship)

        var sourceData = chart.__dle_sourceData;

        var option = chart.getOption();
        var legendOptionArr = toArray(option.legend);

        var seriesIndexArr = [];
        var valueStrSelectedList = [];
        eachDimensionalLegendOption(legendOptionArr, function (singleLegendOption, legendIndex, dimensionIndex) {
            var seriesIndex = getSeriesIndex(singleLegendOption);
            seriesIndexArr.push(seriesIndex);
            var selected = singleLegendOption.selected;
            var valueStrSelected = {};
            for (var legendDataItem in selected) {
                if (!selected.hasOwnProperty(legendDataItem)) {
                    continue;
                }
                var decoded = decodeValue(legendDataItem);
                var valueStr = decoded[ENCODING_VALUE_INDEX];
                valueStrSelected[valueStr] = selected[legendDataItem];
            }
            valueStrSelectedList.push({
                valueStrSelected: valueStrSelected,
                dimensionIndex: dimensionIndex
            });
        });

        var dataIndexArrShow = [];
        var dataIndexArrHide = [];
        travelSourceData(sourceData, null, function (valArr, dataIdx) {
            var satisfyAllLegend = true;
            for (var i = 0; i < valueStrSelectedList.length; i++) {
                var dimensionIndex = valueStrSelectedList[i].dimensionIndex;
                var valueStrSelected = valueStrSelectedList[i].valueStrSelected;
                if (!valueStrSelected[valArr[dimensionIndex]]) {
                    satisfyAllLegend = false;
                }
            }
            if (satisfyAllLegend) {
                dataIndexArrShow.push(dataIdx);
            }
            else {
                dataIndexArrHide.push(dataIdx);
            }
        });

        return {
            seriesIndexArr: seriesIndexArr,
            dataIndexArrShow: dataIndexArrShow,
            dataIndexArrHide: dataIndexArrHide,
        };
    }

    function triggerSelectionUpdate(chart) {
        setTimeout(function () {
            var collected = collectLegendSelectorPayloadData(chart);

            // Use 'unselect' represents data item show, while 'select' represents data item hide.
            chart.__dle_dispatchAction({
                type: 'select',
                // batch: batchResult.hide
                seriesIndex: collected.seriesIndexArr,
                dataIndex: collected.dataIndexArrHide
            });
            chart.__dle_dispatchAction({
                type: 'unselect',
                // batch: batchResult.show
                seriesIndex: collected.seriesIndexArr,
                dataIndex: collected.dataIndexArrShow
            });
        }, 0);
    }

    function hackChart(chart) {

        function hackDispatchAction(host) {
            var originalDispatchAction = host.__dle_dispatchAction = host.dispatchAction;
            host.dispatchAction = function (payload) {
                var newArgs = arraySlice.call(arguments);
                var payloadType = payload ? payload.type : null;
                if (payloadType === 'highlight' || payloadType === 'downplay') {
                    newArgs[0] = hackHighDownPayload(payload, chart);
                }
                else if (
                    payloadType === 'legendToggleSelect'
                    || payloadType === 'legendAllSelect'
                    || payloadType === 'legendInverseSelect'
                ) {
                    triggerSelectionUpdate(chart);
                }
                originalDispatchAction.apply(chart, newArgs);
            };
        }

        if (!chart._api || !chart._api.dispatchAction) {
            throw new Error('not supported echarts version.');
        }

        hackDispatchAction(chart._api);
        hackDispatchAction(chart);

        var originalSetOption = chart.setOption;
        chart.setOption = function (option) {
            var newArgs = arraySlice.call(arguments);
            newArgs[0] = hackOption(option, chart);
            originalSetOption.apply(chart, newArgs);
        };

        return chart;
    }

    function init(echarts) {
        var otherInitArgs = arraySlice.call(arguments, 1)
        var chart = echarts.init.apply(echarts, otherInitArgs);
        return hackChart(chart);
    }

    return {
        init: init
    };

}));
