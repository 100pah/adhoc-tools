(function () {

    const POLL_INTERVAL = 5000;
    const _updateTimeBox = document.getElementById('update_time');
    const _mainBox = document.getElementById('main_box');
    const _helpBox = document.getElementById('help_box');
    const _helpBtn = document.getElementById('help_btn');
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

    function initHelp() {
        _helpBox.style.display = 'none';
        _helpBtn.addEventListener('click', function () {
            _helpBox.style.display = _helpBox.style.display === 'none' ? 'block' : 'none';
        });
    }

    async function updateDumpSysMemInfo() {
        let data = null;
        try {
            data = await requestData()
        }
        catch (err) {
            alert('disconnected');
            throw err;
        }

        _updateTimeBox.innerHTML = 'UPDATE_TIME: '
            + encodeHTML(data['update_time'])
            + `&nbsp;&nbsp;(Polling Interval: ${POLL_INTERVAL} ms)`;

        for (const item of data.result) {
            const box = getDumpSysMemInfoBox(item);
            box.contentBox.value = item['raw_text'];
            let descLine = '';
            if (item['process_name']) {
                descLine += '[process_name]&nbsp;' + encodeHTML(item['process_name']);
            }
            if (item['pid']) {
                descLine += '&nbsp;&nbsp;[pid]&nbsp;' + encodeHTML(item['pid']);
            }
            if (!descLine) {
                descLine += '&nbsp;'
            }
            const titleHTML = '[cmd]&nbsp;&nbsp;' + encodeHTML(item['key'])
                + '<br>' // Always two lines to align with the other boxes.
                + descLine;
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
        initHelp();
        async function next() {
            await updateDumpSysMemInfo();
            setTimeout(next, POLL_INTERVAL);
        }
        next();
    }

    main();

})();
