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

// 프로젝트 공통코드 그룹 상수
const HR013_PROJECT_GRP_CD = "prj_cd";
var HR013_PROJECT_INPRJ_FIELD = "adinfo_01"; // 부가정보1(당사프로젝트)

// 프로젝트 선택 팝업 상태
var hr013ProjectPickerTable = null;     // 팝업 내 목록 테이블 인스턴스
var hr013ProjectPickerContextRow = null; // 어느 행에서 팝업 열었는지 기억
var hr013SelectedProjectCode = null;     // 사용자가 선택한 코드 1건

function isHr013InprjYnY(value) {
    return String(value || "").trim().toUpperCase() === "Y";
}

function isHr013ProjectCodeSelectable(data) {
    return isHr013InprjYnY(data && data.inprj_yn);
}

function isHr013ProjectReadOnly() {
    const isHr011EditMode = !!document.querySelector(".hr011-page.is-edit-mode");
    if (isHr011EditMode) return false;
    return currentMode === "view" || !!window.hr010ReadOnly;
}

// 프로젝트 탭 초기화 (버튼/콤보/태그/테이블)
window.initTab3 = function () {
    if (!window.hr013Table) buildHr013Table();

    if (currentMode === "view")
        window.hr013Table.getColumn("_checked").hide();
    else
        window.hr013Table.getColumn("_checked").show();

    // 프로젝트 제목 옆 건수 표기 초기화
    updateHr013TitleCount();
    loadHr013TableData();

    // 상위 모달의 view/update 상태를 탭3 테이블 readonly 스타일과 동기화한다.
    $(document).off("tab:readonly.hr013").on("tab:readonly.hr013", function (_, isReadOnly) {
        applyTab3Readonly(!!isReadOnly);
    });
    applyTab3Readonly(!!window.hr010ReadOnly);

    $("#write_hr013_rate_amt").on("input", function () {
        $(this).val(formatNumberInput($(this).val()));
    });

    $("#write_hr013_alloc_pct").on("input", function () {
        $(this).val(formatPercentInput($(this).val()));
    });

    $(".btn-hr013-save").off("click").on("click", function () {
        saveHr013Row();
    });

    $(".btn-tab3-new").off("click").on("click", function () {
        openHr013Modal("new");
    });
    $(".btn-tab3-edit").off("click").on("click", function () {
        openHr013Modal("edit");
    });
    $(".btn-tab3-remove").off("click").on("click", function () {
        removeHr013SelectedRows();
    });
    $(".btn-tab3-add").off("click").on("click", function () {
        addHr013Row();
    });

    // Tabulator cellClick이 환경에 따라 누락되는 경우를 대비한 버튼 fallback
    bindHr013CellButtonFallback();

    $("#write_hr013_inprj_yn").off("change").on("change", function () {
        applyInprjCustomerName($(this).val(), $("#write_hr013_cust_nm").val());
    });

    $("#write_hr013_cust_nm").off("input").on("input", function () {
        if ($("#write_hr013_inprj_yn").val() !== "Y") {
            lastNonInprjCustNm = $(this).val();
        }
    });

    // 역할/기술스택 공통코드는 테이블 formatter/editor에서 재사용하므로 캐시해 둔다.
    setComCode("write_hr013_job_cd", "job_cd", "", "cd", "cd_nm", function () {
        hr013JobOptions = $("#write_hr013_job_cd option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();
        initSelectDefault("write_hr013_job_cd", "선택");
        if (window.hr013Table) {
            normalizeJobCodes();
            normalizeJobRows();
            window.hr013Table.redraw(true);
        }

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

        if (window.hr013Table) {
            syncStackLabelsFromCodes();
            window.hr013Table.redraw(true);
        }
    });

    getComCode("skl_grp", "", function (res) {
        hr013SkillGroupOptions = Array.isArray(res) ? res : [];
        syncHr013SkillPickerUi(true);
    });
};

function getHr013RowComponentFromTarget(target) {
    if (!window.hr013Table || !target) return null;
    const rowEl = target.closest ? target.closest(".tabulator-row") : null;
    if (!rowEl) return null;
    const rows = typeof window.hr013Table.getRows === "function" ? window.hr013Table.getRows() : [];
    for (let i = 0; i < rows.length; i += 1) {
        const rowComp = rows[i];
        if (rowComp && typeof rowComp.getElement === "function" && rowComp.getElement() === rowEl) {
            return rowComp;
        }
    }
    return null;
}

function getHr013RowComponentFromButtonMeta(target) {
    if (!window.hr013Table || !target || typeof window.hr013Table.getRows !== "function") return null;
    const btn = target.closest ? target.closest(".btn-prj-skl, .btn-prj-edit, .btn-prj-eval") : null;
    if (!btn) return null;
    const devPrjId = String(btn.getAttribute("data-dev-prj-id") || "").trim();
    const prjNm = String(btn.getAttribute("data-prj-nm") || "").trim();
    const rows = window.hr013Table.getRows() || [];
    for (let i = 0; i < rows.length; i += 1) {
        const rowComp = rows[i];
        if (!rowComp || typeof rowComp.getData !== "function") continue;
        const rowData = rowComp.getData() || {};
        if (devPrjId && String(rowData.dev_prj_id || "").trim() === devPrjId) {
            return rowComp;
        }
        if (!devPrjId && prjNm && String(rowData.prj_nm || "").trim() === prjNm) {
            return rowComp;
        }
    }
    return null;
}

function triggerHr013RowAction(target, action) {
    if (window.hr010ReadOnly && !document.querySelector(".hr011-page.is-edit-mode")) return;
    const rowComp = getHr013RowComponentFromTarget(target) || getHr013RowComponentFromButtonMeta(target);
    if (!rowComp) return;
    const rowData = typeof rowComp.getData === "function" ? rowComp.getData() : {};

    if (action === "skill") {
        openHr013SkillPicker("grid", rowComp);
        return;
    }
    if (action === "edit") {
        openHr013ProjectPicker(rowComp);
        return;
    }
    if (action === "eval") {
        window.currentDevId = rowData.dev_id;
        window.hr013_prj_nm = rowData.dev_prj_id;
        $(".tab-btn").last().click();
        reloadTab4(rowData.dev_prj_id).then(function () {
            $(document).trigger("hr013:focusEvaluation", [rowData.dev_prj_id]);
        });
    }
}

window.hr013HandleRowAction = function (btn, action) {
    triggerHr013RowAction(btn, action);
    return false;
};

function bindHr013CellButtonFallback() {
    $(document).off("click.hr013CellFallback");
    $(document).on("click.hr013CellFallback", "#TABLE_HR013_A .btn-prj-skl, #TABLE_HR013_A .btn-prj-edit, #TABLE_HR013_A .btn-prj-eval", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($(e.target).closest(".btn-prj-skl").length) triggerHr013RowAction(e.target, "skill");
        if ($(e.target).closest(".btn-prj-edit").length) triggerHr013RowAction(e.target, "edit");
        if ($(e.target).closest(".btn-prj-eval").length) triggerHr013RowAction(e.target, "eval");
    });
}

// 프로젝트 제목 옆 건수(span.hcnc-grid-count-number) 업데이트
function updateHr013TitleCount() {
    let count = 0;
    if (window.hr013Table && typeof window.hr013Table.getDataCount === "function") {
        count = window.hr013Table.getDataCount("active");
    } else if (window.hr013Table && typeof window.hr013Table.getData === "function") {
        count = window.hr013Table.getData().length;
    }
    $("#hr013-count .hcnc-grid-count-number").text(count);
}

// 프로젝트 선택 팝업 검색 결과 건수
function updateHr013ProjectPickerCount(count) {
    $("#hr013-project-picker-count .hcnc-grid-count-number").text(count||0);
}

let jobMap = [];

function updateHr013StackRowState(row) {
    if (document.querySelector(".hr011-page")) {
        return;
    }
    if (!row || typeof row.getElement !== "function") {
        return;
    }

    var rowEl = row.getElement();
    if (!rowEl) {
        return;
    }

    var stackText = rowEl.querySelector(".hr013-stack-text");
    if (!stackText) {
        rowEl.classList.remove("stack-multi-line");
        return;
    }

    rowEl.classList.remove("stack-multi-line");

    var computed = window.getComputedStyle ? window.getComputedStyle(stackText) : null;
    var lineHeight = computed ? parseFloat(computed.lineHeight) : NaN;
    if (!lineHeight || !isFinite(lineHeight) || lineHeight <= 0) {
        lineHeight = 18;
    }
    var shouldExpand = stackText.offsetHeight > (lineHeight * 1.25);
    rowEl.classList.toggle("stack-multi-line", shouldExpand);

    if (shouldExpand && typeof row.normalizeHeight === "function") {
        row.normalizeHeight();
    }
}

function scheduleHr013StackRowState(row) {
    if (document.querySelector(".hr011-page")) {
        return;
    }
    if (!row) {
        return;
    }

    var run = function () {
        updateHr013StackRowState(row);
    };

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(run);
        return;
    }

    setTimeout(run, 0);
}

// 프로젝트 테이블 생성
function buildHr013Table() {
    if (!document.getElementById("TABLE_HR013_A")) return;
    var isHr011Detail = !!document.querySelector(".hr011-page");
    var shouldAutoExpandRows = !isHr011Detail;

    var options = {
        layout: isHr011Detail ? "fitColumns" : "fitData",
        placeholder: "데이터 없음",
        selectable: false,
        rowHeight: isHr011Detail ? 46 : 42,
        // 프로젝트 테이블 데이터 로드 시 건수 반영
        dataLoaded: function () {
            updateHr013TitleCount();
        },
        // 프로젝트 테이블 데이터 변경 시 건수 반영
        dataChanged: function () {
            updateHr013TitleCount();
        },
        cellEdited: function () {
            changedTabs.tab3 = true;
        },
        rowFormatter: function (row) {
            if (shouldAutoExpandRows) {
                scheduleHr013StackRowState(row);
            }
        },
        rowUpdated: function (row) {
            if (shouldAutoExpandRows) {
                scheduleHr013StackRowState(row);
            }
        },
        columns: [
            {
                title: "",
                field: "_checked",
                formatter: rowSelectFormatter,
                hozAlign: "center",
                headerSort: false,
                width: 20,
                resizable: false,
                cellClick: function (e, cell) {
                    if (window.hr010ReadOnly) {
                        return;
                    }
                    var resolved = resolveCell(e, cell);
                    if (!resolved) {
                        return;
                    }
                    var row = resolved.getRow();
                    var next = !resolved.getValue();
                    row.update({ _checked: next });
                    syncRowCheckbox(row, next);
                }
            },
            {
                title: "당사여부",
                field: "inprj_yn",
                hozAlign: "center",
                formatter: inprjCheckboxFormatter,
                cellClick: function (e, cell) {
                    if (window.hr010ReadOnly) {
                        return;
                    }
                    var resolved = resolveCell(e, cell);
                    if (!resolved) {
                        return;
                    }
                    toggleInprjValue(resolved);
                    changedTabs.tab3 = true;
                    window.hr013Table.redraw(true);
                }, width: 80, resizable: false
            },
            {
                title: "고객사",
                field: "cust_nm",
                editor: "input",
                formatter: function (cell) {
                    const value = cell.getValue();
                    if (!value) return "";
                    if (window.hr010ReadOnly) {
                        return `<div class="hr013-readonly-text hr013-readonly-text--wrap" title="${hr013EscapeHtml(value)}">${hr013EscapeHtml(value)}</div>`;
                    }
                    return `<div class="hr013-cell-ellipsis" title="${hr013EscapeHtml(value)}">${hr013EscapeHtml(value)}</div>`;
                },
                editable: function (cell) {
                    return isHr013Editable() && cell.getRow().getData().inprj_yn !== "Y";
                },
                cellEdited: function (cell) {
                    var row = cell.getRow();
                    var data = row ? row.getData() : null;
                    if (data && data.inprj_yn !== "Y") {
                        row.update({ _prev_cust_nm: cell.getValue() || "" });
                    }
                },
                cellClick: startEditOnClick, width: 120
            },
            {
                title: "프로젝트명",
                field: "prj_nm",
                editor: "input",
                formatter: function (cell) {
                    const v = cell.getValue() ?? "";
                    const d = cell.getRow().getData();
                    const devPrjIdAttr = hr013EscapeHtml(d.dev_prj_id || "");
                    const prjNmAttr = hr013EscapeHtml(v || d.prj_nm || "");
                    if (window.hr010ReadOnly) {
                        return `<div class="hr013-readonly-text hr013-readonly-text--project" title="${hr013EscapeHtml(v)}">${hr013EscapeHtml(v)}</div>`;
                    }
                    const showBtn = String(d.inprj_yn).toUpperCase() === "Y";
                    const isNew = d._isNew === true;
                    const isReadOnly = isHr013ProjectReadOnly();

                    return `
                      <div class="prj-cell">
                        ${showBtn && !isNew && !isReadOnly ? `<div><button type="button" class="btn-prj-eval" data-dev-prj-id="${devPrjIdAttr}" data-prj-nm="${prjNmAttr}" onclick="return window.hr013HandleRowAction && window.hr013HandleRowAction(this,'eval');">평가</button></div>` : ""}
                        <span class="prj-text" title="${hr013EscapeHtml(v)}">${hr013EscapeHtml(v)}</span>
                        ${showBtn && !isReadOnly ? `<div><button type="button" class="btn-prj-edit" data-dev-prj-id="${devPrjIdAttr}" data-prj-nm="${prjNmAttr}" onclick="return window.hr013HandleRowAction && window.hr013HandleRowAction(this,'edit');">등록</button></div>` : ""}
                      </div>
                    `;
                },
                editable: function (cell) {
                    const rowData = cell.getRow().getData();
                    // "조회"일 경우
                    if (currentMode === "view")
                        return false;
                    // 당사여부 체크된 경우 → 수정 불가
                    if (rowData.inprj_yn === 'Y') {   // 또는 'Y'
                        return false;
                    }
                    return true;
                },
                cellClick: async function (e, cell) {
                    if (!cell) return;
                    // 버튼 클릭이면 평가만
                    const evalBtn = e?.target?.closest(".btn-prj-eval");
                    if (evalBtn) {
                        e.stopPropagation();

                        const rowData = cell.getRow().getData();
                        window.currentDevId = rowData.dev_id;

                        // 이게 있어야 경고 팝업이 안뜬다.
                        window.hr013_prj_nm = rowData.dev_prj_id;

                        $(".tab-btn").last().click();

                        await reloadTab4(rowData.dev_prj_id);
                        $(document).trigger("hr013:focusEvaluation", [rowData.dev_prj_id]);
                        return;
                    }
                    // 등록 버튼 클릭 처리(새 요구사항)
                    const regBtn = e?.target?.closest(".btn-prj-edit");
                    if (regBtn) {
                        e.stopPropagation();
                        openHr013ProjectPicker(cell.getRow()); // 내부에서 로딩 처리함
                        return;
                    }
                },
                cellEditCancelled: function (cell) {
                    requestAnimationFrame(() => cell.getRow().reformat());
                },
                cellEdited: function (cell) {
                    requestAnimationFrame(() => cell.getRow().reformat());
                },
                width: 250
            },
            {
                title: "역할",
                field: "job_cd",
                hozAlign: "center",
                formatter: jobCodeFormatter,
                editor: "select",
                editorParams: (cell) => jobMap,
                editable: isHr013Editable,
                cellEdited: function (cell) {
                    var value = normalizeJobValue(cell.getValue()) || "";
                    if (cell.getValue() !== value) {
                        cell.setValue(value, true);
                    }
                },
                cellClick: startEditOnClick, width: 80
            },
            {
                title: "계약단가",
                field: "rate_amt",
                hozAlign: "right",
                formatter: hr013AmountFormatter,
                editor: "input",
                editable: isHr013Editable,
                cellClick: startEditOnClick,
                width: 150
            },
            {
                title: "기술스택",
                field: "skl_id_lst",
                formatter: hr013TableSkillFormatter,
                editable: false,
                cellClick: hr013TableSkillCellClick
            },
            {
                title: "시작일",
                field: "st_dt",
                hozAlign: "center",
                formatter: dateDisplayFormatter,
                editor: dateEditor,
                editable: isHr013Editable,
                cellClick: startEditOnClick, width: 155
            },
            {
                title: "종료일",
                field: "ed_dt",
                hozAlign: "center",
                formatter: dateDisplayFormatter,
                editor: dateEditor,
                editable: isHr013Editable,
                cellClick: startEditOnClick, width: 155
            },
            { title: "투입률", field: "alloc_pct", hozAlign: "center", formatter: percentageFormatter, width: 66, editor: "input", editable: isHr013Editable, cellClick: startEditOnClick },
            { title: "비고", field: "remark", editor: "input", editable: isHr013Editable, cellClick: startEditOnClick, width: 250},
        ],
        data: []
    };

    if (!isHr011Detail) {
        options.pagination = "local";
        options.paginationSize = 10;
    } else {
        options.pagination = false;
    }

    if (!isHr011Detail) {
        options.height = "100%";
    }

    window.hr013Table = new Tabulator("#TABLE_HR013_A", options);
}

// 상세모드에서는 테이블 조작 비활성화
function applyTab3Readonly(isReadOnly) {
    var locked = !!isReadOnly;
    $(".tab3-content").toggleClass("is-readonly", locked);
    $("#TABLE_HR013_A").toggleClass("is-readonly", locked);
    if (window.hr013Table && typeof window.hr013Table.getColumn === "function") {
        var checkedColumn = window.hr013Table.getColumn("_checked");
        if (checkedColumn && typeof checkedColumn.hide === "function" && typeof checkedColumn.show === "function") {
            if (locked) checkedColumn.hide();
            else checkedColumn.show();
        }
    }
    $(".btn-tab3-add, .btn-tab3-remove, #btnUpload, .btn-tab3-new, .btn-tab3-edit")
        .prop("disabled", locked)
        .toggle(!locked);
    if (locked) {
        closeHr013Modal();
    }
    if (window.hr013Table) {
        window.hr013Table.redraw(true);
    }
}

window.applyTab3Readonly = applyTab3Readonly;

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
        rowClick: function (e, row) {
            var data = row && typeof row.getData === "function" ? row.getData() : null;
            if (!isHr013ProjectCodeSelectable(data)) {
                showAlert({
                    icon: "info",
                    title: "알림",
                    html: `<strong>당사 프로젝트</strong>만 선택할 수 있습니다.`
                });
                return;
            }
            row.select();
            hr013SelectedProjectCode = data;   // 사용자가 고른 코드 저장
        },
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
    if (rowData && !isHr013InprjYnY(rowData.inprj_yn)) {
        showAlert({
            icon: "info",
            title: "알림",
            html: `<strong>당사 프로젝트</strong>만 선택할 수 있습니다.`
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

    if (!hr013ProjectPickerContextRow || !hr013SelectedProjectCode) {
        showAlert({
            icon: "info", title: "알림", text: "프로젝트를 선택해주세요."
        })
        return;
    }
    if (!isHr013ProjectCodeSelectable(hr013SelectedProjectCode)) {
        showAlert({
            icon: "info", title: "알림", html: `<strong>당사 프로젝트</strong>만 선택할 수 있습니다.`
        });
        return;
    }
    const selectedName = String(hr013SelectedProjectCode.cd_nm || "").trim();
    if (!selectedName) {
        showAlert({ icon: "warning", title: "경고", text: "선택된 프로젝트명이 비어 있습니다." });
        return;
    }

    // 실제 저장 컬럼은 기존 설계대로 prj_nm(프로젝트명)만 우선 반영한다.
    hr013ProjectPickerContextRow.update({
        prj_nm: selectedName
    });

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
        html: `<strong>cdNm</strong>&nbsp;프로젝트를 등록하시겠습니까?`,
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

function applyHr013SkillPickerSelection() {
    if (!hr013SkillPicker) {
        closeHr013SkillPicker();
        return;
    }
    hr013SkillPicker.apply();
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
    if (!window.hr013Table) return;

    $.ajax({
        url: "/hr013/tab3",
        type: "GET",
        data: { dev_id: dev_id },
        success: function (res) {
            const dataArray = Array.isArray(res.list) ? res.list : [];
            var normalized = dataArray.map(function (row) {
                row._checked = false;
                if (row.inprj_yn !== "Y") {
                    row._prev_cust_nm = row.cust_nm || "";
                }
                row.role_nm = normalizeJobValue(row.role_nm) || "";
                row.job_cd = normalizeJobValue(row.job_cd) || "";
                row.rate_amt = parseHr013RateAmountValue(row.rate_amt);
                row.skl_id_lst = normalizeHr013SkillRows(row.skl_id_lst, row.stack_txt);
                row.stack_txt = getHr013SkillCsvForSave(row.skl_id_lst, row.stack_txt);
                row.stack_txt_nm = getSkillLabelList(row.stack_txt);
                return row;
            });
            window.hr013Table.setData(normalized);
            // 조회 직후 제목 건수 즉시 갱신
            updateHr013TitleCount();
            normalizeJobCodes();
            syncStackLabelsFromCodes();
            window.hr013Table.redraw();
        },
        error: function () { console.log("Tab3 데이터 로드 실패"); }
    });
}

// 선택 행 가져오기
function getHr013SelectedRow() {
    if (!window.hr013Table) {
        return null;
    }
    var rows = window.hr013Table.getSelectedRows();
    if (!rows || rows.length === 0) {
        return null;
    }
    return rows[0].getData();
}

// 모달 입력값 채우기
function fillHr013Form(data) {

    console.log("st_dt : " + data.st_dt, "ed_dt : " + data.ed_dt);
    $("#write_hr013_dev_prj_id").val(data.dev_prj_id || "");
    $("#write_hr013_inprj_yn").val(data.inprj_yn || "N");
    $("#write_hr013_st_dt").val(toDateInput(data.st_dt));
    $("#write_hr013_ed_dt").val(toDateInput(data.ed_dt));
    lastNonInprjCustNm = data.inprj_yn === "Y" ? "" : (data.cust_nm || "");
    applyInprjCustomerName(data.inprj_yn, data.cust_nm);
    $("#write_hr013_prj_nm").val(data.prj_nm || "");
    $("#write_hr013_rate_amt").val(formatNumberInput(parseHr013RateAmountValue(data.rate_amt)));
    $("#write_hr013_job_cd").val(data.job_cd || "");
    $("#write_hr013_alloc_pct").val(formatPercentInput(data.alloc_pct));
    $("#write_hr013_remark").val(data.remark || "");
    pendingStackValue = data.stack_txt || "";
    if (stackTagInput) {
        stackTagInput.setFromValue(pendingStackValue);
    }
    syncHr013SkillPickerUi(true);


    // console.log("input value : " + $("#write_hr013_st_dt").val());
}

// 모달 입력값 초기화
function clearHr013Form() {
    $("#write_hr013_dev_prj_id").val("");
    $("#write_hr013_inprj_yn").val("N");
    $("#write_hr013_st_dt").val("");
    $("#write_hr013_ed_dt").val("");
    lastNonInprjCustNm = "";
    applyInprjCustomerName("N", "");
    $("#write_hr013_prj_nm").val("");
    $("#write_hr013_rate_amt").val("");
    $("#write_hr013_job_cd").val("");
    $("#write_hr013_alloc_pct").val("");
    $("#write_hr013_remark").val("");
    pendingStackValue = "";
    if (stackTagInput) {
        stackTagInput.clear();
    }
    syncHr013SkillPickerUi(true);
}

// 저장 버튼
// 모달 저장 (구버전 유지)
function saveHr013Row() {
    var payload = {
        dev_id: window.currentDevId || $("#dev_id").val(),
        dev_prj_id: $("#write_hr013_dev_prj_id").val(),
        inprj_yn: $("#write_hr013_inprj_yn").val(),
        st_dt: normalizeDateForSave($("#write_hr013_st_dt").val()),
        ed_dt: normalizeDateForSave($("#write_hr013_ed_dt").val()),
        cust_nm: $("#write_hr013_cust_nm").val(),
        prj_nm: $("#write_hr013_prj_nm").val(),
        rate_amt: $("#write_hr013_rate_amt").val(),
        job_cd: $("#write_hr013_job_cd").val(),
        stack_txt: $("#write_hr013_stack_txt").val(),
        alloc_pct: $("#write_hr013_alloc_pct").val(),
        remark: $("#write_hr013_remark").val()
    };

    if (payload.inprj_yn === "Y") {
        payload.cust_nm = "HCNC";
        $("#write_hr013_cust_nm").val(payload.cust_nm);
    }

    if (!payload.inprj_yn) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>당사여부</strong>을(를) 선택해주세요.`
        });
        return;
    }
    if (!payload.st_dt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>시작일</strong>을(를) 입력해주세요.`
        });
        return;
    }
    if (!payload.ed_dt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>종료일</strong>을(를) 입력해주세요.`
        });
        return;
    }
    if (!payload.cust_nm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>고객사</strong>을(를) 입력해주세요.`
        });
        return;
    }
    if (!payload.prj_nm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>프로젝트명</strong>을(를) 입력해주세요.`
        });
        return;
    }
    if (!payload.rate_amt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>계약단가</strong>을(를) 입력해주세요.`
        });
        return;
    }
    if (!payload.job_cd) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>역할</strong>을(를) 선택해주세요.`
        });
        return;
    }
    if (!payload.alloc_pct) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>투입률</strong>을(를) 입력해주세요.`
        });
        return;
    }
    if (!payload.stack_txt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>기술스택</strong>을(를) 선택해주세요.`
        });
        return;
    }

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
        if (custNm && custNm !== "HCNC") {
            lastNonInprjCustNm = custNm;
        }
        $("#write_hr013_cust_nm").val("HCNC").prop("disabled", true);
        return;
    }
    var nextValue = lastNonInprjCustNm || (custNm && custNm !== "HCNC" ? custNm : "") || "";
    $("#write_hr013_cust_nm").val(nextValue).prop("disabled", false);
}

// 삭제 버튼
function inprjCheckboxFormatter(cell) {
    if (isHr013ProjectReadOnly()) {
        return cell.getValue() === "Y" ? "Y" : "N";
    }
    var checked = cell.getValue() === "Y" ? " checked" : "";
    var disabled = window.hr010ReadOnly ? " disabled" : "";
    return "<input type='checkbox' style='pointer-events:none;'" + checked + disabled + " />";
}

// 선택 행 임시 삭제
// 체크된 행을 임시 삭제(실제 삭제는 저장 시)
async function removeHr013SelectedRows() {
    if (!window.hr013Table) {
        return;
    }
    var rows = window.hr013Table.getRows().filter(function (row) {
        return row.getData()._checked;
    });
    if (!rows || rows.length === 0) {
        // alert("삭제할 행을 선택해주세요.");
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'info',
            title: '알림',
            text: '삭제할 행을 선택해주세요.'
        });
        return;
    }

    const result = await showAlert({
        icon: 'warning',
        title: '경고',
        text: '선택한 행을 정말로 삭제하시겠습니까?',
        showCancelButton: true,
        cancelButtonText: '취소',
        cancelButtonColor: '#212E41'
    });

    if (!result.isConfirmed) return;

    rows.forEach(function (row) {
        var data = row.getData();
        if (data.dev_prj_id) {
            hr013DeletedIds.push(data.dev_prj_id);
        }
        row.delete();
    });

    changedTabs.tab3 = true;
    // 행 삭제 후 제목 건수 갱신
    updateHr013TitleCount();
}

// 프로젝트 탭 통합 저장용
// 통합 저장 버튼에서 호출
window.saveHr013TableData = function () {
    saveHr013InlineRows();
};

// 테이블 내용을 서버에 저장/삭제 반영
function saveHr013InlineRows() {
    if (!window.hr013Table) {
        return;
    }
    var devId = window.currentDevId || $("#dev_id").val();
    var rows = window.hr013Table.getData();

    // 수정 행 저장 + 삭제 큐(hr013DeletedIds) 반영을 하나의 비동기 묶음으로 처리한다.
    var requests = [];

    rows.forEach(function (row) {
        // 필수 키가 비어 있는 임시 행은 저장 요청에서 제외한다.
        if (!row.inprj_yn || !row.st_dt) {
            return;
        }
        var stackCsv = getHr013SkillCsvForSave(row.skl_id_lst, row.stack_txt);
        var rateAmt = parseHr013RateAmountValue(row.rate_amt);
        var custNm = row.cust_nm || "";
        if (row.inprj_yn === "Y") {
            custNm = "HCNC";
        }

        requests.push($.ajax({
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
        }));
    });

    hr013DeletedIds.forEach(function (id) {
        requests.push($.ajax({
            url: "/hr013/tab3_delete",
            type: "POST",
            data: { dev_prj_id: id, dev_id: devId }
        }));
    });

    if (requests.length === 0) {
        return;
    }

    $.when.apply($, requests).done(function () {
        hr013DeletedIds = [];
        loadHr013TableData();
    }).fail(function () {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'error',
            title: '오류',
            text: `"프로젝트" 저장 중 오류가 발생했습니다.`
        });
    });
}

// 행 추가
function addHr013Row() {
    if (!window.hr013Table) {
        return;
    }
    window.hr013Table.addRow({
        dev_prj_id: "",
        dev_id: window.currentDevId || $("#dev_id").val(),
        _checked: false,
        inprj_yn: "N",
        st_dt: "",
        ed_dt: "",
        cust_nm: "",
        _prev_cust_nm: "",
        prj_nm: "",
        rate_amt: "",
        job_cd: "",
        skl_id_lst: [],
        stack_txt: "",
        alloc_pct: "",
        remark: "",
        _isNew: true
    }, true);

    changedTabs.tab3 = true;
    // 행 추가 후 제목 건수 갱신
    updateHr013TitleCount();
}

function toggleInprjValue(cell) {
    var row = cell.getRow();
    var data = row.getData();
    var next = data.inprj_yn === "Y" ? "N" : "Y";
    if (next === "Y") {
        // 당사(Y) 전환 시 기존 고객사명은 _prev_cust_nm에 백업한다.
        var keep = data._prev_cust_nm || "";
        if (data.cust_nm && data.cust_nm !== "HCNC") {
            keep = data.cust_nm;
        }
        row.update({ inprj_yn: "Y", cust_nm: "HCNC", _prev_cust_nm: keep });
        return;
    }
    var restored = data._prev_cust_nm || "";
    row.update({ inprj_yn: "N", cust_nm: restored });
}

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

function rowSelectFormatter(cell) {
    if (window.hr010ReadOnly) {
        return "";
    }
    var checked = cell.getValue() ? " checked" : "";
    return "<input type='checkbox' class='row-check'" + checked + " />";
}

// 체크박스 UI 동기화
function syncRowCheckbox(row, checked) {
    var el = row.getElement();
    if (!el) {
        return;
    }
    var checkbox = el.querySelector(".row-check");
    if (checkbox) {
        checkbox.checked = !!checked;
    }
}

// 셀 클릭 시 편집 시작
function startEditOnClick(e, cell) {
    if (!isHr013Editable()) {
        return;
    }
    var resolved = resolveCell(e, cell);
    if (resolved && typeof resolved.edit === "function") {
        resolved.edit();
    }
}

// 이벤트/셀 객체 타입 분기
function resolveCell(e, cell) {
    // Tabulator 콜백마다 인자 순서가 달라 cell/e 어느 쪽이 셀 객체인지 흡수한다.
    if (cell && typeof cell.getRow === "function") {
        return cell;
    }
    if (e && typeof e.getRow === "function") {
        return e;
    }
    return null;
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

// 날짜 입력 에디터
function dateEditor(cell, onRendered, success, cancel) {
    var input = document.createElement("input");
    input.type = "date";
    input.style.width = "100%";
    input.value = normalizeDateForSave(cell.getValue());

    onRendered(function () {
        input.focus();
        input.select();
    });

    input.addEventListener("blur", function () {
        success(input.value);
    });

    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            success(input.value);
        }
        if (e.key === "Escape") {
            cancel();
        }
    });

    return input;
}

// 기술스택 태그 입력 에디터
function stackTagEditor(cell, onRendered, success, cancel) {
    var uid = "hr013_tag_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    var wrap = document.createElement("div");
    wrap.className = "tag-input";
    wrap.style.width = "100%";
    var rowObj = cell && typeof cell.getRow === "function" ? cell.getRow() : null;
    var rowEl = rowObj ? rowObj.getElement() : null;
    var tagInput = null;
    var closed = false;
    var docListenerBound = false;
    var docMouseDownHandler = null;

    // 에디터 종료 시 hidden(csv) 값을 셀 값/표시 라벨에 함께 반영한다.
    function closeEditor() {
        if (closed) {
            return;
        }
        closed = true;
        if (tagInput && input && input.value) {
            tagInput.addByLabel(input.value);
            input.value = "";
        }
        var hiddenEl = document.getElementById(uid + "_hidden");
        var value = hiddenEl ? hiddenEl.value : "";
        var row = cell && typeof cell.getRow === "function" ? cell.getRow() : null;
        if (row) {
            row.update({
                stack_txt: value,
                stack_txt_nm: getSkillLabelList(value)
            });
        }
        setEditingState(false);
        success(value);
        if (rowObj && typeof rowObj.normalizeHeight === "function") {
            rowObj.normalizeHeight();
        }
        if (docListenerBound && docMouseDownHandler) {
            document.removeEventListener("mousedown", docMouseDownHandler, true);
            docListenerBound = false;
            docMouseDownHandler = null;
        }
    }

    function setEditingState(isEditing) {
        if (!rowEl) {
            return;
        }
        if (isEditing) {
            rowEl.classList.add("stack-editing");
        } else {
            rowEl.classList.remove("stack-editing");
        }
    }

    var box = document.createElement("div");
    box.className = "tag-input-box";

    var help = document.createElement("div");
    help.className = "tag-help";
    box.appendChild(help);

    var list = document.createElement("ul");
    list.className = "tag-list";
    list.id = uid + "_list";
    box.appendChild(list);

    var input = document.createElement("input");
    input.type = "text";
    input.className = "text tag-input-field";
    input.id = uid + "_input";
    input.setAttribute("list", uid + "_datalist");
    input.placeholder = "입력 후 Enter";
    box.appendChild(input);

    var row = document.createElement("div");
    row.className = "tag-select-row";

    var datalist = document.createElement("datalist");
    datalist.id = uid + "_datalist";
    row.appendChild(datalist);

    var hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.id = uid + "_hidden";
    row.appendChild(hidden);

    wrap.appendChild(box);
    wrap.appendChild(row);

    onRendered(function () {
        setEditingState(true);
        if (rowObj && typeof rowObj.normalizeHeight === "function") {
            rowObj.normalizeHeight();
        }
        tagInput = createTagInput({
            inputSelector: "#" + uid + "_input",
            listSelector: "#" + uid + "_list",
            hiddenSelector: "#" + uid + "_hidden",
            datalistSelector: "#" + uid + "_datalist",
            getValue: function (item) { return item.cd; },
            getLabel: function (item) { return item.cd_nm; },
            matchMode: "prefix"
        });
        tagInput.setOptions(hr013SkillOptions || []);
        tagInput.setFromValue(cell.getValue() || "");

        function commitByInput(rawValue) {
            var raw = (rawValue || "").replace(",", "");
            if (raw) {
                tagInput.addByLabel(raw);
            }
            input.value = "";
        }

        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                e.stopPropagation();
                commitByInput(input.value);
                // 엔터/콤마 입력은 즉시 커밋 후 편집 종료한다.
                closeEditor();
            }
            if (e.key === "Escape") {
                setEditingState(false);
                if (rowObj && typeof rowObj.normalizeHeight === "function") {
                    rowObj.normalizeHeight();
                }
                cancel();
            }
        });
        input.focus();
    });

    return wrap;
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

// 테이블 표시용 기술스택 변환
function skillDisplayFormatter(cell) {
    var row = cell.getRow().getData();
    if (row && row.stack_txt_nm != null && row.stack_txt_nm !== "") {
        return `
            <div class="tag-input-box">
                <ul class="tag-list">
                    ${row.stack_txt_nm.split(",").map(t => `<li class="tag-item"><span class="tag-text">${t.trim()}</span></li>`).join("")}
                </ul>
            </div>`;
    }
    return null;
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

// 역할 코드/라벨 정합성 보정
function normalizeJobRows() {
    if (!window.hr013Table) {
        return;
    }
    var map = getJobCodeMap();
    var labelToCode = {};
    Object.keys(map).forEach(function (code) {
        labelToCode[map[code]] = code;
    });
    // 서버 데이터(role_nm/job_cd)가 섞여 와도 화면 편집 시 코드/라벨을 맞춰 둔다.
    window.hr013Table.getRows().forEach(function (row) {
        var data = row.getData();
        var code = normalizeJobValue(data.job_cd) || "";
        var label = normalizeJobValue(data.role_nm) || "";
        if (code && map[code]) {
            if (!label) {
                row.update({ role_nm: map[code] });
            }
            return;
        }
        if (label && labelToCode[label]) {
            row.update({ job_cd: labelToCode[label], role_nm: label });
        }
    });
}

function normalizeTagValue(value) {
    if (value == null) {
        return "";
    }
    if (typeof value === "object") {
        return "";
    }
    // 태그 CSV 정리(공백/빈값 제거)
    return String(value).split(",").map(function (code) {
        return $.trim(code);
    }).filter(function (code) {
        return code !== "";
    }).join(",");
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
    if (!parsed) {
        return "-";
    }
    return formatNumberInput(parsed);

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
    const formatted = Number(onlyNumber).toLocaleString();
    return formatted + "원";
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

function editRisk(rowData) {
    window.hr013_prj_nm = rowData.dev_prj_id;

    // A: 테이블 데이터
    var eval = evalData.get(window.hr013_prj_nm);
    const pA = (eval === null || eval === undefined)
        ? loadHr014TableDataA()
        : Promise.resolve(window.hr014TableA.setData(eval));

    // B: 위험정보 상태
    var risk = riskData.get(window.hr013_prj_nm);
    const pB = (risk === null || risk === undefined)
        ? loadHr014TableDataB()
        : Promise.resolve((function () {
            riskState.leave_txt = risk.leave_txt || "";
            riskState.claim_txt = risk.claim_txt || "";
            riskState.sec_txt = risk.sec_txt || "";
            riskState.re_in_yn = risk.re_in_yn || "N";
            riskState.memo = risk.memo || "";
            $("#HR015_REIN_CHECK").prop("checked", riskState.re_in_yn === "Y");
            setRiskActive(riskActiveKey);
        })());

    return Promise.all([pA, pB]).then(() => {
        // 탭이 숨겨져 있다가 열리는 구조면 redraw가 필요할 수 있어 안전장치
        if (window.hr014TableA) window.hr014TableA.redraw(true);
        if (window.hr014TableB) window.hr014TableB.redraw(true);
    });
}

$('#btnUpload').on('click', function () {
    $('#excelFile').click();
});

$('#excelFile').on('change', function (e) {
    const file = e.target.files[0];
    e.target.value = '';

    if (!file) return showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
        icon: 'info',
        title: '알림',
        text: '파일을 선택하세요.'
    });

    else console.log('파일 선택 완료:', file.name);

    const formData = new FormData();
    formData.append("file", file);

    $.ajax({
        url: "/api/excel/upload.do",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (result) {
            let data = window.hr013Table.getData();

            // 엑셀 업로드 값은 공통코드 기준(cd_nm -> cd)으로 정규화 후 테이블에 append한다.
            result.data.forEach(function (item) {
                if (item.inprj_yn?.toUpperCase() !== 'Y') {
                    item.inprj_yn = 'N';
                }

                item.st_dt = item.st_dt ? item.st_dt.slice(0, 10) : "";
                item.ed_dt = item.ed_dt ? item.ed_dt.slice(0, 10) : "";

                // 입력된 job_cd가 실제로 공통코드에 있는 정보인지 확인
                var jobcdYn = false;
                hr013JobOptions.forEach(function (d) {
                    if (item.job_cd.toUpperCase() === d.cd_nm.toUpperCase()) {
                        item.job_cd = d.cd;
                        if (!jobcdYn) jobcdYn = true;
                    }
                });
                // 존재하지 않는 job_cd일 경우 공백처리
                if (!jobcdYn)
                    item.job_cd = null;

                var skl_lst = [];
                item.skl_id_lst?.split(',').map(x => x.trim()).forEach(function (skl_id) {
                    hr013SkillOptions.forEach(function (d) {
                        if (skl_id.toUpperCase() === d.cd_nm.toUpperCase()) {
                            skl_lst.push({ code: d.cd, label: d.cd_nm });
                        }
                    });
                });
                item.skl_id_lst = skl_lst;

                data.push(item);
            })

            window.hr013Table.setData(data);
            changedTabs.tab3 = true;
            // 엑셀 업로드 반영 후 제목 건수 갱신
            updateHr013TitleCount();
        },
        error: function (xhr) {
            // 서버 에러도 모달로 표시
            const msg = xhr.responseText || ("HTTP " + xhr.status);
            // openModal(msg);
        }
    });
});

// 보유역량 기술 테이블 정렬 순서
function getPriority(text) {
    if (/^[a-zA-Z]/.test(text)) return 1;   // 영문 (1번째)
    if (/^[0-9]/.test(text)) return 2;      // 숫자 (2번째)
    if (/^[ㄱ-ㅎ가-힣]/.test(text)) return 3; // 한글 (3번째)
    return 4;                               // 기타 (4번째)
}
