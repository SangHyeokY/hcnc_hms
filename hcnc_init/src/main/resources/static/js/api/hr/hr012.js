let tableData_old = [];
let hr012TableAReady = false;   // A 테이블 데이터 로드 완료 판단
let hr012RowTags = new Map();   // 분야별 태그 상태 저장 맵
let hr012HasPendingChange = false;  // A/B 테이블 데이터 차이 판단
let hr012SkillPickerTable = null;
let hr012SkillPickerTableReady = false;
let hr012SkillPickerDraftMap = null;
let hr012SuggestActiveIndex = -1;
let hr012SkillPickerEventBound = false;
let hr012SkillOptions = [];
let hr012SkillGroupOptions = [];
let hr012SkillOptionsLoading = false;
let hr012SkillGroupLoading = false;

// hr012.js
window.initTab2 = function() {
    $(document).off("tab:readonly.hr012").on("tab:readonly.hr012", function (_, isReadOnly) {
        applyTab2Readonly(!!isReadOnly);
    });
    applyTab2Readonly(!!window.hr010ReadOnly);
    bindHr012SkillPickerEvents();
    ensureHr012SkillPickerOptionsLoaded();

    // 서브 탭 초기 상태 설정
    $(".hr012-tab-btn").removeClass("active");
    $(".hr012-tab-btn[data-tab='tab2-A']").addClass("active");
    $("#btn_hr012_skill_picker").show();

    // 테이블 초기화 (한 번만 수행)
    if (!window.hr012TableA) buildHr012TableA();
    if (!window.hr012TableB) buildHr012TableB();
    attachHr012TagSync();   // 태그 변경 이벤트 받을 리스너

    // 초기 데이터 로드
    if (window.currentDevId) {
        loadHr012TableDataA();
        loadHr012TableDataB();
    }

    // A/B 테이블 보여주기/숨기기
    $("#TABLE_HR012_A").show();
    $("#TABLE_HR012_B").hide();

    // 탭 클릭 이벤트
    $(".hr012-tab-btn").off("click").on("click", function() {
        const tabId = $(this).data("tab");

        $(".hr012-tab-btn").removeClass("active");
        $(this).addClass("active");

        if (tabId === "tab2-A") {
            $("#TABLE_HR012_A").show();
            window.hr012TableA.redraw();
            $("#TABLE_HR012_B").hide();
            if (!window.hr010ReadOnly) {
                $("#btn_hr012_skill_picker").show();
            }
        } else if (tabId === "tab2-B") {
            $("#TABLE_HR012_B").show();
            window.hr012TableB.redraw();
            $("#TABLE_HR012_A").hide();
            $("#btn_hr012_skill_picker").hide();
            closeHr012SkillPicker(true);
        }
    });

    applyTab2Readonly(!!window.hr010ReadOnly);
};

function applyTab2Readonly(isReadOnly) {
    $(".tab2-content .hr014-side-tabs").toggleClass("is-readonly", !!isReadOnly);
    $("#TABLE_HR012_A, #TABLE_HR012_B").toggleClass("is-readonly", !!isReadOnly);
    $("#btn_hr012_skill_picker").toggle(!isReadOnly && $(".hr012-tab-btn.active").data("tab") === "tab2-A");
    if (isReadOnly) {
        closeHr012SkillPicker(true);
    }
}

function buildHr012TableA() {
    if (window.hr012TableA) return;

    window.hr012TableA = new Tabulator("#TABLE_HR012_A", {
        layout: "fitDataStretch",
        // 보유역량(A)은 현재 페이징 미사용. 필요 시 true/"local"로 즉시 전환 가능.
        pagination: false,
        placeholder: "데이터 없음",
        height: "100%",
        columns: [
            { title: "코드", field: "cd", visible: false },
            { title: "구분", field: "cd_nm", hozAlign: "left", width: 180, minWidth: 160 },
            { title: "상세", field: "skl_id_lst", hozAlign: "left", minWidth: 720, formatter: tagFormatter },
            { title: "key", field: "key", visible: false }
        ],
        data: []
    });
}

function loadHr012TableDataA() {
    const devId = window.currentDevId;
    if (!window.hr012TableA) return;
    hr012TableAReady = false;
    hr012RowTags.clear();
    hr012HasPendingChange = false;

    $.ajax({
        url: "/hr012/tab2",
        type: "GET",
        data: { dev_id: devId },
        success: function(response) {
            // console.log(response);
            const dataArray = Array.isArray(response) ? response : response.res;

            if (!Array.isArray(dataArray)) {
                console.error("Tab2A 데이터 형식이 배열이 아닙니다.", response);
                return;
            }

            const tableData = dataArray.map(item => ({
                cd: String(item.cd || "").toUpperCase(),
                cd_nm: item.cd_nm,
                skl_id_lst: parseSklList(item.skl_id_lst)
            }));
            tableData.forEach(row => {
                const key = row.cd || row.grp_cd || row.cd_nm;
                if (!key) return;
                hr012RowTags.set(String(key).toUpperCase(), normalizeTagList(row.skl_id_lst));
            });
            tableData_old = cloneTableData(tableData);

            window.hr012TableA.setData(tableData);
            hr012TableAReady = true;
            syncHr012SkillPickerUi();
            // 초기 로드에서는 숙련도 목록을 건드리지 않음
        },
        error: function() {
            console.log("Tab2A 데이터 로드 실패");
        }
    });
}

// =============================================================================================================================

function radioFormatter(cell) {
    const checked = cell.getValue() ? "checked" : "";
    const disabled = currentMode === "view" ? "disabled" : "";
    return `<input type="radio" class="circle-radio" ${checked} ${disabled}>`;
}

function buildHr012TableB() {
    if (window.hr012TableB) return;

    window.hr012TableB = new Tabulator("#TABLE_HR012_B", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        cellEdited: function (cell) {
           console.log("cellEdited B !!!!");
           console.log(cell.getValue());
           changedTabs.tab2 = true;
        },
        columns: [
            { title: "skl_id", field: "skl_id", visible:false },
            { title: "기술", field: "cd_nm", hozAlign: "left", widthGrow: 2 },
            ...[1,2,3,4,5].map(i => ({
                title: i.toString(),
                field: "lv" + i,
                hozAlign: "center",
                formatter: radioFormatter,
                cellClick: function(e, cell){
                    if (currentMode === "view") return;

                    const row = cell.getRow();
                    const rowData = row.getData();
                    const currentField = cell.getField();

                    // 이미 선택되어 있으면 → 해제
                    if(rowData[currentField]){
                        row.update({ lv1:false, lv2:false, lv3:false, lv4:false, lv5:false });
                        return;
                    }

                    // 클릭한 레벨만 true, 나머지는 false
                    const updateObj = { lv1:false, lv2:false, lv3:false, lv4:false, lv5:false };
                    updateObj[currentField] = true;
                    row.update(updateObj);

                    changedTabs.tab2 = true;
                }
            }))
        ],
        data: []
    });
}

function loadHr012TableDataB() {
    const devId = window.currentDevId;
    if (!window.hr012TableB) return;

    $.ajax({
        url: "/hr012/tab2_2",
        type: "GET",
        data: { dev_id: devId },
        success: function(response) {
            const dataArray = Array.isArray(response) ? response : response.res;
            if (!Array.isArray(dataArray)) return console.error("Tab2B 데이터 형식이 배열이 아닙니다.", response);

            const tableData = dataArray.map(item => ({
                cd_nm: item.cd_nm,
                skl_id: item.skl_id,
                lv1: item.lv1 === "Y",
                lv2: item.lv2 === "Y",
                lv3: item.lv3 === "Y",
                lv4: item.lv4 === "Y",
                lv5: item.lv5 === "Y"
            }));

            window.hr012TableB.setData(tableData);
            // 초기 로드에서는 숙련도 목록을 건드리지 않음
        },
        error: function() {
            console.log("Tab2B 데이터 로드 실패");
        }
    });
}

//function saveHr012TableB(devId) {
//    return new Promise((resolve, reject) => {
//        if (!window.hr012TableB) return reject("Tab2B 테이블 없음");
//        if (!devId) return reject("devId 없음");
//
//        const tableData = window.hr012TableB.getData(); // 데이터 임시 저장
//        const saveList = tableData.map(row => {
//            let lvl = 0;
//            if (row.lv5) lvl = 5;
//            else if (row.lv4) lvl = 4;
//            else if (row.lv3) lvl = 3;
//            else if (row.lv2) lvl = 2;
//            else if (row.lv1) lvl = 1;
//
//            return {
//                devId: devId,
//                sklId: row.skl_id,
//                lvl: lvl
//            };
//        });
//
//        console.log("Tab2_숙련도 저장한 데이터");
//        console.table(saveList);
//
//        $.ajax({
//            url: "/hr012/tab2_2_save",
//            type: "POST",
//            contentType: "application/json; charset=utf-8",
//            data: JSON.stringify(saveList),
//            success: function(response) {
//                loadHr012TableDataB();
//                resolve(); // ← 여기가 중요!
//            },
//            error: function() {
//                reject("숙련도 저장 실패"); // ← 실패 처리
//            }
//        });
//    });
//}

// 유효성 검사
function validateHr012Form() {
    return true;
}

function saveHr012TableData() {
    return new Promise((resolve, reject) => {
        if (!changedTabs.tab2) return resolve(); // 수정사항 없으면 바로 종료
        const devId = window.currentDevId;
        if (!devId) {
            return reject("dev_id 없음");
        }
        const userId = $.trim($("#write_user_id").val());

        // --- param 준비 (A 테이블 수정 + 삭제) ---
        let codes = [];
        tableData_old.forEach(row => {
            if (row.skl_id_lst !== undefined)
                Object.values(row.skl_id_lst).forEach(item => {
                    if (item.code !== undefined)
                        codes.push(item.code);
                });
        });
        const param_old = codes.map(data => ({
            type: "d",
            dev_id: devId,
            skl_id: data,
            userId: userId
        }));

        codes = [];
        collectHr012SkillsFromA().forEach(item => {
            if (item && item.skl_id != null) {
                codes.push(String(item.skl_id));
            }
        });
        let param = codes.map(data => ({
            type: "c",
            dev_id: devId,
            skl_id: data,
            userId: userId
        }));
        const delparam = param_old.filter(a => !param.some(b => b.skl_id === a.skl_id));
        param = [...param, ...delparam.filter(x => !param.some(y => y.skl_id === x.skl_id))];

        // --- A/B 테이블 저장 함수 ---
        const saveA = () => new Promise((resolveA, rejectA) => {
            $.ajax({
                url: "/hr012/tab2_1_save",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(param),
                success: () => {
                    loadHr012TableDataA();  // 새로고침
                    resolveA();
                },
                error: () => rejectA("보유역량 저장 실패")
            });
        });

        const saveB = () => new Promise((resolveB, rejectB) => {
            const tableData = window.hr012TableB.getData();
            const saveList = tableData.map(row => {
                let lvl = 0;
                if (row.lv5) lvl = 5;
                else if (row.lv4) lvl = 4;
                else if (row.lv3) lvl = 3;
                else if (row.lv2) lvl = 2;
                else if (row.lv1) lvl = 1;
                return { devId, sklId: row.skl_id, lvl };
            });

            $.ajax({
                url: "/hr012/tab2_2_save",
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(saveList),
                success: () => {
                    loadHr012TableDataB(); // 새로고침
                    resolveB();
                },
                error: () => rejectB("숙련도 저장 실패")
            });
        });

        // --- A/B 순차 저장 ---
        saveA()
            .then(() => saveB())
            .then(() => {
                changedTabs.tab2 = false;
                resolve();
            })
            .catch(err => reject(err));
    });
}

// 태그 데이터를 표준배열로
function normalizeTagList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        const raw = value.trim();
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            // fallthrough to comma split
        }
        return raw.split(",").map(v => v.trim()).filter(Boolean).map(code => ({
            code: code,
            label: code
        }));
    }
    return [];
}

function buildHr012CurrentTagMap() {
    const map = new Map();

    hr012RowTags.forEach(function (tags, key) {
        const normalizedKey = String(key || "").toUpperCase();
        if (!normalizedKey) {
            return;
        }
        map.set(normalizedKey, normalizeTagList(tags));
    });

    if (window.hr012TableA && typeof window.hr012TableA.getRows === "function") {
        window.hr012TableA.getRows().forEach(function (row) {
            const data = row.getData() || {};
            const key = String(data.cd || "").toUpperCase();
            if (!key || map.has(key)) {
                return;
            }
            map.set(key, normalizeTagList(data.skl_id_lst));
        });
    }

    return map;
}

function isHr012TagListEqual(a, b) {
    const left = normalizeTagList(a).map(function (tag) {
        return String(tag.code || tag.cd || tag.value || tag.id || tag || "");
    }).filter(Boolean).sort();
    const right = normalizeTagList(b).map(function (tag) {
        return String(tag.code || tag.cd || tag.value || tag.id || tag || "");
    }).filter(Boolean).sort();

    if (left.length !== right.length) {
        return false;
    }
    for (let i = 0; i < left.length; i += 1) {
        if (left[i] !== right[i]) {
            return false;
        }
    }
    return true;
}

//태그 변경 이벤트 리스너 등록 함수
function attachHr012TagSync() {
    const tableEl = document.getElementById("TABLE_HR012_A");
    if (!tableEl || tableEl.__tagSyncBound) return;
    tableEl.__tagSyncBound = true;
    tableEl.addEventListener("tagEditor:change", function (e) {
        const detail = e.detail || {};  // 이벤트에 payload
        const rowData = detail.rowData || {};   // 변경된 행의 데이터
        const key = rowData.cd || rowData.grp_cd || rowData.cd_nm;
        if (!key) return;
        hr012RowTags.set(String(key).toUpperCase(), normalizeTagList(detail.tags || []));
        hr012HasPendingChange = true;
        syncHr012TableBFromA();
    });
}

// 태그 데이터를 배열로
function parseSklList(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
}

function cloneTableData(data) {
    if (typeof structuredClone === "function") {
        try {
            return structuredClone(data);
        } catch (e) {
            // fallback below
        }
    }
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (e) {
        return Array.isArray(data) ? data.slice() : [];
    }
}

function collectHr012SkillsFromA() {
    if (hr012RowTags && hr012RowTags.size) {
        const map = new Map();
        hr012RowTags.forEach(tags => {
            normalizeTagList(tags).forEach(tag => {
                const code = tag.code || tag.cd || tag.value || tag.id || tag;
                if (!code) return;
                const label = tag.label || tag.cd_nm || tag.name || code;
                map.set(String(code), String(label));
            });
        });
        return Array.from(map, ([code, label]) => ({
            skl_id: code,
            cd_nm: label
        }));
    }
    if (!window.hr012TableA) return [];
    const map = new Map();
    window.hr012TableA.getData().forEach(row => {
        const tags = normalizeTagList(row.skl_id_lst);
        tags.forEach(tag => {
            const code = tag.code || tag.cd || tag.value || tag.id || tag;
            if (!code) return;
            const label = tag.label || tag.cd_nm || tag.name || code;
            map.set(String(code), String(label));
        });
    });
    return Array.from(map, ([code, label]) => ({
        skl_id: code,
        cd_nm: label
    }));
}

function syncHr012TableBFromA() {
    if (!window.hr012TableB || !hr012TableAReady) return;
    if (!hr012HasPendingChange) return;
    const skills = collectHr012SkillsFromA();
    const existing = window.hr012TableB.getData ? window.hr012TableB.getData() : [];
    const existingMap = new Map();
    existing.forEach(row => {
        if (row && row.skl_id != null) {
            existingMap.set(String(row.skl_id), row);
        }
    });

    const merged = skills.map(skill => {
        const prev = existingMap.get(String(skill.skl_id));
        if (prev) {
            return Object.assign({}, prev, { cd_nm: skill.cd_nm });
        }
        return {
            skl_id: skill.skl_id,
            cd_nm: skill.cd_nm,
            lv1: false,
            lv2: false,
            lv3: false,
            lv4: false,
            lv5: false
        };
    });

    window.hr012TableB.setData(merged);
}

function bindHr012SkillPickerEvents() {
    if (hr012SkillPickerEventBound) {
        return;
    }
    hr012SkillPickerEventBound = true;

    $(document).on("click", "#btn_hr012_skill_picker", function (e) {
        e.preventDefault();
        if (currentMode === "view") {
            return;
        }
        openHr012SkillPicker();
    });

    $(document).on("click", "#btn_hr012_skill_picker_apply", function (e) {
        e.preventDefault();
        applyHr012SkillPickerSelection();
    });

    $(document).on("click", "#btn_hr012_skill_picker_close_x", function (e) {
        e.preventDefault();
        closeHr012SkillPicker();
    });

    $(document).on("click", "#hr012-skill-picker-area", function (e) {
        if (e.target === this) {
            closeHr012SkillPicker();
        }
    });

    $(document).on("click", "#TABLE_HR012_SKILL_PICKER .hr012-skill-chip", function (e) {
        e.preventDefault();
        const code = String($(this).data("code") || "");
        if (!code) {
            return;
        }
        toggleHr012Skill(code);
    });

    $(document).on("input", "#hr012-skill-picker-search", function () {
        renderHr012SkillSuggestions($(this).val());
    });

    $(document).on("keydown", "#hr012-skill-picker-search", function (e) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            moveHr012SuggestionSelection(1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            moveHr012SuggestionSelection(-1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const $active = getHr012ActiveSuggestItem();
            if ($active.length) {
                addHr012Skill(String($active.data("code") || ""), true);
                return;
            }
            const $first = $("#hr012-skill-picker-suggest .hr012-skill-suggest-item").first();
            if ($first.length) {
                addHr012Skill(String($first.data("code") || ""), true);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeHr012SkillPicker();
        }
    });

    $(document).on("click", "#hr012-skill-picker-suggest .hr012-skill-suggest-item", function (e) {
        e.preventDefault();
        const code = String($(this).data("code") || "");
        if (!code) {
            return;
        }
        addHr012Skill(code, true);
    });

    $(document).on("mouseenter", "#hr012-skill-picker-suggest .hr012-skill-suggest-item", function () {
        const $items = $("#hr012-skill-picker-suggest .hr012-skill-suggest-item");
        hr012SuggestActiveIndex = $items.index(this);
        syncHr012SuggestionActive();
    });

    $(document).on("mousedown", function (e) {
        if (!$(e.target).closest(".hr012-skill-picker-search-wrap").length) {
            $("#hr012-skill-picker-suggest").hide();
        }
    });

    $(document).on("click", ".tab-btn", function () {
        closeHr012SkillPicker(true);
    });
}

function ensureHr012SkillPickerOptionsLoaded() {
    if (!hr012SkillOptions.length && !hr012SkillOptionsLoading) {
        hr012SkillOptionsLoading = true;
        getComCode("skl_id", "", function (res) {
            hr012SkillOptions = Array.isArray(res) ? res : [];
            hr012SkillOptionsLoading = false;
            syncHr012SkillPickerUi(true);
        });
    }
    if (!hr012SkillGroupOptions.length && !hr012SkillGroupLoading) {
        hr012SkillGroupLoading = true;
        getComCode("skl_grp", "", function (res) {
            hr012SkillGroupOptions = Array.isArray(res) ? res : [];
            hr012SkillGroupLoading = false;
            syncHr012SkillPickerUi(true);
        });
    }
}

function openHr012SkillPicker() {
    if (currentMode === "view") {
        return;
    }
    ensureHr012SkillPickerOptionsLoaded();
    buildHr012SkillPickerTable();
    hr012SkillPickerDraftMap = buildHr012CurrentTagMap();
    syncHr012SkillPickerUi(true);

    const $picker = $("#hr012-skill-picker-area");
    $picker.show();
    setTimeout(function () {
        $picker.addClass("show");
    }, 0);

    $("#hr012-skill-picker-search").val("");
    renderHr012SkillSuggestions("");
    setTimeout(function () {
        $("#hr012-skill-picker-search").trigger("focus");
    }, 40);
}

function closeHr012SkillPicker(immediate) {
    const $picker = $("#hr012-skill-picker-area");
    if (!$picker.length) {
        hr012SkillPickerDraftMap = null;
        return;
    }
    $picker.removeClass("show");
    $("#hr012-skill-picker-suggest").hide().empty();
    hr012SuggestActiveIndex = -1;
    if (immediate) {
        hr012SkillPickerDraftMap = null;
        $picker.hide();
        return;
    }
    setTimeout(function () {
        if (!$picker.hasClass("show")) {
            $picker.hide();
        }
    }, 180);
    hr012SkillPickerDraftMap = null;
}

function applyHr012SkillPickerSelection() {
    if (!(hr012SkillPickerDraftMap instanceof Map)) {
        closeHr012SkillPicker();
        return;
    }

    const rowMap = new Map();
    if (window.hr012TableA && typeof window.hr012TableA.getRows === "function") {
        window.hr012TableA.getRows().forEach(function (row) {
            const data = row.getData() || {};
            const key = String(data.cd || "").toUpperCase();
            if (key) {
                rowMap.set(key, row);
            }
        });
    }

    let hasChanged = false;
    const allKeys = new Set();
    hr012RowTags.forEach(function (_, key) { allKeys.add(String(key || "").toUpperCase()); });
    hr012SkillPickerDraftMap.forEach(function (_, key) { allKeys.add(String(key || "").toUpperCase()); });

    allKeys.forEach(function (key) {
        if (!key) {
            return;
        }
        const prevTags = normalizeTagList(hr012RowTags.get(key));
        const nextTags = normalizeTagList(hr012SkillPickerDraftMap.get(key));

        if (!isHr012TagListEqual(prevTags, nextTags)) {
            hasChanged = true;
        }

        hr012RowTags.set(key, nextTags);
        const row = rowMap.get(key);
        if (row) {
            row.update({ skl_id_lst: nextTags });
        }
    });

    if (hasChanged) {
        changedTabs.tab2 = true;
        hr012HasPendingChange = true;
        syncHr012TableBFromA();
    }

    closeHr012SkillPicker();
}

function buildHr012SkillPickerTable() {
    if (hr012SkillPickerTable || !window.Tabulator || !document.getElementById("TABLE_HR012_SKILL_PICKER")) {
        return;
    }

    hr012SkillPickerTable = new Tabulator("#TABLE_HR012_SKILL_PICKER", {
        layout: "fitColumns",
        height: "360px",
        placeholder: "등록된 기술이 없습니다.",
        headerHozAlign: "center",
        columnDefaults: {
            headerSort: false,
            resizable: false
        },
        columns: [
            { title: "분야", field: "groupName", width: 170, hozAlign: "left" },
            { title: "기술", field: "skills", hozAlign: "left", formatter: hr012SkillChipFormatter, widthGrow: 3 }
        ],
        data: []
    });
    hr012SkillPickerTableReady = false;
}

function syncHr012SkillPickerUi(forceRebuild) {
    const totalCount = Array.isArray(hr012SkillOptions) ? hr012SkillOptions.length : 0;
    const selectedCount = getHr012SelectedCodeSet().size;
    $("#hr012-skill-picker-meta").text("전체 기술 " + totalCount + "개 / 선택 " + selectedCount + "개");

    if (!hr012SkillPickerTable) {
        return;
    }

    if (!forceRebuild && hr012SkillPickerTableReady) {
        syncHr012SkillPickerChipState();
        return;
    }

    const tableElement = hr012SkillPickerTable.getElement ? hr012SkillPickerTable.getElement() : null;
    const holder = tableElement ? tableElement.querySelector(".tabulator-tableHolder") : null;
    const prevTop = holder ? holder.scrollTop : 0;
    const prevLeft = holder ? holder.scrollLeft : 0;

    const afterRender = function () {
        hr012SkillPickerTableReady = true;
        syncHr012SkillPickerChipState();
        const currentElement = hr012SkillPickerTable.getElement ? hr012SkillPickerTable.getElement() : null;
        const currentHolder = currentElement ? currentElement.querySelector(".tabulator-tableHolder") : null;
        if (currentHolder) {
            currentHolder.scrollTop = prevTop;
            currentHolder.scrollLeft = prevLeft;
        }
    };

    const setResult = hr012SkillPickerTable.setData(buildHr012SkillPickerRows());
    if (setResult && typeof setResult.then === "function") {
        setResult.then(afterRender);
    } else {
        setTimeout(afterRender, 0);
    }
}

function syncHr012SkillPickerChipState() {
    const selectedCodes = getHr012SelectedCodeSet();
    $("#TABLE_HR012_SKILL_PICKER .hr012-skill-chip").each(function () {
        const code = String($(this).data("code") || "");
        $(this).toggleClass("is-selected", selectedCodes.has(code));
    });
}

function getHr012GroupCode(skillCode) {
    const code = String(skillCode || "").trim();
    if (!code) {
        return "";
    }
    return code.substring(0, 2).toUpperCase();
}

function getHr012GroupNameMap() {
    const map = {};
    (hr012SkillGroupOptions || []).forEach(function (group) {
        const groupCode = String(group.cd || "").toUpperCase();
        if (!groupCode) {
            return;
        }
        map[groupCode] = group.cd_nm || groupCode;
    });
    return map;
}

function getHr012SkillLabelMap() {
    const map = {};
    (hr012SkillOptions || []).forEach(function (item) {
        const code = String(item.cd || "");
        if (!code) {
            return;
        }
        map[code] = String(item.cd_nm || code);
    });
    return map;
}

function buildHr012SkillPickerRows() {
    const groupRows = [];
    const groupMap = {};

    (hr012SkillGroupOptions || []).forEach(function (group, idx) {
        const groupCode = String(group.cd || "").toUpperCase();
        if (!groupCode) {
            return;
        }
        const row = {
            groupCode: groupCode,
            groupName: group.cd_nm || groupCode,
            sortOrder: idx,
            skills: []
        };
        groupMap[groupCode] = row;
        groupRows.push(row);
    });

    (hr012SkillOptions || []).forEach(function (skill) {
        const code = String(skill.cd || "");
        if (!code) {
            return;
        }
        const groupCode = getHr012GroupCode(code);
        if (!groupMap[groupCode]) {
            groupMap[groupCode] = {
                groupCode: groupCode,
                groupName: groupCode || "기타",
                sortOrder: 9999,
                skills: []
            };
            groupRows.push(groupMap[groupCode]);
        }
        groupMap[groupCode].skills.push({
            code: code,
            label: String(skill.cd_nm || code)
        });
    });

    groupRows.forEach(function (row) {
        row.skills.sort(function (a, b) {
            return a.label.localeCompare(b.label, "ko");
        });
    });

    return groupRows
        .filter(function (row) {
            return row.skills.length > 0;
        })
        .sort(function (a, b) {
            if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
            }
            return a.groupName.localeCompare(b.groupName, "ko");
        });
}

function hr012SkillChipFormatter(cell) {
    const skills = cell.getValue() || [];
    if (!skills.length) {
        return "";
    }
    const selected = getHr012SelectedCodeSet();
    const html = skills.map(function (skill) {
        const code = String(skill.code || "");
        const label = String(skill.label || code);
        const selectedClass = selected.has(code) ? " is-selected" : "";
        return "<button type='button' class='hr012-skill-chip" + selectedClass + "' data-code='" +
            hr012EscapeHtml(code) + "'>" + hr012EscapeHtml(label) + "</button>";
    }).join("");
    return "<div class='hr012-skill-chip-wrap'>" + html + "</div>";
}

function getHr012SelectedCodeSet() {
    const set = new Set();
    const source = (hr012SkillPickerDraftMap instanceof Map) ? hr012SkillPickerDraftMap : hr012RowTags;
    source.forEach(function (tags) {
        normalizeTagList(tags).forEach(function (tag) {
            const code = tag.code || tag.cd || tag.value || tag.id || tag;
            if (code) {
                set.add(String(code));
            }
        });
    });
    return set;
}

function getHr012TagsByGroup(groupCode) {
    const key = String(groupCode || "").toUpperCase();
    if (!key) {
        return [];
    }

    if (hr012SkillPickerDraftMap instanceof Map && hr012SkillPickerDraftMap.has(key)) {
        return normalizeTagList(hr012SkillPickerDraftMap.get(key));
    }

    if (hr012RowTags.has(key)) {
        return normalizeTagList(hr012RowTags.get(key));
    }

    if (!window.hr012TableA) {
        return [];
    }
    const row = window.hr012TableA.getRows().find(function (item) {
        const data = item.getData() || {};
        return String(data.cd || "").toUpperCase() === key;
    });
    if (!row) {
        return [];
    }
    return normalizeTagList(row.getData().skl_id_lst);
}

function setHr012TagsByGroup(groupCode, tags) {
    const key = String(groupCode || "").toUpperCase();
    if (!key || !window.hr012TableA) {
        return;
    }
    const nextTags = normalizeTagList(tags);
    hr012RowTags.set(key, nextTags);

    const targetRow = window.hr012TableA.getRows().find(function (row) {
        const data = row.getData() || {};
        return String(data.cd || "").toUpperCase() === key;
    });
    if (targetRow) {
        targetRow.update({ skl_id_lst: nextTags });
    }

    changedTabs.tab2 = true;
    hr012HasPendingChange = true;
    syncHr012TableBFromA();
    syncHr012SkillPickerUi();
}

function setHr012SkillPickerTagsByGroup(groupCode, tags) {
    const key = String(groupCode || "").toUpperCase();
    if (!key) {
        return;
    }
    if (!(hr012SkillPickerDraftMap instanceof Map)) {
        hr012SkillPickerDraftMap = buildHr012CurrentTagMap();
    }
    hr012SkillPickerDraftMap.set(key, normalizeTagList(tags));
    syncHr012SkillPickerUi();
}

function toggleHr012Skill(skillCode) {
    const code = String(skillCode || "").trim();
    if (!code) {
        return;
    }
    const groupCode = getHr012GroupCode(code);
    const labels = getHr012SkillLabelMap();
    const label = labels[code] || code;

    const tags = getHr012TagsByGroup(groupCode).slice();
    const idx = tags.findIndex(function (tag) {
        return String(tag.code || "") === code;
    });
    if (idx >= 0) {
        tags.splice(idx, 1);
    } else {
        tags.push({ code: code, label: label });
    }
    tags.sort(function (a, b) {
        return String(a.label || a.code || "").localeCompare(String(b.label || b.code || ""), "ko");
    });

    setHr012SkillPickerTagsByGroup(groupCode, tags);
    focusHr012SkillChip(code);
}

function addHr012Skill(skillCode, fromSearch) {
    const code = String(skillCode || "").trim();
    if (!code) {
        return;
    }
    const groupCode = getHr012GroupCode(code);
    const labels = getHr012SkillLabelMap();
    const label = labels[code] || code;
    const tags = getHr012TagsByGroup(groupCode).slice();
    if (!tags.some(function (tag) { return String(tag.code || "") === code; })) {
        tags.push({ code: code, label: label });
    }
    tags.sort(function (a, b) {
        return String(a.label || a.code || "").localeCompare(String(b.label || b.code || ""), "ko");
    });

    setHr012SkillPickerTagsByGroup(groupCode, tags);
    focusHr012SkillChip(code);

    if (fromSearch) {
        $("#hr012-skill-picker-search").val("");
        $("#hr012-skill-picker-suggest").hide().empty();
        hr012SuggestActiveIndex = -1;
    }
}

function focusHr012SkillChip(skillCode) {
    setTimeout(function () {
        const code = String(skillCode || "");
        const $chip = $("#TABLE_HR012_SKILL_PICKER .hr012-skill-chip").filter(function () {
            return String($(this).data("code") || "") === code;
        }).first();
        if (!$chip.length) {
            return;
        }
        $chip.addClass("is-flash");
        setTimeout(function () {
            $chip.removeClass("is-flash");
        }, 450);
    }, 30);
}

function findHr012SkillMatches(keyword, limit) {
    const query = String(keyword || "").trim().toLowerCase();
    if (!query) {
        return [];
    }
    const max = limit || 20;
    const groupNameMap = getHr012GroupNameMap();

    return (hr012SkillOptions || [])
        .map(function (skill) {
            const code = String(skill.cd || "");
            const label = String(skill.cd_nm || code);
            const groupCode = getHr012GroupCode(code);
            return {
                code: code,
                label: label,
                groupName: groupNameMap[groupCode] || groupCode || "기타"
            };
        })
        .filter(function (skill) {
            return skill.code.toLowerCase().indexOf(query) >= 0 ||
                skill.label.toLowerCase().indexOf(query) >= 0;
        })
        .sort(function (a, b) {
            return a.label.localeCompare(b.label, "ko");
        })
        .slice(0, max);
}

function renderHr012SkillSuggestions(keyword) {
    const $suggest = $("#hr012-skill-picker-suggest");
    const query = String(keyword || "").trim();
    if (!query) {
        hr012SuggestActiveIndex = -1;
        $suggest.hide().empty();
        return;
    }

    const matches = findHr012SkillMatches(query, 20);
    if (!matches.length) {
        hr012SuggestActiveIndex = -1;
        $suggest.hide().empty();
        return;
    }

    const html = matches.map(function (item) {
        return "<li class='hr012-skill-suggest-item' data-code='" + hr012EscapeHtml(item.code) + "'>" +
            "<span class='name'>" + hr012EscapeHtml(item.label) + "</span>" +
            "<span class='group'>" + hr012EscapeHtml(item.groupName) + "</span>" +
            "</li>";
    }).join("");
    $suggest.html(html).show();
    hr012SuggestActiveIndex = -1;
    syncHr012SuggestionActive();
}

function moveHr012SuggestionSelection(step) {
    const $items = $("#hr012-skill-picker-suggest .hr012-skill-suggest-item");
    if (!$items.length || !$("#hr012-skill-picker-suggest").is(":visible")) {
        return;
    }
    const max = $items.length - 1;
    if (hr012SuggestActiveIndex < 0) {
        hr012SuggestActiveIndex = step > 0 ? 0 : max;
    } else {
        hr012SuggestActiveIndex += step;
        if (hr012SuggestActiveIndex < 0) {
            hr012SuggestActiveIndex = 0;
        }
        if (hr012SuggestActiveIndex > max) {
            hr012SuggestActiveIndex = max;
        }
    }
    syncHr012SuggestionActive();
}

function syncHr012SuggestionActive() {
    const $items = $("#hr012-skill-picker-suggest .hr012-skill-suggest-item");
    $items.removeClass("is-active");
    if (!$items.length || hr012SuggestActiveIndex < 0) {
        return;
    }
    const $active = $items.eq(hr012SuggestActiveIndex);
    $active.addClass("is-active");
    const container = $("#hr012-skill-picker-suggest").get(0);
    const element = $active.get(0);
    if (container && element && typeof element.scrollIntoView === "function") {
        element.scrollIntoView({ block: "nearest" });
    }
}

function getHr012ActiveSuggestItem() {
    const $items = $("#hr012-skill-picker-suggest .hr012-skill-suggest-item");
    if (!$items.length || hr012SuggestActiveIndex < 0) {
        return $();
    }
    return $items.eq(hr012SuggestActiveIndex);
}

function hr012EscapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
