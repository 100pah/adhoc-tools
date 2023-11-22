(function () {

    const POLL_INTERVAL = 5000;
    const NO_PID = '-';

    const _pageHeaderBox = document.getElementById('page_header');
    const _mainBox = document.getElementById('main_box');
    const _helpBox = document.getElementById('help_box');
    const _helpBtn = document.getElementById('help_btn');
    const _blockMap = new Map();
    const _pidLineMap = new Map();

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
        hideHelper();
        _helpBtn.addEventListener('click', function () {
            if (_helpBox.style.display === 'none') {
                showHelper();
            }
            else {
                hideHelper();
            }
        });
        function showHelper() {
            _helpBox.style.display = 'block';
            _mainBox.classList.add('helper_show');
        }
        function hideHelper() {
            _helpBox.style.display = 'none';
            _mainBox.classList.remove('helper_show');
        }
    }

    async function updateInfo() {
        let data = null;
        try {
            data = await requestData()
        }
        catch (err) {
            alert('disconnected');
            throw err;
        }

        renderData(data);
    }

    function renderData(data) {

        function renderPageHeader(data) {
            _pageHeaderBox.innerHTML = 'UPDATE_TIME: '
                + encodeHTML(data['update_time'])
                + `&nbsp;&nbsp;(Polling Interval: ${POLL_INTERVAL} ms)`;
        }

        function ensurePIDLine(pid) {
            let pidLineBox = _pidLineMap.get(pid);
            if (!pidLineBox) {
                pidLineBox = document.createElement('div');
                _mainBox.appendChild(pidLineBox);
                pidLineBox.classList.add('pid_line');
                _pidLineMap.set(pid, pidLineBox);

                const pidTagBox = document.createElement('div');
                pidLineBox.appendChild(pidTagBox);
                pidTagBox.classList.add('pid_tag');
                pidTagBox.innerHTML = pid === NO_PID ? 'GLOBAL INFO' : `PID: ${pid}`;
            }
            return pidLineBox;
        }

        function ensureSingleBlock(dataItem, pidLineBox) {
            const key = dataItem['key'];

            let block = _blockMap.get(key);
            if (!block) {
                const cmdType = dataItem['cmd_type'];
                const blockBox = document.createElement('div');
                blockBox.classList.add(`cmd_type_${cmdType}`);
                blockBox.classList.add('result_block');
                pidLineBox.appendChild(blockBox);

                const titleBox = document.createElement('div');
                blockBox.appendChild(titleBox);
                titleBox.classList.add('title');

                const contentBox = document.createElement('textarea');
                blockBox.appendChild(contentBox);
                contentBox.classList.add('content');

                block = {blockBox, titleBox, contentBox, slate: false};
                _blockMap.set(key, block);
            }

            return block;
        }

        function renderBlockTitle(block, dataItem) {
            let descLine = '';
            if (dataItem['process_name']) {
                descLine += '[process_name]&nbsp;' + encodeHTML(dataItem['process_name']);
            }
            if (dataItem['pid']) {
                descLine += '&nbsp;&nbsp;[pid]&nbsp;' + encodeHTML(dataItem['pid']);
            }
            if (!descLine) {
                descLine += '&nbsp;'
            }
            const titleHTML = '[cmd]&nbsp;&nbsp;' + encodeHTML(dataItem['key'])
                + '<br>' // Always two lines to align with the other boxes.
                + descLine;
            block.titleBox.innerHTML = titleHTML;
        }

        function renderBlockContent(block, dataItem) {
            block.contentBox.value = dataItem['raw_text'];
        }

        function dealRender(data) {
            renderPageHeader(data);

            _blockMap.forEach(block => {
                block.slate = true;
            });

            // Group by pid for good looking.
            const pidToDataItemMap = new Map();
            for (const dataItem of data.result) {
                const pid = dataItem['pid'] || NO_PID;
                let pidDataItemArr = pidToDataItemMap.get(pid);
                if (!pidDataItemArr) {
                    pidDataItemArr = [];
                    pidToDataItemMap.set(pid, pidDataItemArr);
                }
                pidDataItemArr.push(dataItem);
            }

            function renderDataItemListInPid(dataItemArr, pidLineBox) {
                for (const dataItem of dataItemArr) {
                    const block = ensureSingleBlock(dataItem, pidLineBox);
                    block.slate = false;
                    renderBlockContent(block, dataItem);
                    renderBlockTitle(block, dataItem);
                }
            }

            renderDataItemListInPid(pidToDataItemMap.get(NO_PID), ensurePIDLine(NO_PID));
            pidToDataItemMap.forEach((dataItemArr, pid) => {
                if (pid !== NO_PID) {
                    renderDataItemListInPid(dataItemArr, ensurePIDLine(pid));
                }
            });

            _blockMap.forEach(block => {
                if (block.slate) {
                    block.blockBox.classList.add('slate');
                }
                else {
                    block.blockBox.classList.remove('slate');
                }
            });
        }

        dealRender(data);
    }

    async function requestData() {
        const response = await fetch('data');
        return await response.json();
    }

    function main() {
        initHelp();
        async function next() {
            await updateInfo();
            setTimeout(next, POLL_INTERVAL);
        }
        next();
    }

    main();

})();
