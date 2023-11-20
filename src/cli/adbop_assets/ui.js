(function () {

    const POLL_INTERVAL = 2000;
    const _updateTimeBox = document.getElementById('update_time');
    const _mainBox = document.getElementById('main_box');
    const _dumpSysMemInfoBoxMap = new Map();

    var replaceReg = /([&<>"'])/g;
    var replaceMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;'
    };

    function encodeHTML(source) {
        return source == null
            ? ''
            : (source + '').replace(replaceReg, function (str, c) {
                return replaceMap[c];
            });
    };

    async function updateDumpSysMemInfo() {
        const data = await requestData()

        _updateTimeBox.innerHTML = 'UPDATE_TIME: ' + encodeHTML(data['update_time']);

        for (const item of data.result) {
            const box = getDumpSysMemInfoBox(item);
            box.contentBox.value = item['raw_text'];
            let titleHTML = '[cmd]&nbsp;&nbsp;' + encodeHTML(item['key'])
                + '<br>'
                + (item['process_name']
                    ? '[process_name]&nbsp;&nbsp;' + encodeHTML(item['process_name'])
                    : '&nbsp;' // Make it align with the other box
                );
            box.titleBox.innerHTML = titleHTML;
        }
    }

    function getDumpSysMemInfoBox(item) {
        const key = item['key'];

        let box = _dumpSysMemInfoBoxMap.get(key);
        if (!box) {
            const cmdType = item['cmd_type'];
            const cmdTypeCSSClass = `cmd_type_${cmdType}`;
            const itemBox = document.createElement('div');
            itemBox.className = cmdTypeCSSClass + ' result_block';
            _mainBox.appendChild(itemBox);

            const titleBox = document.createElement('div');
            itemBox.appendChild(titleBox);
            titleBox.className = 'title';

            const contentBox = document.createElement('textarea');
            itemBox.appendChild(contentBox);
            contentBox.className = 'content';

            box = {itemBox, titleBox, contentBox};
            _dumpSysMemInfoBoxMap.set(key, box);
        }

        return box;
    }

    async function requestData() {
        const response = await fetch('data');
        return await response.json();
    }

    function main() {
        async function next() {
            await updateDumpSysMemInfo();
            setTimeout(next, POLL_INTERVAL);
        }
        next();
    }

    main();

})();
