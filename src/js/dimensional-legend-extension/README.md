# Dimensional Legend Extension

Enable legend to control data by dimension in ECharts.
This is a tricky approach and a temporary solution.
If echarts supports this feature officially, this repo will be de obsoleted.

See: <https://github.com/apache/incubator-echarts/issues/11869>

This repo has been tested only on `echarts@5.4.1`.

## Usage

The original echarts initialization:

```js
// `theme` and `someOtherOpts` are optional
var chart = echarts.init(dom, theme, someOtherOpts);
chart.setOption(ecOption);
```

To enable dimensional legend:

```js
// `theme` and `someOtherOpts` are optional
var chart = dimensionalLegendExtension.init(echarts, dom, theme, someOtherOpts);
chart.setOption(ecOption);
```

See more detail in [test](./test/case.html).


**Caution:**

+ Only support that data is provided in `dataset.source` rather than in `series.data`.
+ `dataset.source` must lays out data items vertically, that is, each column represents a dimension.
+ `dataset.dimensions` must be specified.
+ At present only support to hit on one series when hover or click on legend.
