(function (root, factory) {
    if (typeof define === 'function' && define.amd) { define([], factory); }
    else if (typeof module === 'object' && module.exports) { module.exports = factory(); }
    else { root.dimensionalLegendExtension = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {


    var LEGEND_VALUE_MARK = 'l|^_^|ext' + Math.random().toFixed(3);
    var DUMMY_SERIES_ID = 's|^_^|ext' + Math.random().toFixed(3);
    var ENCODING_VALUE_INDEX = 0;
    var ENCODING_LEGEND_INDEX = 1;

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
    function encodeValue(value, legendIndex) {
        var arr = [];
        arr[ENCODING_VALUE_INDEX] = value;
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

        var allLegendSeriesConfigs = chart.__dle_allLegendSeriesConfigs;
        var payloadMapBySeriesIndex = [];

        for (var legendIndex = 0; legendIndex < allLegendSeriesConfigs.length; legendIndex++) {
            var singleLegendSeriesConfigs = allLegendSeriesConfigs[legendIndex];
            if (singleLegendSeriesConfigs == null) {
                continue;
            }
            for (var seriesIndex = 0; seriesIndex < singleLegendSeriesConfigs.length; seriesIndex++) {
                var singleSeriesConfig = singleLegendSeriesConfigs[seriesIndex];
                if (singleSeriesConfig == null) {
                    continue;
                }
                var singlePayload = payloadMapBySeriesIndex[seriesIndex];
                if (singlePayload == null) {
                    singlePayload = payloadMapBySeriesIndex[seriesIndex] = {
                        seriesIndex: seriesIndex,
                        dataIndex: []
                    };
                }
                travelSourceData(
                    singleSeriesConfig.sourceData,
                    singleSeriesConfig.dimensionIndex,
                    function (val, dataIndex) {
                        if (val + '' === valueStr) {
                            singlePayload.dataIndex.push(dataIndex);
                        }
                    }
                );
            }
        }

        var payloadBatch = [];
        for (var seriesIndex = 0; seriesIndex < payloadMapBySeriesIndex.length; seriesIndex++) {
            if (payloadMapBySeriesIndex[seriesIndex] != null) {
                payloadBatch.push(payloadMapBySeriesIndex[seriesIndex]);
            }
        }

        return payloadBatch;
    }

    function findIndexByIdFromEChartsOption(componentOption, id) {
        var optionArr = toArray(componentOption);
        for (var componentIndex = 0; componentIndex < optionArr.length; componentIndex++) {
            if (optionArr[componentIndex].id === id) {
                return componentIndex;
            }
        }
        return null;
    }

    function prepareAllLegendSeriesConfigs(
        legendOption,
        datasetOption,
        seriesOption,
        chart,
        dleUID,
        echarts
    ) {
        var legendOptionArr = toArray(legendOption);
        var datasetOptionArr = toArray(datasetOption);
        var seriesOptionArr = toArray(seriesOption);

        checkValid(chart.__dle_allLegendSeriesConfigs == null);

        // Key: legendIndex
        var allLegendSeriesConfigs = [];
        chart.__dle_allLegendSeriesConfigs = allLegendSeriesConfigs;
        echarts.__dle_allLegendSeriesConfigsForAllCharts[dleUID] = allLegendSeriesConfigs;

        for (var legendIndex = 0; legendIndex < legendOptionArr.length; legendIndex++) {
            var singleLegendOption = legendOptionArr[legendIndex];

            // Do not use default value. No `__ext_series` means not use this feature.
            // [{seriesId: ..., dimensionIndex: ..., datasetId: ...}, ...]
            var rawSeriesConfigs = singleLegendOption.__ext_series || [];
            var legendSeriesConfigs = [];
            allLegendSeriesConfigs[legendIndex] = legendSeriesConfigs;

            for (var seriesIndex = 0; seriesIndex < rawSeriesConfigs.length; seriesIndex++) {
                var singleLegendSeriesConfig = rawSeriesConfigs[seriesIndex];

                checkValid(singleLegendSeriesConfig.seriesId != null, 'seriesId must be specified');
                checkValid(singleLegendSeriesConfig.datasetId != null, 'datasetId must be specified');
                checkValid(singleLegendSeriesConfig.dimensionIndex != null, 'dimensionIndex must be specified');

                var seriesIndex = findIndexByIdFromEChartsOption(seriesOptionArr, singleLegendSeriesConfig.seriesId);
                var datasetIndex = findIndexByIdFromEChartsOption(datasetOptionArr, singleLegendSeriesConfig.datasetId);

                checkValid(seriesIndex != null);
                var datasetOption = datasetOptionArr[datasetIndex];
                checkValid(isObject(datasetOption), 'dataset must be used');
                var dimensions = datasetOption.dimensions;
                checkValid(isArray(dimensions), '`dataset.dimensions` must be specified');
                var sourceData = datasetOption.source;
                checkValid(isArray(sourceData), '`dataset.source` must be specified');


                legendSeriesConfigs[seriesIndex] = {
                    seriesIndex: seriesIndex,
                    dimensionIndex: singleLegendSeriesConfig.dimensionIndex,
                    datasetIndex: datasetIndex,
                    datasetOption: datasetOption,
                    dimensions: dimensions,
                    sourceData: sourceData
                };
            }
        }
    }

    function eachDimensionalLegendOption(legendOption, allLegendSeriesConfigs, cb) {
        var legendOptionArr = toArray(legendOption);
        for (var legendIndex = 0; legendIndex < allLegendSeriesConfigs.length; legendIndex++) {
            var singleLegendSeriesConfigs = allLegendSeriesConfigs[legendIndex];
            if (singleLegendSeriesConfigs == null) {
                continue;
            }
            var singleLegendOption = legendOptionArr[legendIndex];
            if (!isObject(singleLegendOption)) {
                continue;
            }
            cb(singleLegendOption, legendIndex, singleLegendSeriesConfigs)
        }
    }

    function collectLegendData(singleLegendSeriesConfigs, legendIndex) {
        var encodedData = [];
        // Also used for removing duplication.
        var selected = {};

        for (var i = 0; i < singleLegendSeriesConfigs.length; i++) {
            var legendSeriesConfig = singleLegendSeriesConfigs[i];
            if (legendSeriesConfig == null) {
                continue;
            }

            travelSourceData(legendSeriesConfig.sourceData, legendSeriesConfig.dimensionIndex, function (val) {
                if (val == null) {
                    return;
                }
                var encoded = encodeValue(val, legendIndex);
                if (!selected.hasOwnProperty(encoded)) {
                    encodedData.push(encoded);
                }
                // By default, all legend items are selected.
                selected[encoded] = true;
            });
        }

        return {data: encodedData, selected: selected};
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

    function hackOption(option, chart, echarts) {
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

        newOption.__dle_uid = Math.random();

        newOption.legend = originalLegendOptionArr.slice();

        var originalSeriesOptionArr = toArray(option.series);
        var newSeriesOptionArr = newOption.series = originalSeriesOptionArr.slice();

        prepareAllLegendSeriesConfigs(
            newOption.legend,
            newOption.dataset,
            newOption.series,
            chart,
            newOption.__dle_uid,
            echarts
        );

        eachDimensionalLegendOption(
            newOption.legend,
            chart.__dle_allLegendSeriesConfigs,
            handleDimensionalLegendOption
        );
        function handleDimensionalLegendOption(originalSingleLegendOption, legendIndex, singleLegendSeriesConfigs) {
            hasExtLengend = true;

            var newSingleLegendOption = newOption.legend[legendIndex] = Object.assign({}, originalSingleLegendOption);

            var collected = collectLegendData(singleLegendSeriesConfigs, legendIndex);
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

        var batch = queryDataIndex(originalPayload.name, chart);

        return {
            type: originalPayload.type,
            batch: batch
        };
    }

    function hackChart(chart, echarts) {

        function hackDispatchAction(host) {
            var originalDispatchAction = host.__dle_dispatchAction = host.dispatchAction;
            host.dispatchAction = function (payload) {
                var newArgs = arraySlice.call(arguments);
                var payloadType = payload ? payload.type : null;
                if (payloadType === 'highlight' || payloadType === 'downplay') {
                    newArgs[0] = hackHighDownPayload(payload, chart);
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
            newArgs[0] = hackOption(option, chart, echarts);
            originalSetOption.apply(chart, newArgs);
        };

        return chart;
    }

    function dimensionalLegendFilter(echarts, ecModel) {
        var allLegendSeriesConfigs = echarts.__dle_allLegendSeriesConfigsForAllCharts[ecModel.option.__dle_uid];
        for (var legendIndex = 0; legendIndex < allLegendSeriesConfigs.length; legendIndex++) {
            var singleLegendSeriesConfigs = allLegendSeriesConfigs[legendIndex];
            if (singleLegendSeriesConfigs == null) {
                continue;
            }

            var legendModel = ecModel.getComponent('legend', legendIndex);

            for (var seriesIndex = 0; seriesIndex < singleLegendSeriesConfigs.length; seriesIndex++) {
                var singleSeriesConfig = singleLegendSeriesConfigs[seriesIndex];
                if (singleSeriesConfig == null) {
                    continue;
                }
                var seriesModel = ecModel.getSeriesByIndex(seriesIndex);
                var seriesData = seriesModel.getData();
                seriesData.filterSelf(function (dataIndex) {
                    var dimensionName = seriesData.getDimension(singleSeriesConfig.dimensionIndex);
                    var val = seriesData.get(dimensionName, dataIndex);
                    var encoded = encodeValue(val, legendIndex);
                    return legendModel.isSelected(encoded);
                });
            }
        }
    }

    function init(echarts) {

        if (!echarts.__dle_initialized) {
            echarts.registerProcessor(
                echarts.PRIORITY.PROCESSOR.FILTER,
                dimensionalLegendFilter.bind(null, echarts)
            );
            echarts.__dle_allLegendSeriesConfigsForAllCharts = {};
            echarts.__dle_initialized = true;
        }

        var otherInitArgs = arraySlice.call(arguments, 1)
        var chart = echarts.init.apply(echarts, otherInitArgs);
        return hackChart(chart, echarts);
    }

    return {
        init: init
    };

}));
