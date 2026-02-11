// 공통코드관리(cm040): tb_cd_mst 기반 MAIN/DETAIL 코드 관리 화면

// ===== 전역 변수 =====
var mainTable;
var detailTable;

var detailMode = "insert";

// API 경로를 한곳에서 관리해 엔드포인트 변경 시 수정 범위를 줄인다.
var API_ENDPOINTS = {
    main: {
        list: "/cm040/main/list",
        delete: "/cm040/main/delete",
        save: "/cm040/main/save"
    },
    detail: {
        list: "/cm040/detail/list",
        delete: "/cm040/detail/delete",
        save: "/cm040/detail/save",
        sort: "/cm040/detail/sort"
    }
};

// 그룹코드별 숫자 접미사 규칙(원/점)
var GROUP_SUFFIX_RULES = {
    amount: ["job_cd"],
    point: ["rank", "grade", "grd_cd", "grade_cd"]
};

// 모달 show/hide 전환 타이밍
var MODAL_TIMINGS = {
    showDelayMs: 100,
    hideDelayMs: 250
};

var currentDetailGrpCd = ""; // DETAIL formatter/폭 계산에서 사용
var detailBaseWidths = {
    checkBox: 50,
    cd: 90,
    sort_no: 90,
    use_yn: 90
};
var detailAutoWidthColumns = [
    { field: "cd_nm", title: "코드명", min: 100, max: 280, charPx: 13, pad: 36 },
    { field: "adinfo_01", title: "부가정보1", min: 70, max: 420, charPx: 13, pad: 36, amountLike: true },
    { field: "adinfo_02", title: "부가정보2", min: 70, max: 420, charPx: 13, pad: 36, amountLike: true },
    { field: "adinfo_03", title: "부가정보3", min: 70, max: 420, charPx: 13, pad: 36, amountLike: true },
    { field: "adinfo_04", title: "부가정보4", min: 70, max: 420, charPx: 13, pad: 36, amountLike: true },
    { field: "adinfo_05", title: "부가정보5", min: 70, max: 420, charPx: 13, pad: 36, amountLike: true }
];
var detailStretchFields = ["cd_nm", "adinfo_01", "adinfo_02", "adinfo_03", "adinfo_04", "adinfo_05"];


// ===== 초기화 =====
$(document).ready(function () {
    buildTables();
    loadMainTableData();

    /* 검색 */
    $(".btn-search").on("click", function (e) {
        e.preventDefault();
        loadMainTableData();
    });

    // ESC 누르면 모달 닫힘
    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            if ($("#write-main-area").hasClass("show")) {
                closeMainWriteModal();
            }
            else if ($("#write-detail-area").hasClass("show")) {
                closeDetailWriteModal();
            }
        }
    });

    /* MAIN 버튼 */
    $(".btn-main-add").on("click", () => openMainWriteModal("insert"));
    $(".btn-main-edit").on("click", () => openMainWriteModal("update"));
    $(".btn-main-del").on("click", deleteMainRows);
    $(".btn-main-save").on("click", upsertMainBtn);

    /* DETAIL 버튼 */
    $(".btn-detail-add").on("click", () => openDetailWriteModal("insert"));
    $(".btn-detail-edit").on("click", () => openDetailWriteModal("update"));
    $(".btn-detail-del").on("click", deleteDetailRows);
    $(".btn-detail-save").on("click", upsertDetailBtn);

    /* DETAIL 정렬 저장 */
    $(".btn-detail-sort-save").on("click", saveDetailSort);
});


// ===== 테이블 생성 =====
function buildTables() {
    // Tabulator 라이브러리가 없으면 테이블 초기화를 진행하지 않는다.
    if (!window.Tabulator) return;
    // MAIN 컨테이너가 없는 화면에서는 공통코드 테이블 생성 로직을 생략한다.
    if (!document.getElementById("TABLE_COMMON_MAIN")) return;

    function toggleRowSelection(row) {
        row.isSelected() ? row.deselect() : row.select();
    }

    function syncRowCheckbox(row, checked) {
        const el = row.getElement();
        const chk = el && el.querySelector(".row-check");
        if (chk) chk.checked = checked;
    }

    function syncTableCheckboxes(table) {
        if (!table || typeof table.getRows !== "function") return;
        // Tabulator 선택 상태와 커스텀 체크박스 표시 상태를 일치시킨다.
        table.getRows().forEach(r => syncRowCheckbox(r, r.isSelected()));
    }

    /* =========================
     * MAIN TABLE (코드그룹)
     * ========================= */
    mainTable = new Tabulator("#TABLE_COMMON_MAIN", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        selectable: 1,
        columnDefaults: {
            resizable: true,
            cellClick: (e, cell) => {
                toggleRowSelection(cell.getRow());
                e.stopPropagation();
            }
        },
        columns: [
            {
                title: "",
                formatter: c =>
                    `<input type="checkbox" class="row-check"${c.getRow().isSelected() ? " checked" : ""}>`,
                width: 50,
                hozAlign: "center",
                headerSort: false,
                cellClick: (e, c) => {
                    toggleRowSelection(c.getRow());
                    e.preventDefault();
                }
            },
            { title: "코드그룹", field: "grp_cd", hozAlign: "center" },
            { title: "코드", field: "cd", hozAlign: "center" },
            { title: "코드그룹명", field: "grp_nm" },
            { title: "사용여부", field: "use_yn", hozAlign: "center", width: 90 }
        ],
        rowSelected: r => syncRowCheckbox(r, true),
        rowDeselected: r => syncRowCheckbox(r, false),
        rowSelectionChanged: function (data) {
            if (!mainTable) return;

            syncTableCheckboxes(mainTable);

            if (data.length) {
                // MAIN 선택 행의 코드(cd)를 기준으로 DETAIL 목록을 조회한다.
                loadDetailTableData(data[0].cd);
            } else {
                // MAIN 선택이 없으면 DETAIL 화면 상태를 초기화한다.
                resetDetailTableState();
            }
        }
    });

    /* =========================
     * DETAIL TABLE (상세코드)
     * ========================= */
    detailTable = new Tabulator("#TABLE_COMMON_DETAIL", {
        // 폭은 코드에서 직접 계산해 적용한다.
        // - 합계가 컨테이너보다 작으면 자동 균일 확장(빈공간 없음)
        // - 합계가 크면 가로 스크롤 노출
        layout: "fitData",
        placeholder: "데이터 없음",
        selectable: true,
        movableRows: true,
        columnDefaults: {
            resizable: true,
            cellClick: (e, cell) => {
                toggleRowSelection(cell.getRow());
                e.stopPropagation();
            }
        },
        columns: [
            {
                title: "",
                formatter: c =>
                    `<input type="checkbox" class="row-check"${c.getRow().isSelected() ? " checked" : ""}>`,
                width: detailBaseWidths.checkBox,
                hozAlign: "center",
                headerSort: false,
                cellClick: (e, c) => {
                    toggleRowSelection(c.getRow());
                    e.preventDefault();
                }
            },
            { title: "코드", field: "cd", hozAlign: "center", width: detailBaseWidths.cd },
            { title: "코드명", field: "cd_nm", width: 140, minWidth: 120 },
            { title: "정렬순서", field: "sort_no", hozAlign: "center", width: detailBaseWidths.sort_no },
            { title: "부가정보1", field: "adinfo_01", formatter: amountFormatter, width: 180, minWidth: 110 },
            { title: "부가정보2", field: "adinfo_02", formatter: amountFormatter, width: 130, minWidth: 110 },
            { title: "부가정보3", field: "adinfo_03", formatter: amountFormatter, width: 130, minWidth: 110 },
            { title: "부가정보4", field: "adinfo_04", formatter: amountFormatter, width: 130, minWidth: 110 },
            { title: "부가정보5", field: "adinfo_05", formatter: amountFormatter, width: 130, minWidth: 110 },
            { title: "사용여부", field: "use_yn", hozAlign: "center", width: detailBaseWidths.use_yn, minWidth: 80 }
        ],
        rowSelected: r => syncRowCheckbox(r, true),
        rowDeselected: r => syncRowCheckbox(r, false),
        rowMoved: () => {
            // 행 이동 직후 화면상의 순서대로 sort_no를 다시 계산한다.
            detailTable.getData().forEach((d, i) => d.sort_no = i + 1);
        }
    });
}


// ===== 공통 유틸 =====
function appendGroupSuffix(text) {
    // 그룹코드가 금액 계열이면 원 단위를 붙인다.
    if (GROUP_SUFFIX_RULES.amount.includes(currentDetailGrpCd)) return text + "원";
    // 그룹코드가 점수 계열이면 점 단위를 붙인다.
    if (GROUP_SUFFIX_RULES.point.includes(currentDetailGrpCd)) return text + "점";
    return text;
}

function formatNumericLikeValue(value, options) {
    var opts = options || {};
    // null/undefined를 안전하게 문자열로 변환한다.
    var raw = String(value == null ? "" : value);
    // 폭 계산용 호출에서는 앞뒤 공백을 제거해 길이 왜곡을 줄인다.
    var normalized = opts.trim ? raw.trim() : raw;
    if (normalized === "") return "";

    // 사용자 입력 콤마를 제거한 뒤 숫자 유효성 검사를 수행한다.
    var numeric = normalized.replace(/,/g, "");
    if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) {
        // formatter에서는 원본 유지, 폭 계산에서는 정규화 문자열을 사용한다.
        return opts.returnOriginalOnInvalid ? value : normalized;
    }

    // 숫자 포맷(천 단위 구분) + 그룹코드 단위(원/점) 규칙을 적용한다.
    return appendGroupSuffix(Number(numeric).toLocaleString("ko-KR"));
}

function amountFormatter(cell) {
    return formatNumericLikeValue(cell.getValue(), {
        returnOriginalOnInvalid: true
    });
}

function formatAmountLikeValue(value) {
    return formatNumericLikeValue(value, { trim: true });
}

function normalizeWidthText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function getTextLength(value) {
    // 멀티바이트 문자열 길이를 안전하게 계산한다.
    return Array.from(String(value || "")).length;
}

function resolveDetailWidthPolicy(cfg) {
    var policy = {
        min: cfg.min,
        max: cfg.max,
        charPx: cfg.charPx,
        pad: cfg.pad
    };

    // 직무코드(job_cd)는 금액 컬럼이 다수라 기본 계산 폭이 과하게 커질 수 있어
    // amount 컬럼에 한해 폭 계산 계수를 보수적으로 조정한다.
    if (cfg.amountLike && currentDetailGrpCd === "job_cd") {
        policy.charPx = Math.min(policy.charPx, 9);
        policy.pad = Math.min(policy.pad, 24);
        policy.max = Math.min(policy.max, 260);
    }

    return policy;
}

function calcDetailColumnWidth(rows, cfg) {
    // 현재 그룹코드 기준 폭 정책(min/max/charPx/pad)을 가져온다.
    var policy = resolveDetailWidthPolicy(cfg);
    // 헤더 텍스트 길이를 기본값으로 시작한다.
    var maxLen = getTextLength(cfg.title || "");
    (rows || []).forEach(function (row) {
        var source = row ? row[cfg.field] : "";
        // amountLike 컬럼은 실제 화면 표기(원/점 포함) 기준으로 길이를 측정한다.
        var text = cfg.amountLike ? formatAmountLikeValue(source) : source;
        var len = getTextLength(normalizeWidthText(text));
        if (len > maxLen) {
            maxLen = len;
        }
    });
    // 글자 길이 기반 픽셀 폭을 계산하고 min/max 범위로 보정한다.
    var width = Math.ceil((maxLen * policy.charPx) + policy.pad);
    if (width < policy.min) width = policy.min;
    if (width > policy.max) width = policy.max;
    return width;
}

function getDetailFieldMax(field) {
    // 컬럼 정의에 등록된 최대폭(max)을 조회한다.
    var direct = detailAutoWidthColumns.find(function (cfg) {
        return cfg.field === field;
    });
    if (direct) {
        return resolveDetailWidthPolicy(direct).max || 0;
    }
    return 0;
}

function getDetailContainerWidth() {
    if (!detailTable) {
        return 0;
    }
    var tableEl = typeof detailTable.getElement === "function"
        ? detailTable.getElement()
        : document.getElementById("TABLE_COMMON_DETAIL");
    if (!tableEl) {
        return 0;
    }
    // 실제 가로 스크롤이 생기는 holder 폭 기준으로 계산해야
    // 컬럼 합계가 미세하게 초과되어 항상 스크롤이 뜨는 현상을 줄일 수 있다.
    var holder = tableEl.querySelector(".tabulator-tableholder")
        || tableEl.querySelector(".tabulator-tableHolder");
    var baseWidth = holder ? holder.clientWidth : tableEl.clientWidth;
    // 경계선/오차를 감안해 2px를 여유로 둔다.
    return Math.max(0, baseWidth - 2);
}

function sumDetailWidths(widthMap) {
    // 고정폭 컬럼 + 자동폭 컬럼 합계를 반환한다.
    return detailBaseWidths.checkBox +
        detailBaseWidths.cd +
        detailBaseWidths.sort_no +
        detailBaseWidths.use_yn +
        (widthMap.cd_nm || 0) +
        (widthMap.adinfo_01 || 0) +
        (widthMap.adinfo_02 || 0) +
        (widthMap.adinfo_03 || 0) +
        (widthMap.adinfo_04 || 0) +
        (widthMap.adinfo_05 || 0);
}

function distributeDetailExtraWidth(widthMap, extraWidth) {
    if (extraWidth <= 0) {
        return;
    }
    var fields = detailStretchFields.slice();
    var remain = Math.max(0, Math.floor(extraWidth));

    while (remain > 0 && fields.length > 0) {
        // 남은 가변 컬럼 수로 나눠 1회 분배량을 계산한다.
        var per = Math.max(1, Math.floor(remain / fields.length));
        var next = [];
        fields.forEach(function (field) {
            if (remain <= 0) {
                return;
            }
            var current = widthMap[field] || 0;
            var max = getDetailFieldMax(field);
            var room = max > 0 ? Math.max(0, max - current) : remain;
            if (room <= 0) {
                return;
            }
            // 각 컬럼의 최대폭 한도를 넘지 않도록 분배한다.
            var add = Math.min(per, room, remain);
            widthMap[field] = current + add;
            remain -= add;
            if (max <= 0 || widthMap[field] < max) {
                next.push(field);
            }
        });
        if (!next.length) {
            break;
        }
        fields = next;
    }

    // max에 막혀 잔여 폭이 남으면 첫번째 가변 컬럼에 배정해 빈공간을 제거한다.
    if (remain > 0 && detailStretchFields.length > 0) {
        var firstField = detailStretchFields[0];
        widthMap[firstField] = (widthMap[firstField] || 0) + remain;
    }
}

// 상세코드 컬럼 폭을 데이터 기준으로 갱신해서 텍스트 축약(...)이 나오지 않도록 한다.
function applyDetailColumnAutoWidth(rows) {
    if (!detailTable) {
        return;
    }
    var list = Array.isArray(rows) ? rows : [];
    var widthMap = {};
    detailAutoWidthColumns.forEach(function (cfg) {
        // 컬럼별 데이터 길이를 계산해 목표 폭을 만든다.
        var width = calcDetailColumnWidth(list, cfg);
        widthMap[cfg.field] = width;
    });

    var containerWidth = getDetailContainerWidth();
    var currentSum = sumDetailWidths(widthMap);
    if (containerWidth > 0 && currentSum < containerWidth) {
        // 합계 폭이 부족하면 가변 컬럼에 남는 폭을 분배한다.
        distributeDetailExtraWidth(widthMap, (containerWidth - currentSum));
    }

    // Tabulator 4.0.5에는 updateColumnDefinition API가 없어서
    // 내부 컬럼 객체에 직접 폭을 반영한다.
    if (typeof detailTable.updateColumnDefinition === "function") {
        var tasks = [];
        detailAutoWidthColumns.forEach(function (cfg) {
            var policy = resolveDetailWidthPolicy(cfg);
            tasks.push(detailTable.updateColumnDefinition(cfg.field, {
                width: widthMap[cfg.field],
                minWidth: policy.min,
                maxWidth: policy.max
            }));
        });
        // 비동기 업데이트 완료를 기다리기 위해 Promise를 반환한다.
        return Promise.all(tasks).catch(function () {
            return null;
        });
    }

    if (!detailTable.columnManager || typeof detailTable.columnManager.findColumn !== "function") {
        return;
    }

    detailAutoWidthColumns.forEach(function (cfg) {
        var col = detailTable.columnManager.findColumn(cfg.field);
        if (!col || typeof col.setWidth !== "function") {
            return;
        }

        if (col.definition) {
            // Tabulator 4.x 내부 컬럼 정의와 runtime 속성을 함께 갱신한다.
            var policy = resolveDetailWidthPolicy(cfg);
            col.definition.minWidth = policy.min;
            col.definition.maxWidth = policy.max;
            col.definition.width = widthMap[cfg.field];
            col.minWidth = policy.min;
            col.maxWidth = policy.max;
        } else {
            var fallbackPolicy = resolveDetailWidthPolicy(cfg);
            col.minWidth = fallbackPolicy.min;
            col.maxWidth = fallbackPolicy.max;
        }
        col.setWidth(widthMap[cfg.field]);
    });

    if (typeof detailTable.redraw === "function") {
        // 강제 redraw로 헤더/셀 폭 반영 시점을 맞춘다.
        detailTable.redraw(true);
    }
}

function getSearchUseYnValue() {
    return $("input[name='searchUseYnRadio']:checked").val()
        || $("#searchUseYn").val();
}

function resetDetailTableState() {
    // 포맷/폭 계산 기준이 되는 현재 그룹코드를 초기화한다.
    currentDetailGrpCd = "";
    if (!detailTable || typeof detailTable.clearData !== "function") {
        return;
    }
    // DETAIL 데이터/폭/렌더를 함께 초기화해 화면 상태를 일치시킨다.
    detailTable.clearData();
    applyDetailColumnAutoWidth([]);
    if (typeof detailTable.redraw === "function") {
        detailTable.redraw(true);
    }
}


// ===== MAIN(코드그룹) =====
function loadMainTableData() {
	if (!mainTable || typeof mainTable.setData !== "function") {
        return;
    }

    var keyword = $.trim($("#searchKeyword").val());
    var useYn = getSearchUseYnValue();

    showLoading(); // 로딩바 표시

    $.ajax({
        url: API_ENDPOINTS.main.list,
        type: "GET",
        data: {
            searchKeyword: keyword,
            searchUseYn: useYn
        },
        success: function (response) {
            // MAIN 재조회 후에는 기존 DETAIL 선택 맥락이 유효하지 않으므로 초기화한다.
            mainTable.setData(response.list || []);
            resetDetailTableState();
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: `'코드그룹' 데이터를 불러오는 중 오류가 발생했습니다.`
            });
        },
        complete: function () {
            hideLoading();
        }
    });
}
async function deleteMainRows() {
	const selectedRows = mainTable.getSelectedRows();

    if (selectedRows.length === 0) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'info',
            title: '알림',
            text: `삭제할 '코드그룹'을 선택해주세요.`
        });
        return;
    }

    // 선택된 첫 번째 행의 이름 가져오기
    var firstRowData = selectedRows[0].getData();

    const firstResult = await showAlert({  // 알림(info), 경고(warning), 오류(error), 완료(success)
        icon: 'warning',
        title: '경고',
        text: `선택한 '${firstRowData.grp_cd} (${firstRowData.grp_nm})' 코드그룹을 삭제하시겠습니까?`,
        showCancelButton: true,
        cancelButtonText: '취소',
        cancelButtonColor: '#212E41'
    });
    if (!firstResult.isConfirmed) return;

    const secondResult = await showAlert({
        icon: 'warning',
        title: '경고',
        text: `다시 확인 버튼을 누르시면 '${firstRowData.grp_cd} (${firstRowData.grp_nm})'의 데이터가 삭제되며, 되돌릴 수 없습니다.`,
        showCancelButton: true,
        cancelButtonText: '취소',
        cancelButtonColor: '#212E41'
    });
    if (!secondResult.isConfirmed) return;

    showLoading();

    // 다건 삭제 완료 시점을 맞추기 위한 카운터와 성공 여부 플래그
    var pending = selectedRows.length;
    var allSucceeded = true;
    selectedRows.forEach(function (row) {
        var rowData = row.getData();
        $.ajax({
            url: API_ENDPOINTS.main.delete,
            type: "POST",
            data: {
                grp_cd: rowData.grp_cd,
                cd: rowData.cd
            },
            success: function (response) {
                if (!response.success) {
                    allSucceeded = false;
                    showAlert({
                        icon: 'error',
                        title: '오류',
                        text: response.message || '삭제할 수 없습니다.'
                    });
                }
            },
            complete: function () {
                // 각 요청 complete마다 카운트를 줄이고 마지막 요청에서 후처리한다.
                pending -= 1;
                if (pending === 0) {
                    hideLoading();
                    loadMainTableData();
                    if (allSucceeded) {
                        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                            icon: 'success',
                            title: '완료',
                            text: '삭제되었습니다.'
                        });
                    }
                }
            },
            error: function () {
                // 네트워크 오류가 1건이라도 있으면 전체 성공 상태를 false로 둔다.
                hideLoading();
                allSucceeded = false;
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: `'코드그룹' 삭제 중 오류가 발생했습니다.`
                });
            }
        });
    });
}
function upsertMainBtn() {
	var grpCd = $.trim($("#write_main_grp_cd").val());
    var grpNm = $.trim($("#write_main_grp_nm").val());
    var useYn = $("#write_main_use_yn").val();
    var code = $.trim($("#write_main_cd").val());

    if (!grpCd) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드그룹'을 입력해주세요.`
        });
        $("#write_main_grp_cd").focus();
        return;
    }

    if (!code) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드'를 입력해주세요.`
        });
        $("#write_main_cd").focus();
        return;
    }

    if (!grpNm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드그룹명'을 입력해주세요.`
        });
        $("#write_main_grp_nm").focus();
        return;
    }

    $.ajax({
        url: API_ENDPOINTS.main.save,
        type: "POST",
        data: {
            grp_cd: grpCd,
            cd: code,
            cd_nm: grpNm,
            use_yn: useYn
        },
        success: function (response) {
            if (response.success) {
                closeMainWriteModal();
                loadMainTableData();
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'success',
                    title: '완료',
                    text: '저장되었습니다.'
                });
            } else {
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: '저장에 실패했습니다.'
                });
            }
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: '저장 중 오류가 발생했습니다.'
            });
        }
    });
}

function openMainWriteModal(type) {
    $("#main-type").text(type === "insert" ? "등록" : "수정");

    if (type === "insert") {
        // 등록 모드: 입력 가능한 기본값으로 폼 초기화
        $("#write_main_grp_cd").val("").prop("disabled", false);
        $("#write_main_grp_nm").val("");
        $("#write_main_use_yn").val("Y");
        $("#write_main_parent_grp_cd").val("");
        $("#write_main_cd").val("").prop("disabled", false);
    } else {
        // 수정 모드: 선택된 1건 데이터만 편집하도록 제한
        var selectedRows = mainTable.getSelectedRows();
        if (selectedRows.length === 0) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                text: `수정할 '코드그룹'을 선택해주세요.`
            });
            return;
        }
        if (selectedRows.length > 1) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                text: '수정은 한 개만 선택해주세요.'
            });
            return;
        }

        var rowData = selectedRows[0].getData();
        $("#write_main_grp_cd").val(rowData.grp_cd).prop("disabled", true);
        $("#write_main_grp_nm").val(rowData.grp_nm);
        $("#write_main_use_yn").val(rowData.use_yn);
        // 부모코드가 없던 과거 데이터는 자기 자신으로 대체한다.
        $("#write_main_parent_grp_cd").val(rowData.parent_grp_cd || rowData.grp_cd);
        $("#write_main_cd").val(rowData.cd).prop("disabled", true);
    }

    const $modal = $("#write-main-area");
    $modal.show();
    setTimeout(() => {
        $("#write-main-area").addClass("show");
    }, MODAL_TIMINGS.showDelayMs);
}
function closeMainWriteModal() {
	const modal = document.getElementById("write-main-area");
    modal.classList.remove("show");
    setTimeout(() => {
        modal.style.display = "none";
    }, MODAL_TIMINGS.hideDelayMs);
}


// ===== DETAIL(상세코드) =====
function loadDetailTableData(grpCd) {
	if (!detailTable || typeof detailTable.setData !== "function") {
        return;
    }

    if (!grpCd) {
        // 유효한 그룹코드가 없으면 DETAIL을 조회하지 않고 초기상태로 되돌린다.
        resetDetailTableState();
        return;
    }
    // 그룹코드 비교/규칙 적용을 위해 소문자로 정규화한다.
    currentDetailGrpCd = String(grpCd).toLowerCase();

     showLoading();

    $.ajax({
        url: API_ENDPOINTS.detail.list,
        type: "GET",
        data: { grp_cd: grpCd },
        success: function (response) {
            var list = Array.isArray(response.list) ? response.list : [];
            var setResult = detailTable.setData(list);
            if (setResult && typeof setResult.then === "function") {
                // Tabulator 비동기 setData인 경우 폭 계산 타이밍을 then 체인으로 맞춘다.
                setResult
                    .then(function () {
                        return applyDetailColumnAutoWidth(list);
                    })
                    .then(function () {
                        if (detailTable && typeof detailTable.redraw === "function") {
                            detailTable.redraw(true);
                        }
                    });
            } else {
                // 동기 setData 버전(구버전/환경)도 동일하게 폭 계산을 적용한다.
                applyDetailColumnAutoWidth(list);
                if (detailTable && typeof detailTable.redraw === "function") {
                    detailTable.redraw(true);
                }
            }
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: `'상세코드' 데이터를 불러오는 중 오류가 발생했습니다.`
            });
        },
        complete: function () {
            hideLoading();
        }
    });
}
async function deleteDetailRows() {
	const selectedRows = detailTable.getSelectedRows();

    if (selectedRows.length === 0) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'info',
            title: '알림',
            text: `삭제할 '상세코드'를 선택해주세요.`
        });
        return;
    }

    const firstRow = selectedRows[0].getData();

     const firstResult = await showAlert({
        icon: 'warning',
        title: '경고',
        text: `선택한 '${firstRow.cd} (${firstRow.cd_nm})' 상세코드를 삭제하시겠습니까?`,
        showCancelButton: true,
        confirmText: '삭제',
        cancelText: '취소'
     });

    if (!firstResult.isConfirmed) return;

    const secondResult = await showAlert({
        icon: 'warning',
        title: '경고',
        text: `다시 확인 버튼을 누르시면 '${firstRow.cd} (${firstRow.cd_nm})'의 데이터가 삭제되며, 되돌릴 수 없습니다.`,
        showCancelButton: true,
        confirmText: '삭제',
        cancelText: '취소'
    });

    if (!secondResult.isConfirmed) return;

    showLoading();

    // 다건 삭제 complete 기준으로 후처리를 맞춘다.
    var pending = selectedRows.length;
    var grpCd = selectedRows[0].getData().grp_cd;

    selectedRows.forEach(function (row) {
        $.ajax({
            url: API_ENDPOINTS.detail.delete,
            type: "POST",
            data: {
                grp_cd: row.getData().grp_cd,
                cd: row.getData().cd
            },
            complete: function () {
                // 마지막 complete 시점에만 목록 재조회/성공 알림을 실행한다.
                pending -= 1;
                if (pending === 0) {
                    hideLoading();
                    loadDetailTableData(grpCd);
                    showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                        icon: 'success',
                        title: '완료',
                        text: '삭제되었습니다.'
                    });
                }
            },
            error: function () {
                hideLoading();
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: `'상세코드' 삭제 중 오류가 발생했습니다.`
                });
            }
        });
    });
}

function applyDetailSort(rows) {
	if (!rows.length) return;

    // 다건 정렬 저장 완료 타이밍 제어용 카운터
    let pending = rows.length;
    const grpCd = rows[0].grp_cd;

    rows.forEach(rowData => {
        $.ajax({
            url: API_ENDPOINTS.detail.sort,
            type: "POST",
            data: {
                grp_cd: rowData.grp_cd,
                cd: rowData.cd,
                sort_no: rowData.sort_no
            },
            complete: function () {
                // 모든 요청이 끝났을 때만 로딩 종료/재조회/완료 알림 처리
                pending -= 1;
                if (pending === 0) {
                    hideLoading();
                    loadDetailTableData(grpCd);

                    showAlert({
                        icon: 'success',
                        title: '완료',
                        text: '정렬순서가 저장되었습니다.'
                    });
                }
            }
        });
    });
}

function upsertDetailBtn() {
	var grpCd = $.trim($("#write_detail_grp_cd").val());
    var cd = $.trim($("#write_detail_cd").val());
    var preCd = $.trim($("#write_detail_cd_origin").val());
    var cdNm = $.trim($("#write_detail_cd_nm").val());
    var sortNo = parseInt($("#write_detail_sort_no").val(), 10);

    if (!grpCd) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드그룹'을 선택해주세요.`
        });
        return;
    }

    if (!cd) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드'를 입력해주세요.`
        });
        $("#write_detail_cd").focus();
        return;
    }

    if (!cdNm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드명'을 입력해주세요.`
        });
        $("#write_detail_cd_nm").focus();
        return;
    }

    if (!sortNo || sortNo < 1) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'정렬순서'를 입력해주세요.`
        });
        $("#write_detail_sort_no").focus();
        return;
    }

    // 수정 모드에서 기존 코드값(pre_cd)이 비어 있으면 현재 코드를 fallback으로 사용한다.
    if (detailMode === "update" && !preCd) {
        preCd = cd;
    }

    $.ajax({
        url: API_ENDPOINTS.detail.save,
        type: "POST",
        data: {
            grp_cd: grpCd,
            cd: cd,
            pre_cd: preCd,
            cd_nm: cdNm,
            sort_no: sortNo,
            adinfo_01: $.trim($("#write_detail_adinfo_01").val()),
            adinfo_02: $.trim($("#write_detail_adinfo_02").val()),
            adinfo_03: $.trim($("#write_detail_adinfo_03").val()),
            adinfo_04: $.trim($("#write_detail_adinfo_04").val()),
            adinfo_05: $.trim($("#write_detail_adinfo_05").val()),
            use_yn: $("#write_detail_use_yn").val(),
            // 서버가 insert/update 분기를 할 수 있도록 mode를 함께 전송한다.
            mode: detailMode
        },
        success: function (response) {
            if (response.success) {
                closeDetailWriteModal();
                loadDetailTableData(grpCd);
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'success',
                    title: '완료',
                    text: '저장되었습니다.'
                });
            } else {
                showAlert({
                    icon: 'error',
                    title: '오류',
                    text: response.message || '저장에 실패했습니다.'
                });
            }
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: '저장 중 오류가 발생했습니다.'
            });
        }
    });
}

function openDetailWriteModal(type) {
	detailMode = type;
    $("#detail-type").text(type === "insert" ? "등록" : "수정");

    if (!detailTable || typeof detailTable.getData !== "function") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'상세 테이블'이 초기화되지 않았습니다.`
        });
        return;
    }

    if (type === "insert") {
        // 등록 모드: MAIN 선택값을 부모코드로 사용한다.
        if (!mainTable || typeof mainTable.getSelectedRows !== "function") {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'warning',
                title: '경고',
                text: `'코드그룹 테이블'이 초기화되지 않았습니다.`
            });
            return;
        }

        var selectedMain = mainTable.getSelectedRows();
        if (selectedMain.length === 0) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'warning',
                title: '경고',
                text: `'코드그룹'을 먼저 선택해주세요.`
            });
            return;
        }

        var mainData = selectedMain[0].getData();
        $("#write_detail_grp_cd").val(mainData.cd);
        $("#write_detail_cd").val("");
        $("#write_detail_cd_origin").val("");
        $("#write_detail_cd_nm").val("");

        // 기존 목록의 최대 정렬순서 뒤에 새 코드를 배치한다.
        var maxSort = detailTable.getData()
            .reduce(function (acc, item) { return Math.max(acc, item.sort_no || 0); }, 0);
        $("#write_detail_sort_no").val(maxSort + 1);
        $("#write_detail_adinfo_01").val("");
        $("#write_detail_adinfo_02").val("");
        $("#write_detail_adinfo_03").val("");
        $("#write_detail_adinfo_04").val("");
        $("#write_detail_adinfo_05").val("");
        $("#write_detail_use_yn").val("Y");
    } else {
        // 수정 모드: 선택한 상세코드 1건을 폼에 바인딩한다.
        var selectedDetail = detailTable.getSelectedRows();
        if (selectedDetail.length === 0) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                text: `수정할 '상세코드'를 선택해주세요.`
            });
            return;
        }
        if (selectedDetail.length > 1) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                text: '수정은 한 개만 선택해주세요.'
            });
            return;
        }

        var rowData = selectedDetail[0].getData();
        $("#write_detail_grp_cd").val(rowData.grp_cd);
        $("#write_detail_cd").val(rowData.cd);
        $("#write_detail_cd_origin").val(rowData.cd);
        $("#write_detail_cd_nm").val(rowData.cd_nm);
        $("#write_detail_sort_no").val(rowData.sort_no);
        $("#write_detail_adinfo_01").val(rowData.adinfo_01 || "");
        $("#write_detail_adinfo_02").val(rowData.adinfo_02 || "");
        $("#write_detail_adinfo_03").val(rowData.adinfo_03 || "");
        $("#write_detail_adinfo_04").val(rowData.adinfo_04 || "");
        $("#write_detail_adinfo_05").val(rowData.adinfo_05 || "");
        $("#write_detail_use_yn").val(rowData.use_yn);
    }
    const $modal = $("#write-detail-area");
    $modal.show();
    setTimeout(() => {
        $("#write-detail-area").addClass("show");
    }, MODAL_TIMINGS.showDelayMs);
}
function closeDetailWriteModal() {
	const modal = document.getElementById("write-detail-area");
    modal.classList.remove("show");
    setTimeout(() => {
        modal.style.display = "none";
    }, MODAL_TIMINGS.hideDelayMs);
}


// ===== DETAIL 정렬 저장 =====
async function saveDetailSort() {
    if (!detailTable) return;

    const rows = detailTable.getData();
    if (!rows.length) {
        showAlert({ icon: "warning", title: "경고", text: "저장할 정렬 데이터가 없습니다." });
        return;
    }

    const result = await showAlert({
        icon: "info",
        title: "알림",
        text: "현재 정렬순서를 저장하시겠습니까?",
        showCancelButton: true,
        confirmText: "저장",
        cancelText: "취소"
    });

    if (!result.isConfirmed) return;

    showLoading();
    rows.forEach((r, i) => r.sort_no = i + 1);
    applyDetailSort(rows);
}
