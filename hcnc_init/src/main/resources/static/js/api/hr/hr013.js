// hr013.js
// 탭3 편집 상태/참조 데이터 캐시
var stackTagInput = null;
var pendingStackValue = "";
var lastNonInprjCustNm = "";
var hr013DeletedIds = [];
var hr013SkillOptions = [];
var hr013JobOptions = [];
var hr013SkillGroupOptions = [];
var hr013SkillPicker = null;
const HR013_PROJECT_GRP_CD = "prj_cd"; // 프로젝트 공통코드 그룹 상수

var hr013ProjectPickerTable = null;     // 팝업 내 목록 테이블 인스턴스
var hr013ProjectPickerContextRow = null; // 어느 행에서 팝업 열었는지 기억
var hr013SelectedProjectCode = null;     // 사용자가 선택한 코드 1건

var hr013Data = []; // 테이블 구조 분리
var hr013Paging = {
    page: 1,
    size: 5,
    total: 0
};

const $container = $("#TABLE_HR013_A");
let hr013LastRenderedRows = [];

function isHr013InprjYnY(value) {
    return String(value || "").trim().toUpperCase() === "Y";
}

function isHr013ProjectCodeSelectable(data) {
    return isHr013InprjYnY(data && data.inprj_yn);
}

// 프로젝트 탭 초기화 (버튼/콤보/태그/테이블)
window.initTab3 = function () {
    // 프로젝트 제목 옆 건수 표기 초기화
    updateHr013TitleCount();
    loadHr013TableData();

    $("#write_hr013_rate_amt").on("input", function () {
        $(this).val(formatNumberInput($(this).val()));
    });

    $("#write_hr013_alloc_pct").on("input", function () {
        $(this).val(formatPercentInput($(this).val()));
    });

    $("#write_hr013_inprj_yn").off("change").on("change", function () {
        applyInprjCustomerName($(this).val(), $("#write_hr013_cust_nm").val());
        syncHr013ProjectLinkUi($(this).val());
    });
    $("#write_hr013_cust_nm").off("input").on("input", function () {
        if ($("#write_hr013_inprj_yn").val() !== "Y") {
            lastNonInprjCustNm = $(this).val();
        }
    });
    $("#btn_hr013_project_link").off("click.hr013projectlink").on("click.hr013projectlink", function () {
        openHr013ProjectPicker(null);
    });

    // 역할/기술스택 공통코드는 테이블 formatter/editor에서 재사용하므로 캐시해 둔다.
    setComCode("write_hr013_job_cd", "job_cd", "", "cd", "cd_nm", function () {
        hr013JobOptions = $("#write_hr013_job_cd option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();
        initSelectDefault("write_hr013_job_cd", "선택");
        jobMap = getJobCodeMap();
    });
    setComCode("write_hr013_skl_cd", "skl_id", "", "cd", "cd_nm", function (res) {
        hr013SkillOptions = res || [];
        if (!stackTagInput) {
            stackTagInput = createTagInput({
                inputSelector: "#write_hr013_stack_input",
                listSelector: "#hr013SkillTagList",
                hiddenSelector: "#write_hr013_stack_txt",
                datalistSelector: "#write_hr013_stack_datalist",
                getValue: function (item) { return item.cd; },
                getLabel: function (item) { return item.cd_nm; },
                matchMode: "prefix"
            });
        }
        bindHr013SkillPickerEvents();
        stackTagInput.setOptions(res || []);
        stackTagInput.setFromValue(pendingStackValue || $("#write_hr013_stack_txt").val());
        syncHr013SkillPickerUi(true);
        // 프로젝트 선택 팝업 이벤트/테이블은 최초 1회 초기화
        bindHr013ProjectPickerEvents();
    });

    getComCode("skl_grp", "", function (res) {
        hr013SkillGroupOptions = Array.isArray(res) ? res : [];
        syncHr013SkillPickerUi(true);
    });
};

// 프로젝트 제목 옆 건수(span.hcnc-grid-count-number) 업데이트
function updateHr013TitleCount() {
    $("#hr013-count .hcnc-grid-count-number").text(hr013Data.length);
}

// 프로젝트 선택 팝업 검색 결과 건수
function updateHr013ProjectPickerCount(count) {
    $("#hr013-project-picker-count .hcnc-grid-count-number").text(count||0);
}

let jobMap = [];

// 프로젝트 이력 모달 열기
function openHr013Modal(mode) {
    if (!isHr013Editable()) {
        showAlert({
            icon: "info",
            title: "안내",
            text: "상세보기에서는 프로젝트 이력을 수정할 수 없습니다. 수정하기를 눌러주세요."
        });
        return;
    }

    var title = mode === "edit" ? "수정" : "등록";
    $("#hr013-type").text(title);
    closeHr013SkillPicker(true);

    if (mode === "edit") {
        var rowData = getHr013SelectedRow();

        if (!rowData) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                text: '수정할 행을 선택해주세요.'
            });
            return;
        }
        fillHr013Form(rowData);
    } else {
        clearHr013Form();
    }

    $("#write-hr013-area").show();
}

function openHr013RowEditor(row) {
    if (!isHr013Editable()) return;
    const rowData = row?.getData ? row.getData() : row;
    $("#hr013-type").text(rowData?.dev_prj_id ? "수정" : "등록");
    closeHr013SkillPicker(true);
    if (rowData) {
        fillHr013Form(rowData);
    } else {
        clearHr013Form();
    }
    $("#write-hr013-area").show();
}

// 프로젝트 이력 모달 닫기
function closeHr013Modal() {
    closeHr013SkillPicker(true);
    $("#write-hr013-area").hide();
}

// 기술 선택 팝업 공통 팩토리 초기화(최초 1회)
function initHr013SkillPicker() {
    if (hr013SkillPicker || typeof createGroupedSkillPicker !== "function") {
        return;
    }

    hr013SkillPicker = createGroupedSkillPicker({
        namespace: "hr013",
        pickerAreaSelector: "#hr013-skill-picker-area",
        openTriggerSelector: "#btn_hr013_skill_picker",
        applyTriggerSelector: "#btn_hr013_skill_picker_apply",
        closeTriggerSelector: "#btn_hr013_skill_picker_close_x",
        tableSelector: "#TABLE_HR013_SKILL_PICKER",
        searchInputSelector: "#hr013-skill-picker-search",
        searchWrapSelector: ".hr013-skill-picker-search-wrap",
        suggestListSelector: "#hr013-skill-picker-suggest",
        metaSelector: "#hr013-skill-picker-meta",
        chipClass: "hr013-skill-chip",
        chipWrapClass: "hr013-skill-chip-wrap",
        suggestItemClass: "hr013-skill-suggest-item",
        flashClass: "is-flash",
        groupColumnWidth: 180,
        getSkillOptions: function () {
            return hr013SkillOptions || [];
        },
        getGroupOptions: function () {
            return hr013SkillGroupOptions || [];
        },
        // 모달/그리드 어느 화면에서 열렸는지에 따라 현재 선택값 원본을 분기한다.
        getSelectedCodes: function (context) {
            if (context && context.type === "grid" && context.row) {
                return getHr013RowSelectedCodeSet(context.row);
            }
            return getHr013SelectedCodeSet();
        },
        // 모달 내부 버튼으로 열릴 때는 기본 context를 modal로 고정한다.
        getContextFromOpenEvent: function () {
            return { type: "modal", row: null };
        },
        isReadonly: function () {
            return currentMode === "view" || window.hr010ReadOnly;
        },
        // "적용" 버튼을 눌렀을 때만 실제 원본 데이터(모달 hidden/그리드 row)를 갱신한다.
        onApply: function (payload) {
            var csv = payload && payload.csv ? payload.csv : "";
            var context = payload && payload.context ? payload.context : null;

            if (context && context.type === "grid" && context.row && typeof context.row.update === "function") {
                var updateResult = context.row.update({
                    skl_id_lst: getHr013SkillArrayFromCsv(csv),
                    stack_txt: csv,
                    stack_txt_nm: getSkillLabelList(csv)
                });

                if (updateResult && typeof updateResult.then === "function") {
                    updateResult.then(function () {
                        scheduleHr013StackRowState(context.row);
                    });
                } else {
                    scheduleHr013StackRowState(context.row);
                }

                changedTabs.tab3 = true;
                return;
            }

            if (stackTagInput) {
                stackTagInput.setFromValue(csv);
            } else {
                $("#write_hr013_stack_txt").val(csv);
            }
            pendingStackValue = csv;
        }
    });
}

// 팝업 이벤트는 공통 유틸 내부에서 네임스페이스로 1회 바인딩한다.
function bindHr013SkillPickerEvents() {
    initHr013SkillPicker();
    if (hr013SkillPicker) {
        hr013SkillPicker.bindEvents();
    }
}

// sourceType(modal/grid)에 따라 선택 원본을 분기해서 팝업을 연다.
function openHr013SkillPicker(sourceType, row) {
    if (!isHr013Editable()) {
        return;
    }
    initHr013SkillPicker();
    if (!hr013SkillPicker) {
        return;
    }
    var contextType = sourceType === "grid" ? "grid" : "modal";
    if (contextType === "grid" && (!row || typeof row.getData !== "function")) {
        return;
    }
    hr013SkillPicker.open({
        type: contextType,
        row: contextType === "grid" ? row : null
    });
}

// 프로젝트 선택 팝업 이벤트 바인딩(중복 바인딩 방지)
function bindHr013ProjectPickerEvents() {
    $("#btn_hr013_project_picker_close_x").off("click.hr013project").on("click.hr013project", function () {
        closeHr013ProjectPicker(true); // 즉시 닫기
    });

    $("#btn_hr013_project_picker_apply").off("click.hr013project").on("click.hr013project", function () {
        applyHr013ProjectPickerSelection(); // 선택값을 원본 행에 반영
    });

    $("#btn_hr013_project_code_save").off("click.hr013project").on("click.hr013project", function () {
        saveHr013ProjectCode(); // 신규 공통코드 등록
    });

    $("#btn_hr013_project_picker_search").off("click.hr013project").on("click.hr013project", function () {
        loadHr013ProjectCodeList($.trim($("#hr013-project-picker-search").val())); // 검색 버튼 클릭 시 조회
    });

    $("#hr013-project-picker-search").off("keyup.hr013project").on("keyup.hr013project", function (e) {
        if (e.key === "Enter") {
            loadHr013ProjectCodeList($.trim($(this).val()));    // 검색어로 목록 조회
        }
    });

    initHr013ProjectPickerTable();  // 목록 테이블 생성(최초 1회)
}

// 팝업 내부 프로젝트 목록 테이블 생성
function initHr013ProjectPickerTable() {
    if (hr013ProjectPickerTable || !document.getElementById("TABLE_HR013_PROJECT_PICKER")) {
        // 이미 생성됐거나 팝업 DOM이 아직 없으면 재생성하지 않는다.
        return;
    }

    hr013ProjectPickerTable = new Tabulator("#TABLE_HR013_PROJECT_PICKER", {
        layout: "fitColumns",
        selectable: 1,
        /*height: "480px",*/
        selectableRange: false, // v5 이상이면 안전하게 추가
        resizableColumns: false,
        pagination: "local",
        paginationSize: 10,
        paginationSizeSelector: [5, 10, 15, 20],
        columns: [
            { title: "코드", field: "cd", width: 120, hozAlign: "center" },
            { title: "프로젝트명", field: "cd_nm", widthGrow: 1 },
            { title: "당사 여부", field: "inprj_yn", minWidth: 80, width: 85, hozAlign: "center" },
        ],
        rowSelected: function (row) {
            var data = row && typeof row.getData === "function" ? row.getData() : null;
            if (!isHr013ProjectCodeSelectable(data)) {
                if (typeof row.deselect === "function") {
                    row.deselect();
                }
                hr013SelectedProjectCode = null;
                return;
            }
            hr013SelectedProjectCode = data;
        },
        rowDeselected: function (row) {
            var data = row.getData();
            if (hr013SelectedProjectCode && data && hr013SelectedProjectCode.cd === data.cd) {
                hr013SelectedProjectCode = null;
            }
        },
        data: []
    });
}

// 특정 행 컨텍스트로 프로젝트 선택 팝업 열기
async function openHr013ProjectPicker(row) {
    bindHr013ProjectPickerEvents();
    if (!isHr013Editable()) return;

    var rowData = row && typeof row.getData === "function" ? row.getData() : null;
    var currentInprjYn = rowData ? rowData.inprj_yn : $("#write_hr013_inprj_yn").val();
    if (!isHr013InprjYnY(currentInprjYn)) {
        showAlert({
            icon: "info",
            title: "알림",
            html: `<div><strong>당사 프로젝트</strong>만 선택할 수 있습니다.</div>`
        });
        return;
    }

    showLoading();

    try {
        hr013ProjectPickerContextRow = row || null;
        hr013SelectedProjectCode = null;

        $("#write_hr013_project_cd_nm").val("");
        $("#write_hr013_project_inprj_yn").val("Y");
        $("#hr013-project-picker-search").val("");

        // 데이터 먼저 로딩
        await loadHr013ProjectCodeList("");

        const $modal = $("#hr013-project-picker-area");
        $modal.show().addClass("show");

        setTimeout(() => {
            if (hr013ProjectPickerTable) {
                hr013ProjectPickerTable.redraw(true);
            }

            // 한 번 더 (안정성)
            setTimeout(() => {
                if (hr013ProjectPickerTable) {
                    hr013ProjectPickerTable.redraw(true);
                }
            }, 50);

        }, 0);

    } catch (e) {
        console.error(e);
    } finally {
        hideLoading();
    }
}

// 팝업 닫기
function closeHr013ProjectPicker(immediate) {
    const $modal = $("#hr013-project-picker-area");
    if (immediate) {
        $modal.removeClass("show").hide();
        return;
    }
    $modal.removeClass("show");
    setTimeout(function () {
        if (!$modal.hasClass("show")) {
            $modal.hide();
        }
    }, 180);
}

function findHr013ProjectPickerDataIndex(list, targetCd, targetName) {
    for (var i = 0; i < list.length; i += 1) {
        var item = list[i] || {};
        if (targetCd && String(item.cd || "") === targetCd) {
            return i;
        }
        if (!targetCd && targetName && String(item.cd_nm || "").trim() === targetName) {
            return i;
        }
    }
    return -1;
}

function findHr013ProjectPickerRow(rows, targetCd, targetName) {
    for (var i = 0; i < rows.length; i += 1) {
        var row = rows[i];
        var data = row && typeof row.getData === "function" ? row.getData() : null;
        if (!data) continue;
        if (targetCd && String(data.cd || "") === targetCd) {
            return row;
        }
        if (!targetCd && targetName && String(data.cd_nm || "").trim() === targetName) {
            return row;
        }
    }
    return null;
}

// 팝업에서 사용자가 고른 코드를 찾기(페이지 이동 포함)
function focusHr013ProjectPickerRow(focusCd, focusName, dataList) {
    if (!hr013ProjectPickerTable) return;

    var targetCd = String(focusCd || "").trim();
    var targetName = String(focusName || "").trim();
    if (!targetCd && !targetName) return;

    var allData = Array.isArray(dataList)
        ? dataList
        : ((typeof hr013ProjectPickerTable.getData === "function")
            ? hr013ProjectPickerTable.getData()
            : []);
    if (!Array.isArray(allData) || !allData.length) return;

    // 전체 데이터 기준 인덱스를 먼저 찾고, 페이지가 다르면 해당 페이지로 이동한다.
    var targetIndex = findHr013ProjectPickerDataIndex(allData, targetCd, targetName);
    if (targetIndex < 0) return;

    var selectTargetRow = function () {
        var activeRows = (typeof hr013ProjectPickerTable.getRows === "function")
            ? hr013ProjectPickerTable.getRows("active")
            : [];
        if (!Array.isArray(activeRows) || !activeRows.length) {
            activeRows = (typeof hr013ProjectPickerTable.getRows === "function")
                ? hr013ProjectPickerTable.getRows()
                : [];
        }

        var targetRow = findHr013ProjectPickerRow(activeRows || [], targetCd, targetName);
        if (!targetRow) {
            return;
        }

        var targetData = typeof targetRow.getData === "function" ? targetRow.getData() : null;
        if (!isHr013ProjectCodeSelectable(targetData)) {
            hr013SelectedProjectCode = null;
            return;
        }

        if (typeof hr013ProjectPickerTable.deselectRow === "function") {
            hr013ProjectPickerTable.deselectRow();
        }
        if (typeof targetRow.select === "function") {
            targetRow.select();
        }
        hr013SelectedProjectCode = targetData;

        if (typeof hr013ProjectPickerTable.scrollToRow === "function") {
            var scrollResult = hr013ProjectPickerTable.scrollToRow(targetRow, "center", false);
            if (scrollResult && typeof scrollResult.catch === "function") {
                scrollResult.catch(function () { });
            }
        }
    };

    var pageSize = (typeof hr013ProjectPickerTable.getPageSize === "function")
        ? Number(hr013ProjectPickerTable.getPageSize())
        : 0;
    if (!pageSize || pageSize <= 0) {
        pageSize = Number(hr013ProjectPickerTable.options && hr013ProjectPickerTable.options.paginationSize);
    }

    if (typeof hr013ProjectPickerTable.setPage === "function" && pageSize > 0) {
        var targetPage = Math.floor(targetIndex / pageSize) + 1;
        var setPageResult = hr013ProjectPickerTable.setPage(targetPage);
        if (setPageResult && typeof setPageResult.then === "function") {
            setPageResult.then(function () {
                setTimeout(selectTargetRow, 0);
            }).catch(function () {
                setTimeout(selectTargetRow, 0);
            });
        } else {
            setTimeout(selectTargetRow, 0);
        }
        return;
    }

    selectTargetRow();
}

// 공통코드 목록 조회
function loadHr013ProjectCodeList(keyword, options) {
    if (!hr013ProjectPickerTable) return Promise.resolve();

    options = options || {};
    var focusCd = String(options.focusCd || "").trim();
    var focusName = String(options.focusName || "").trim();

    return $.ajax({
        url: "/hr013/project-code/list",
        type: "GET",
        data: {
            keyword: keyword || "",
            grp_cd: HR013_PROJECT_GRP_CD
        }
    }).then(function (res) {
        const list = (res && res.list) ? res.list : [];
        updateHr013ProjectPickerCount(list.length);

        var setDataResult = hr013ProjectPickerTable.setData(list);

        return new Promise(function (resolve) {
            var afterSetData = function () {
                if (focusCd || focusName) {
                    focusHr013ProjectPickerRow(focusCd, focusName, list);
                } else {
                    hr013ProjectPickerTable.deselectRow();
                    hr013SelectedProjectCode = null;
                }
                resolve();
            };

            if (setDataResult && typeof setDataResult.then === "function") {
                setDataResult.then(afterSetData);
            } else {
                setTimeout(afterSetData, 0);
            }
        });
    }).catch(function () {
        updateHr013ProjectPickerCount(0);
        showAlert({
            icon: "error",
            title: "오류",
            text: "프로젝트 코드를 불러오지 못했습니다."
        });
    });
}

// 선택값을 원본 행(prj_nm)에 반영
function applyHr013ProjectPickerSelection() {
    if (!hr013SelectedProjectCode && hr013ProjectPickerTable && typeof hr013ProjectPickerTable.getSelectedData === "function") {
        var selectedRows = hr013ProjectPickerTable.getSelectedData();
        if (selectedRows && selectedRows.length > 0) {
            hr013SelectedProjectCode = selectedRows[0];
        }
    }

    if (!hr013SelectedProjectCode) {
        showAlert({
            icon: "info", title: "알림", text: "프로젝트를 선택해주세요."
        })
        return;
    }
    if (!isHr013ProjectCodeSelectable(hr013SelectedProjectCode)) {
        showAlert({
            icon: "info", title: "알림", html: `<div><strong>당사 프로젝트</strong>만 선택할 수 있습니다.</div>`
        });
        return;
    }
    const selectedName = String(hr013SelectedProjectCode.cd_nm || "").trim();
    if (!selectedName) {
        showAlert({ icon: "warning", title: "경고", text: "선택된 프로젝트명이 비어 있습니다." });
        return;
    }

    if (hr013ProjectPickerContextRow && typeof hr013ProjectPickerContextRow.update === "function") {
        // 실제 저장 컬럼은 기존 설계대로 prj_nm(프로젝트명)만 우선 반영한다.
        hr013ProjectPickerContextRow.update({
            prj_nm: selectedName
        });
    } else {
        $("#write_hr013_prj_nm").val(selectedName);
    }

    changedTabs.tab3 = true;
    closeHr013ProjectPicker(false);
}

// 신규 프로젝트 코드 저장
async function saveHr013ProjectCode() {
    const cdNm = $.trim($("#write_hr013_project_cd_nm").val());
    const inprjYn = String($("#write_hr013_project_inprj_yn").val() || "N").toUpperCase();

    if (!cdNm) {
        showAlert({ icon: "warning", title: "경고", text: "프로젝트명을 입력해주세요." });
        $("#write_hr013_project_cd_nm").focus();
        return;
    }

    const confirmResult = await showAlert({
        icon: "warning",
        title: "확인",
        html: `<div><strong>cdNm</strong>&nbsp;프로젝트를 등록하시겠습니까?</div>`,
        showCancelButton: true,
        confirmText: "등록",
        cancelText: "취소",
        cancelButtonColor: "#212E41"
    });

    if (!confirmResult.isConfirmed) {
        return;
    }

    $.ajax({
        url: "/hr013/project-code/save",
        type: "POST",
        data: {
            grp_cd: HR013_PROJECT_GRP_CD,
            cd_nm: cdNm,
            inprj_yn: inprjYn
        },
        success: function (res) {
            if (!res || !res.success) {
                showAlert({ icon: "error", title: "오류", text: (res && res.message) || "저장 실패" });
                return;
            }

            // 백엔드에서 생성한 코드(PRJ### 또는 숫자형)를 그대로 받아 재조회 기준으로 사용한다.
            var savedCd = String((res && res.cd) || "").trim();

            // 저장 직후 전체 목록 재조회 + 신규 항목 자동 선택/포커스
            loadHr013ProjectCodeList("", {
                focusCd: savedCd,
                focusName: cdNm
            });

            // UX: 방금 입력값은 우선 행에 반영할 수 있게 선택 상태로 보관
            hr013SelectedProjectCode = {
                cd: savedCd,
                cd_nm: cdNm,
                inprj_yn: inprjYn
            };

            showAlert({ icon: "success", title: "완료", text: "신규 프로젝트 코드가 등록되었습니다." });
        },
        error: function () {
            showAlert({ icon: "error", title: "오류", text: "프로젝트 코드 저장 중 오류가 발생했습니다." });
        }
    });
}

function closeHr013SkillPicker(immediate) {
    if (!hr013SkillPicker) {
        return;
    }
    hr013SkillPicker.close(immediate);
}

function syncHr013SkillPickerUi(forceRebuild) {
    if (!hr013SkillPicker) {
        return;
    }
    hr013SkillPicker.sync(forceRebuild);
}

// 모달 hidden(csv) 값에서 현재 선택 코드를 Set으로 복원한다.
function getHr013SelectedCodeSet() {
    var set = new Set();
    var csv = $("#write_hr013_stack_txt").val();
    String(csv || "")
        .split(",")
        .forEach(function (item) {
            var code = $.trim(item);
            if (code) {
                set.add(code);
            }
        });
    return set;
}

// 인라인 그리드 행의 기술값(skl_id_lst/stack_txt)도 동일한 Set 포맷으로 복원한다.
function getHr013RowSelectedCodeSet(row) {
    var set = new Set();
    if (!row || typeof row.getData !== "function") {
        return set;
    }
    var data = row.getData() || {};
    var codes = getHr013SkillCodeList(data.skl_id_lst || data.stack_txt || "");
    codes.forEach(function (code) {
        set.add(code);
    });
    return set;
}

// stack_txt/skl_id_lst가 CSV/JSON/객체 배열이어도 코드 배열로 정규화한다.
function getHr013SkillCodeList(value) {
    if (value == null) {
        return [];
    }
    if (Array.isArray(value)) {
        return value
            .map(function (item) {
                if (typeof item === "string") {
                    return resolveHr013SkillCodeToken(item);
                }
                if (item && typeof item === "object") {
                    return resolveHr013SkillCodeToken(extractHr013SkillCode(item) || extractHr013SkillLabel(item, ""));
                }
                return "";
            })
            .filter(function (code) {
                return !!code;
            });
    }
    var raw = String(value).trim();
    if (!raw) {
        return [];
    }
    if (raw.charAt(0) === "[") {
        try {
            var parsed = JSON.parse(raw);
            return getHr013SkillCodeList(parsed);
        } catch (e) {
            // ignore parse error and fallback to csv split
        }
    }
    return raw
        .split(",")
        .map(function (item) {
            return resolveHr013SkillCodeToken(item);
        })
        .filter(function (item) {
            return !!item;
        });
}

function getHr013SkillLabelByCode(code) {
    var key = String(code || "").trim();
    if (!key) {
        return "";
    }
    var found = (hr013SkillOptions || []).find(function (item) {
        return String(item.cd || "") === key;
    });
    return found ? String(found.cd_nm || found.cd || key) : key;
}

// 단일 토큰(코드/라벨/깨진 문자열)을 최종 코드값으로 보정한다. ex[object Object]
function resolveHr013SkillCodeToken(token) {
    var raw = $.trim(String(token || ""));
    if (!raw) {
        return "";
    }
    var compact = raw.replace(/\s+/g, "").toLowerCase();
    if (compact === "[objectobject]") {
        return "";
    }
    var byCode = (hr013SkillOptions || []).find(function (item) {
        return String(item.cd || "") === raw;
    });
    if (byCode) {
        return String(byCode.cd || "");
    }
    var byLabel = (hr013SkillOptions || []).find(function (item) {
        return String(item.cd_nm || "") === raw;
    });
    if (byLabel) {
        return String(byLabel.cd || "");
    }
    return raw;
}

// 중첩 객체에서도 code 계열 키를 찾아 기술코드를 추출한다.
function extractHr013SkillCode(item) {
    if (item == null) {
        return "";
    }
    if (typeof item === "string" || typeof item === "number") {
        return $.trim(String(item));
    }
    var current = item;
    var guard = 0;
    while (current && typeof current === "object" && guard < 6) {
        var candidate = current.code || current.cd || current.value || current.id || current.key;
        if (candidate == null) {
            break;
        }
        if (typeof candidate === "string" || typeof candidate === "number") {
            return $.trim(String(candidate));
        }
        current = candidate;
        guard += 1;
    }
    return "";
}

// 중첩 객체에서도 label 계열 키를 찾아 표시 라벨을 추출한다.
function extractHr013SkillLabel(item, fallbackCode) {
    if (item == null) {
        return getHr013SkillLabelByCode(fallbackCode || "");
    }
    var current = item;
    var guard = 0;
    while (current && typeof current === "object" && guard < 6) {
        var labelCandidate = current.label || current.cd_nm || current.name || current.nm || current.text;
        if (labelCandidate != null) {
            if (typeof labelCandidate === "string" || typeof labelCandidate === "number") {
                return $.trim(String(labelCandidate));
            }
            current = labelCandidate;
            guard += 1;
            continue;
        }
        break;
    }
    return getHr013SkillLabelByCode(fallbackCode || extractHr013SkillCode(item));
}

// 저장/표시 공통 포맷: 어떤 입력이 와도 [{code,label}] 배열로 맞춘다.
function normalizeHr013SkillRows(value, fallback) {
    if (Array.isArray(value)) {
        return value
            .map(function (item) {
                if (typeof item === "string") {
                    var code = $.trim(item);
                    if (!code) {
                        return null;
                    }
                    return {
                        code: code,
                        label: getHr013SkillLabelByCode(code)
                    };
                }
                if (item && typeof item === "object") {
                    var objCode = extractHr013SkillCode(item);
                    if (!objCode) {
                        return null;
                    }
                    return {
                        code: objCode,
                        label: extractHr013SkillLabel(item, objCode)
                    };
                }
                return null;
            })
            .filter(function (item) {
                return !!item;
            });
    }
    var codes = getHr013SkillCodeList(value);
    if (!codes.length && fallback != null && fallback !== "") {
        codes = getHr013SkillCodeList(fallback);
    }
    return codes.map(function (code) {
        return {
            code: code,
            label: getHr013SkillLabelByCode(code)
        };
    });
}

function getHr013SkillArrayFromCsv(csv) {
    return normalizeHr013SkillRows(csv, "");
}

function getHr013SkillCsvForSave(value, fallback) {
    var codes = getHr013SkillCodeList(value);
    if (!codes.length && fallback != null && fallback !== "") {
        codes = getHr013SkillCodeList(fallback);
    }
    return codes.join(",");
}

function getHr013SkillLabelText(value, fallback) {
    if (Array.isArray(value)) {
        return value
            .map(function (item) {
                if (typeof item === "string") {
                    return getHr013SkillLabelByCode(item);
                }
                if (item && typeof item === "object") {
                    var code = extractHr013SkillCode(item);
                    return extractHr013SkillLabel(item, code);
                }
                return "";
            })
            .filter(function (label) {
                return !!label;
            })
            .join(", ");
    }
    var codes = getHr013SkillCodeList(value);
    if (!codes.length && fallback != null && fallback !== "") {
        codes = getHr013SkillCodeList(fallback);
    }
    return codes.map(function (code) {
        return getHr013SkillLabelByCode(code);
    }).join(", ");
}

function hr013EscapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// 프로젝트 데이터 조회 후 테이블 반영
function loadHr013TableData() {
    const dev_id = window.currentDevId || $("#dev_id").val();

    $.ajax({
        url: "/hr013/tab3",
        type: "GET",
        data: { dev_id: dev_id },
        success: function (res) {
            const dataArray = Array.isArray(res.list) ? res.list : [];
            hr013OriginalData = dataArray.map(row => ({ ...row }));
            var normalized = dataArray.map(function (row) {
                if (row.inprj_yn !== "Y") {
                    row._prev_cust_nm = row.cust_nm || "";
                }
                row.role_nm = normalizeJobValue(row.role_nm) || "";
                row.job_cd = normalizeJobValue(row.job_cd) || "";
                row.rate_amt = convertWonToMan(row.rate_amt);
                row.skl_id_lst = normalizeHr013SkillRows(row.skl_id_lst, row.stack_txt);
                row.stack_txt = getHr013SkillCsvForSave(row.skl_id_lst, row.stack_txt);
                row.stack_txt_nm = getSkillLabelList(row.stack_txt);
                return row;
            });

            hr013Data = normalized;

            // 후처리 먼저
            normalizeJobCodes();
            syncStackLabelsFromCodes();

            // 렌더는 한 번만
            refreshHr013View();

            updateHr013TitleCount();
            updateStepperUI();

            $(document).trigger("hr013:dataLoaded", [normalized]);
        },
        error: function () {
            console.log("Tab3 데이터 로드 실패");
            $(document).trigger("hr013:dataLoaded", [[]]);
        }
    });
}

window.loadHr013TableData = loadHr013TableData;

// 선택 행 가져오기
function getHr013SelectedRow() {
    if (!window.hr013Table) return null;
    const rows = window.hr013Table.getRows().filter(row => {
        const data = row.getData();
        return data && data._checked;
    });

    return rows.length ? rows[0].getData() : null;
}

// 모달 입력값 채우기
function fillHr013Form(data) {
    console.log("모달 값 : " + data);
    $("#write_hr013_dev_prj_id").val(data.dev_prj_id || "");
    $("#write_hr013_inprj_yn").val(data.inprj_yn || "N");
    $("#write_hr013_st_dt").val(toDateInput(data.st_dt));
    $("#write_hr013_ed_dt").val(toDateInput(data.ed_dt));
    lastNonInprjCustNm = data.inprj_yn === "Y" ? "" : (data.cust_nm || "");
    applyInprjCustomerName(data.inprj_yn, data.cust_nm);
    syncHr013ProjectLinkUi(data.inprj_yn);
    $("#write_hr013_prj_nm").val(data.prj_nm || "");
    $("#write_hr013_rate_amt").val(formatNumberInput(convertWonToMan(data.rate_amt)));
    $("#write_hr013_job_cd").val(data.job_cd || "");
    $("#write_hr013_alloc_pct").val(formatPercentInput(data.alloc_pct));
    $("#write_hr013_remark").val(data.remark || "");
    pendingStackValue = data.stack_txt || "";
    if (stackTagInput) {
        stackTagInput.setFromValue(pendingStackValue);
    }
    syncHr013SkillPickerUi(true);
}

// 모달 입력값 초기화
function clearHr013Form() {
    $("#write_hr013_dev_prj_id").val("");
    $("#write_hr013_inprj_yn").val("N");
    $("#write_hr013_st_dt").val("");
    $("#write_hr013_ed_dt").val("");
    lastNonInprjCustNm = "";
    applyInprjCustomerName("N", "");
    syncHr013ProjectLinkUi("N");
    $("#write_hr013_prj_nm").val("");
    $("#write_hr013_rate_amt").val("");
    $("#write_hr013_job_cd").val("");
    $("#write_hr013_alloc_pct").val("");
    $("#write_hr013_remark").val("");
    lastNonInprjCustNm = "";
    pendingStackValue = "";
    if (stackTagInput) {
        stackTagInput.clear();
    }
    syncHr013SkillPickerUi(true);
}

// 저장 버튼
function saveHr013Row() {
    var payload = {
        dev_id: window.currentDevId || $("#dev_id").val(),
        dev_prj_id: $("#write_hr013_dev_prj_id").val(),
        inprj_yn: $("#write_hr013_inprj_yn").val(),
        st_dt: normalizeDateForSave($("#write_hr013_st_dt").val()),
        ed_dt: normalizeDateForSave($("#write_hr013_ed_dt").val()),
        cust_nm: $("#write_hr013_cust_nm").val(),
        prj_nm: $("#write_hr013_prj_nm").val(),
        rate_amt: convertManToWon($("#write_hr013_rate_amt").val()),
        job_cd: $("#write_hr013_job_cd").val(),
        stack_txt: $("#write_hr013_stack_txt").val(),
        alloc_pct: $("#write_hr013_alloc_pct").val(),
        remark: $("#write_hr013_remark").val()
    };

    $.ajax({
        url: "/hr013/tab3_save",
        type: "POST",
        data: payload,
        success: function (response) {
            if (response.success) {
                closeHr013Modal();
                loadHr013TableData();
                // alert("저장되었습니다.");
            } else {
                // alert("저장에 실패했습니다.");
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: '저장 중 오류가 발생했습니다.'
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

// 당사 여부에 따라 고객사 자동 입력
function applyInprjCustomerName(inprjYn, custNm) {
    if (inprjYn === "Y") {
        if (inprjYn !== "Y") {
            lastNonInprjCustNm = custNm || "";
        }
        $("#write_hr013_cust_nm").val("HCNC").prop("disabled", true);
        return;
    }
    var nextValue = lastNonInprjCustNm || (custNm && custNm !== "HCNC" ? custNm : "") || "";
    $("#write_hr013_cust_nm").val(nextValue).prop("disabled", false);
}

function syncHr013ProjectLinkUi(inprjYn) {
    var isInternal = isHr013InprjYnY(inprjYn);
    $("#btn_hr013_project_link").prop("disabled", !isInternal);
    $("#hr013ProjectLinkHelp").text(
        isInternal
            ? "당사 프로젝트는 필요할 때만 검색 연결할 수 있습니다."
            : "외부 프로젝트는 프로젝트명을 직접 입력하세요."
    );
}

// 통합 저장 버튼에서 호출
window.saveHr013TableData = function () {
    if (!changedTabs.tab3) {
        console.log("[Tab3] 저장할 프로젝트 데이터 없음 → [Skip]");
        return Promise.resolve();
    }
    return saveHr013InlineRows();
};

// 테이블 내용을 서버에 저장/삭제 반영
function saveHr013InlineRows() {
    if (!changedTabs.tab3) {
        return Promise.resolve();
    }

    let rows = hr013Data;

    // 유효성 검사
    if (!validateHr013Rows(rows)) {
        return Promise.reject("validation failed");
    }

    let devId = window.currentDevId || $("#dev_id").val();
    var requests = [];

    // 저장 요청
    rows.forEach(function (row) {

        // 필수값 없는 행 제외
        if (!row.inprj_yn || !row.st_dt) {
            return;
        }

        const original = hr013OriginalData.find(o => o.dev_prj_id === row.dev_prj_id);
        if (!isHr013RowChanged(row, original)) {
            return;
        }

        var stackCsv = getHr013SkillCsvForSave(row.skl_id_lst, row.stack_txt);
        var rateAmt = convertManToWon(row.rate_amt);
        var custNm = row.cust_nm || "";

        if (row.inprj_yn === "Y") {
            custNm = "HCNC";
        }

        requests.push(
            $.ajax({
                url: "/hr013/tab3_save",
                type: "POST",
                data: {
                    dev_id: devId,
                    dev_prj_id: row.dev_prj_id,
                    inprj_yn: row.inprj_yn,
                    st_dt: normalizeDateForSave(row.st_dt),
                    ed_dt: normalizeDateForSave(row.ed_dt),
                    cust_nm: custNm,
                    prj_nm: row.prj_nm || "",
                    rate_amt: rateAmt || "",
                    job_cd: row.job_cd || "",
                    stack_txt: stackCsv,
                    alloc_pct: row.alloc_pct || "",
                    remark: row.remark || ""
                }
            })
        );
    });

    // 삭제 요청
    hr013DeletedIds.forEach(function (id) {
        requests.push(
            $.ajax({
                url: "/hr013/tab3_delete",
                type: "POST",
                data: { dev_prj_id: id, dev_id: devId }
            })
        );
    });

    // console.log(requests);
    // console.log(requests.length);

    // 전체 요청 실행
    return $.when.apply($, requests)
        .then(function () {
            hr013DeletedIds = [];
            console.log("[Tab3] 저장 완료");
            loadHr013TableData();
        })
        .catch(function (err) {
            console.error("Tab3 저장 실패", err);
            showAlert({
                icon: 'error',
                title: '오류',
                html: `<div><strong>프로젝트</strong>&nbsp;저장 중 오류가 발생했습니다.</div>`
            });
            return Promise.reject(err);
        });
}

// 데이터 변경 여부 판단
function isHr013RowChanged(row, originalRow) {
    if (!originalRow) return true; // 신규 row

    return (
        row.inprj_yn !== originalRow.inprj_yn ||
        row.st_dt !== originalRow.st_dt ||
        row.ed_dt !== originalRow.ed_dt ||
        row.cust_nm !== originalRow.cust_nm ||
        row.prj_nm !== originalRow.prj_nm ||
        row.job_cd !== originalRow.job_cd ||
        String(row.rate_amt) !== String(originalRow.rate_amt) ||
        getHr013SkillCsvForSave(row.skl_id_lst, row.stack_txt) !==
        getHr013SkillCsvForSave(originalRow.skl_id_lst, originalRow.stack_txt) ||
        row.alloc_pct !== originalRow.alloc_pct ||
        row.remark !== originalRow.remark
    );
}

// 저장하기 전, 유효성 검사
function validateHr013Rows(rows) {
    for (let row of rows) {

        if (!row.inprj_yn) return warnAlert("당사여부");
        if (!row.cust_nm && row.inprj_yn !== "Y") return warnAlert("고객사");
        if (!row.prj_nm) return warnAlert("프로젝트명");
        if (!row.job_cd) return warnAlert("역할");
        if (row.rate_amt === "" || row.rate_amt === null) return warnAlert("계약단가");
        const stackCsv = getHr013SkillCsvForSave(row.skl_id_lst, row.stack_txt);
        if (!stackCsv) return warnAlert("기술스택");
        if (!row.st_dt) return warnAlert("시작일");
        if (!row.ed_dt) return warnAlert("종료일");
        if (row.alloc_pct === "" || row.alloc_pct === null) return warnAlert("투입률");
    }
    return true;
}

// 유효성 검사 알림
function warnAlert(label) {
    showAlert({
        icon: 'warning',
        title: '경고',
        html: `<div><strong>${label}</strong>을(를) 입력해주세요.</div>`
    });
    return false;
}

/* ================================================= 임시 추가 ================================================= */
// 행 추가
function addHr013Row() {
    hr013Data.push({
        dev_prj_id: "",
        inprj_yn: "N",
        cust_nm: "",
        prj_nm: "",
        job_cd: "",
        rate_amt: "",
        st_dt: "",
        ed_dt: "",
        alloc_pct: "",
        skl_id_lst: [],
        stack_txt: "",
        remark: ""
    });
    changedTabs.tab3 = true;
    renderHr013Cards();
}
// 행 삭제
function deleteHr013Prj(id) {
    const index = hr013Data.findIndex(row => Number(row.dev_prj_id) === Number(id));
    if (index === -1) return;
    const row = hr013Data[index];
    if (row && row.dev_prj_id) {
        hr013DeletedIds.push(row.dev_prj_id);
    }
    hr013Data.splice(index, 1);
    changedTabs.tab3 = true;

    refreshHr013View();
}
/* ================================================= 임시 추가 ================================================= */

// 상세 모드 여부
function isHr013Editable() {
    const isHr011EditMode = !!document.querySelector(".hr011-page.is-edit-mode");
    if (isHr011EditMode) return true;
    return !window.hr010ReadOnly;
}

// 역할 코드 -> 라벨 맵 생성
function getJobCodeMap() {
    var map = {};
    if (hr013JobOptions && hr013JobOptions.length) {
        hr013JobOptions.forEach(function (item) {
            if (item.cd) {
                map[item.cd] = item.cd_nm || item.cd;
            }
        });
        return map;
    }
    $("#write_hr013_job_cd option").each(function () {
        var val = this.value;
        if (val) {
            map[val] = $(this).text();
        }
    });
    return map;
}

// 역할 표시용 라벨 변환
function jobCodeFormatter(cell) {
    var row = cell.getRow().getData();
    var map = getJobCodeMap();
    var val = normalizeJobValue(cell.getValue()) || "";
    if (val && map[val]) {
        return map[val];
    }
    var roleVal = row ? normalizeJobValue(row.role_nm) : "";
    if (roleVal) {
        return roleVal;
    }
    return map[val] || val || "";
}

// 역할 값이 객체로 와도 문자열로 정규화
function normalizeJobValue(value) {
    if (value == null) {
        return "";
    }
    if (typeof value === "object") {
        var current = value;
        var guard = 0;
        while (current && typeof current === "object" && guard < 4) {
            var candidate = current.cd || current.value || current.label || current.cd_nm || current.name || current.nm || current.id;
            if (candidate && typeof candidate !== "object") {
                return String(candidate);
            }
            if (candidate && typeof candidate === "object") {
                current = candidate;
                guard += 1;
                continue;
            }
            break;
        }
        return "";
    }
    return String(value);
}

// 날짜 표시용 포맷터
function dateDisplayFormatter(cell) {
    return formatDateDisplay(cell.getValue());
}

// YYYY-MM-DD 포맷 변환
function formatDateDisplay(value) {
    if (!value) {
        return "";
    }
    if (typeof value === "number" || /^\d+$/.test(String(value))) {
        var d = new Date(Number(value));
        if (isNaN(d.getTime())) {
            return "";
        }
        return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    }
    return String(value).replaceAll(".", "-");
}

// 저장용 날짜 포맷 정규화
function normalizeDateForSave(value) {
    if (!value) {
        return "";
    }
    if (typeof value === "number" || /^\d+$/.test(String(value))) {
        var d = new Date(Number(value));
        if (isNaN(d.getTime())) {
            return "";
        }
        return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    }
    var raw = String(value).trim();
    if (!raw) {
        return "";
    }
    if (raw.indexOf(" ") !== -1) {
        raw = raw.split(" ")[0];
    }
    raw = raw.replaceAll(".", "-");
    return raw;
}

function hr013TableSkillFormatter(cell) {
    var value = cell.getValue();
    var rowData = cell.getRow() ? cell.getRow().getData() : {};
    var labelText = getHr013SkillLabelText(value, rowData ? rowData.stack_txt : "");
    var textHtml = labelText ? hr013EscapeHtml(labelText) : "-";
    var devPrjIdAttr = hr013EscapeHtml(rowData && rowData.dev_prj_id ? rowData.dev_prj_id : "");
    var prjNmAttr = hr013EscapeHtml(rowData && rowData.prj_nm ? rowData.prj_nm : "");

// 기술스택 표기가 너무 길어져서 별도의 팝업으로 분리
    if (window.hr010ReadOnly) {
        return `<span class="hr013-stack-text hr013-stack-text--readonly">` + textHtml + `</span>`;
    }
    return `<div class="hr013-stack-cell">` +
        `<span class="hr013-stack-text" style="white-space: nowrap; padding-right: 15px;">` + textHtml + `</span>` +
        `<button type="button" class="btn-prj-skl" data-dev-prj-id="${devPrjIdAttr}" data-prj-nm="${prjNmAttr}" onclick="return window.hr013HandleRowAction && window.hr013HandleRowAction(this,'skill');">기술 선택</button>` + `</div>`;
}

function hr013TableSkillCellClick(e, cell) {
    if (!isHr013Editable()) {
        return;
    }
    var target = e && e.target ? e.target : null;
    if (!target || !$(target).closest(".btn-prj-skl").length) {
        return;
    }
    openHr013SkillPicker("grid", cell.getRow());
}

// 콤보 기본 옵션/선택 처리
function initSelectDefault(selectId, placeholderText) {
    var $sel = $("#" + selectId);
    if ($sel.find("option[value='']").length === 0) {
        $sel.prepend("<option value=''>" + placeholderText + "</option>");
    }
    $sel.val("");
    if (!$sel.val()) {
        $sel.find("option:first").prop("selected", true);
    }
}

function getSkillLabelList(value) {
    if (value == null || value === "") {
        return "";
    }
    var codes = String(value).split(",").map(function (code) {
        return $.trim(code);
    }).filter(function (code) {
        return code !== "";
    });
    if (hr013SkillOptions && hr013SkillOptions.length) {
        return codes.map(function (code) {
            var match = hr013SkillOptions.find(function (item) {
                return String(item.cd) === String(code);
            });
            if (match) {
                return match.cd_nm;
            }
            // 업로드/과거데이터처럼 라벨이 들어온 경우에도 표시를 복원한다.
            var labelMatch = hr013SkillOptions.find(function (item) {
                return String(item.cd_nm) === String(code);
            });
            return labelMatch ? labelMatch.cd_nm : code;
        }).join(", ");
    }
    return value;
}

// 코드 -> 라벨 동기화
function syncStackLabelsFromCodes() {
    if (!window.hr013Table) {
        return;
    }
    window.hr013Table.getRows().forEach(function (row) {
        var data = row.getData();
        var codes = getHr013SkillCsvForSave(data.skl_id_lst, data.stack_txt || "");
        var nextLabel = getSkillLabelList(codes);
        if (data.stack_txt !== codes || data.stack_txt_nm !== nextLabel) {
            row.update({
                skl_id_lst: normalizeHr013SkillRows(data.skl_id_lst, codes),
                stack_txt: codes,
                stack_txt_nm: nextLabel
            });
        }
    });
}

// 역할 코드/라벨 정합성 보정(코드 우선)
function normalizeJobCodes() {
    if (!window.hr013Table) {
        return;
    }
    var map = getJobCodeMap();
    var labelToCode = {};
    Object.keys(map).forEach(function (code) {
        labelToCode[map[code]] = code;
    });
    // 코드가 우선이며, 라벨만 있는 값은 코드로 역매핑한다.
    window.hr013Table.getRows().forEach(function (row) {
        var data = row.getData();
        var current = normalizeJobValue(data.job_cd) || "";
        if (current && map[current]) {
            if (!data.role_nm) {
                row.update({ role_nm: map[current] });
            }
            return;
        }
        var label = normalizeJobValue(data.role_nm) || current;
        if (label && labelToCode[label]) {
            row.update({ job_cd: labelToCode[label], role_nm: label });
        }
    });
}

// 투입률
function percentageFormatter(cell) {
    if (cell.getValue() === null || cell.getValue() === undefined || cell.getValue() === "") {
        return "";
    }
    return formatPercentInput(cell.getValue());
}

// 계약단가(,),(테이블표)
function hr013AmountFormatter(cell) {
    var value = cell && typeof cell.getValue === "function" ? cell.getValue() : cell;
    var parsed = parseHr013RateAmountValue(value);
    if (parsed === "" || parsed === null) {
        return `<div class="empty">미입력</div>`;
    }
    return `<div class="amount">${formatNumberInput(parsed)}만원</div>`;
}

// 만원 → 원
function convertManToWon(value) {
    const num = parseHr013RateAmountValue(value);
    if (!num) return "";
    return String(Number(num) * 10000);
}

// 원 → 만원
function convertWonToMan(value) {
    const num = parseHr013RateAmountValue(value);
    if (!num) return "";
    return String(Math.floor(Number(num) / 10000));
}

// 날짜(테이블 표시)
function toDateInput(v) {
    if (!v) return "";
    var d = new Date(Number(v));
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);

}

// 숫자 콤마 포맷(입력값)
function formatNumberInput(value) {
    if (!value) return "";
    // 숫자만 추출
    const onlyNumber = value.toString().replace(/\D/g, "");
    if (!onlyNumber) return "";
    // 숫자 포맷 (콤마)
    return Number(onlyNumber).toLocaleString(); // "원" 제거
}

// 퍼센트 중복 입력 방지
function formatPercentSafe(value) {
    if (!value) return "";

    let raw = String(value).replace(/[^\d]/g, "");
    return raw ? raw + "%" : "";
}

// rate_amt가 숫자/문자열/객체 어떤 형태여도 숫자 문자열로 통일한다.
function parseHr013RateAmountValue(value) {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            return "";
        }
        return String(Math.trunc(value));
    }
    if (typeof value === "string") {
        return normalizeAmountString(value);
    }
    if (typeof value === "object") {
        var keys = ["rate_amt", "amount", "value", "val", "num", "number", "rawValue", "intVal"];
        for (var i = 0; i < keys.length; i += 1) {
            var key = keys[i];
            if (!Object.prototype.hasOwnProperty.call(value, key)) {
                continue;
            }
            var nested = parseHr013RateAmountValue(value[key]);
            if (nested) {
                return nested;
            }
        }
        try {
            var asText = String(value);
            return normalizeAmountString(asText);
        } catch (e) {
            return "";
        }
    }
    return "";
}

// [object Object] 같은 깨진 문자열을 방어하고 숫자만 남긴다.
function normalizeAmountString(text) {
    var raw = String(text || "").trim();
    if (!raw) {
        return "";
    }
    if (raw === "[object Object]") {
        return "";
    }
    var digits = raw.replace(/[^\d]/g, "");
    return digits || "";
}

// 퍼센트 포맷(입력값)
function formatPercentInput(value) {
    if (value === null || value === undefined) return "";
    var raw = String(value).replace(/[^\d]/g, "");
    if (raw === "") return "";
    return raw + "%";
}

function getSkillChipMarkup(row, maxChips) {
    const skills = getHr013SkillLabelText(row.skl_id_lst, row.stack_txt)
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

    const hasMore = skills.length > maxChips;
    const visible = (skills.length ? skills : ["미등록"]).slice(0, maxChips);

    return visible.map(skill => {
        return `<span class="chip">${hr013EscapeHtml(skill)}</span>`;
    }).join("") + (hasMore ? `<span class="chip">...</span>` : "");
}

// 카드뷰 렌더 함수
function renderHr013Cards(list) {
    if (Array.isArray(list)) {
        hr013LastRenderedRows = list.slice();
    }

    hr013Paging.total = hr013LastRenderedRows.length;
    const pagedList = getPagedList(hr013LastRenderedRows);

    $container.empty();

    if (!pagedList.length) {
        $container.html(`
            <div class="no-data-wrap">
                <div class="no-data-box">
                    <div class="no-data-icon">📭</div>
                    <div class="no-data-text">데이터 없음</div>
                </div>
            </div>
        `);
        renderHr013Pager();
        return;
    }

    const html = pagedList.map((row) => {
        const cust = hr013EscapeHtml(row.cust_nm || "-");
        const prj = hr013EscapeHtml(row.prj_nm || "-");
        const job = hr013EscapeHtml(getJobCodeMap()[row.job_cd] || "-");

        const rate = hr013AmountFormatter({ getValue: () => row.rate_amt });
        const period = `<span class="st_dt">${formatDateDisplay(row.st_dt)}</span>~<span class="ed_dt">${formatDateDisplay(row.ed_dt)}</span>`;
        const pct = formatPercentSafe(row.alloc_pct);

        // const skills = hr013EscapeHtml(
        //     getHr013SkillLabelText(row.skl_id_lst || row.stack_txt)
        // );

        const remark = hr013EscapeHtml(row.remark || "* 비고 미입력");

        const isReadOnly = window.hr010ReadOnly && !document.querySelector(".hr011-page.is-edit-mode");
        const isInternal = String(row.inprj_yn).toUpperCase() === "Y";

        return `
            <div class="hr013-card ${isInternal ? "is-hcnc" : ""} ${row._checked ? "selected" : ""}">
                
                <!-- 기존 grid 컬럼 그대로 -->
                <div class="cust">
                    ${!isReadOnly ? `
                        <input type="checkbox" class="card-check" data-id="${row.dev_prj_id}" ${row._checked ? "checked" : ""}>
                    ` : ""}
                    ${cust}
                </div>
                <div class="prj">${prj}</div>
                <div class="skills">
                    ${getSkillChipMarkup(row, 5)}
                </div>
                <div class="period">${period}</div>
                <div class="job">${job}</div>
                <div class="rate">${rate}</div>
                <div class="pct">${pct}</div>
                
                <!-- footer -->
                <div class="card-footer">
                    <div class="remark">${remark}</div>
                    <div class="card-actions">
                        <button class="btn-eval" data-id="${row.dev_prj_id}" ${isInternal && !isReadOnly ? "" : "disabled"}>
                            ${isInternal && !isReadOnly ? "자사 프로젝트 평가" : "타사 프로젝트"}
                        </button>
                    </div>
                </div>
        
            </div>
        `;
    }).join("");

    $container.html(html);
    renderHr013Pager();

    bindHr013CardEvents();
    updateHr013TitleCount();
}

function bindHr013CardEvents() {
    const $container = $("#TABLE_HR013_A");

    // 기존 이벤트 전부 제거
    $container.off(".card");

    // 체크박스 단일 선택
    $container.on("change.card", ".card-check", function () {
        const id = $(this).data("id");
        const isChecked = $(this).is(":checked");
        selectHr013Row(id, isChecked);
    });

    // 카드 전체 클릭 시 체크박스 선택
    $container.on("click.card", ".hr013-card", function (e) {
        if ($(e.target).closest("button, input").length) return;
        const $checkbox = $(this).find(".card-check");
        if (!$checkbox.length) return;
        const id = $checkbox.data("id");
        const isChecked = !$checkbox.is(":checked"); // 토글
        selectHr013Row(id, isChecked);
    });

    // 프로젝트 등록
    $("#hr011QuickAddProjectBtn").off("click.hr013").on("click.hr013", () => openHr013Modal("new"));

    // 프로젝트 수정
    $container.on("click.card", ".hr011-section-edit-btn", function () {
        const id = $(this).data("id");
        const row = hr013Data.find(r => r.dev_prj_id === id);
        if (row) openHr013RowEditor(row);
    });

    // 프로젝트 삭제
    $("#hr011QuickRemoveProjectBtn").off("click.hr013").on("click.hr013", async function () {

        const selected = hr013Data.find(r => r._checked);

        if (!selected) {
            showAlert({ icon: "info", title: "알림", text: "삭제할 프로젝트를 선택해주세요." });
            return;
        }

        const deletedName = selected.prj_nm;

        const result = await showAlert({
            icon: "warning",
            title: "확인",
            html: `<div><strong>${deletedName}</strong>&nbsp;프로젝트를 정말로 삭제하시겠습니까?</div>`,
            showCancelButton: true,
            confirmText: "삭제",
            cancelText: "취소",
            cancelButtonColor: "#212E41"
        });
        if (!(result && (result.isConfirmed || result === true))) return;
        deleteHr013Prj(selected.dev_prj_id);

        showAlert({
            icon: "success",
            title: "완료",
            html: `<div><strong>${deletedName}</strong>가 목록에서 삭제되었습니다.</div>
                   <div><strong>저장하기</strong>&nbsp;버튼을 누르시면 변경사항이 저장됩니다.</div>`,
        });
    });

    // 평가 버튼 클릭하면 발생하는 이벤트
    $container.on("click.card", ".btn-eval", function () {
        const id = $(this).data("id");
        const row = hr013Data.find(r => r.dev_prj_id === id);
        if (!row) return;

        window.currentDevId = row.dev_id;
        window.hr013_prj_nm = row.dev_prj_id;

        // STEP을 4번으로 강제 이동 (스크롤 위치 버그 발생 시, 원상복구할 것)
        // $('.hr011-edit-step [data-step-target="project"]').click();

        reloadTab4(row.dev_prj_id).then(() => {

            requestAnimationFrame(() => {
                const container = document.querySelector(".hr011-edit-flow");
                const target = document.querySelector(".hr014-toolbar-01");

                if (!container || !target) return;

                const top =
                    target.getBoundingClientRect().top -
                    container.getBoundingClientRect().top +
                    container.scrollTop;

                smoothScrollTo(container, top - 20, 400);
            });

        });
    });
}

function selectHr013Row(id, isChecked) {
    hr013Data.forEach(row => row._checked = false);
    if (isChecked) {
        const target = hr013Data.find(row => row.dev_prj_id === id);
        if (target) target._checked = true;
    }
    renderHr013Cards();
}

function refreshHr013View() {
    renderHr013Cards(hr013Data);
}

function renderHr013Pager() {
    const pagerRoot = document.getElementById("HR013_PAGER");
    if (!pagerRoot) return;

    let pager = pagerRoot.querySelector(".hr013-pager");

    const size = hr013Paging.size;
    const totalPage = Math.ceil(hr013Paging.total / size);

    if (totalPage <= 1) {
        if (pager) pager.remove();
        return;
    }

    if (!pager) {
        pager = document.createElement("div");
        pager.className = "hr013-pager";
        pagerRoot.appendChild(pager);
    }

    let html = `
        <button data-page="first" ${hr013Paging.page === 1 ? "disabled" : ""}>«</button>
        <button data-page="prev" ${hr013Paging.page === 1 ? "disabled" : ""}>‹</button>
    `;

    for (let i = 1; i <= totalPage; i++) {
        html += `
            <button class="${i === hr013Paging.page ? "active" : ""}" data-page="${i}">
                ${i}
            </button>
        `;
    }

    html += `
        <button data-page="next" ${hr013Paging.page === totalPage ? "disabled" : ""}>›</button>
        <button data-page="last" ${hr013Paging.page === totalPage ? "disabled" : ""}>»</button>
    `;

    pager.innerHTML = html;

    pager.querySelectorAll("button").forEach(btn => {
        btn.onclick = function () {
            if (this.disabled) return;

            const type = this.dataset.page;

            if (type === "first") hr013Paging.page = 1;
            else if (type === "last") hr013Paging.page = totalPage;
            else if (type === "prev") hr013Paging.page = Math.max(1, hr013Paging.page - 1);
            else if (type === "next") hr013Paging.page = Math.min(totalPage, hr013Paging.page + 1);
            else hr013Paging.page = Number(type);
            hr013Data.forEach(row => row._checked = false); // 페이지 바뀌면 선택된 것 초기화
            renderHr013Cards(hr013LastRenderedRows);
        };
    });
}

function getPagedList(list) {
    const size = hr013Paging.size;
    if (!Array.isArray(list)) {
        return [];
    }
    const start = (hr013Paging.page - 1) * size;
    return list.slice(start, start + size);
}