// hr013.js
// 탭3 편집 상태/참조 데이터 캐시
var stackTagInput = null;
var pendingStackValue = "";
var lastNonInprjCustNm = "";
var hr013DeletedIds = [];
var hr013SkillOptions = [];
var hr013JobOptions = [];
var hr013SkillGroupOptions = [];
var hr013SkillPickerTable = null;
var hr013SkillPickerTableReady = false;
var hr013SkillPickerDraftSet = null;
var hr013SkillSuggestActiveIndex = -1;
var hr013SkillPickerEventBound = false;
var hr013SkillPickerContext = null;

// 프로젝트 탭 초기화 (버튼/콤보/태그/테이블)
window.initTab3 = function () {
    if (!window.hr013Table) buildHr013Table();
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

let jobMap = [];

// 프로젝트 테이블 생성
function buildHr013Table() {
    if (!document.getElementById("TABLE_HR013_A")) return;

    window.hr013Table = new Tabulator("#TABLE_HR013_A", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        selectable: false,
        cellEdited: function () {
           changedTabs.tab3 = true;
        },
        columns: [
            {
                title: "선택",
                field: "_checked",
                formatter: rowSelectFormatter,
                hozAlign: "center",
                headerSort: false,
                width: 50,
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
            { title: "프로젝트명", field: "prj_nm", editor: "input", editable: isHr013Editable, cellClick: startEditOnClick, width: 250 },
            {
                title: "시작일",
                field: "st_dt",
                hozAlign: "center",
                formatter: dateDisplayFormatter,
                editor: dateEditor,
                editable: isHr013Editable,
                cellClick: startEditOnClick, width: 140
            },
            {
                title: "종료일",
                field: "ed_dt",
                hozAlign: "center",
                formatter: dateDisplayFormatter,
                editor: dateEditor,
                editable: isHr013Editable,
                cellClick: startEditOnClick, width: 140
            },
            {
                title: "당사 여부",
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
                }, width: 90
            },
            {
                title: "고객사",
                field: "cust_nm",
                editor: "input",
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
                cellClick: startEditOnClick, width: 110
            },
            { title: "계약단가", field: "rate_amt", hozAlign: "right", formatter: hr013AmountFormatter, editor: "input", editable: isHr013Editable, cellClick: startEditOnClick , width: 110},
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
                cellClick: startEditOnClick, width: 90
            },
            {
                title: "기술스택",
                field: "skl_id_lst",
                hozAlign: "left",
                formatter: hr013TableSkillFormatter,
                editable: false,
                cellClick: hr013TableSkillCellClick
            },
            // { title: "기술스택", field: "stack_txt", formatter: skillDisplayFormatter, editor: stackTagEditor, editable: isHr013Editable, cellClick: startEditOnClick },
            { title: "투입률", field: "alloc_pct", hozAlign: "center", formatter: percentageFormatter, width: 90, editor: "input", editable: isHr013Editable, cellClick: startEditOnClick },
            { title: "비고", field: "remark", editor: "input", editable: isHr013Editable, cellClick: startEditOnClick , width: 200}
        ],
        data: []
    });
}

// 상세모드에서는 테이블 조작 비활성화
function applyTab3Readonly(isReadOnly) {
    $("#TABLE_HR013_A").toggleClass("is-readonly", !!isReadOnly);
    if (window.hr013Table) {
        window.hr013Table.redraw(true);
    }
}

window.applyTab3Readonly = applyTab3Readonly;

// 프로젝트 이력 모달 열기
function openHr013Modal(mode) {
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

function bindHr013SkillPickerEvents() {
    if (hr013SkillPickerEventBound) {
        return;
    }
    hr013SkillPickerEventBound = true;

    $(document).on("click", "#btn_hr013_skill_picker", function (e) {
        e.preventDefault();
        if (currentMode === "view" || window.hr010ReadOnly) {
            return;
        }
        openHr013SkillPicker("modal");
    });

    $(document).on("click", "#btn_hr013_skill_picker_apply", function (e) {
        e.preventDefault();
        applyHr013SkillPickerSelection();
    });

    $(document).on("click", "#btn_hr013_skill_picker_close_x", function (e) {
        e.preventDefault();
        closeHr013SkillPicker();
    });

    $(document).on("click", "#hr013-skill-picker-area", function (e) {
        if (e.target === this) {
            closeHr013SkillPicker();
        }
    });

    $(document).on("click", "#TABLE_HR013_SKILL_PICKER .hr013-skill-chip", function (e) {
        e.preventDefault();
        var code = String($(this).data("code") || "");
        if (!code) {
            return;
        }
        toggleHr013Skill(code);
    });

    $(document).on("input", "#hr013-skill-picker-search", function () {
        renderHr013SkillSuggestions($(this).val());
    });

    $(document).on("keydown", "#hr013-skill-picker-search", function (e) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            moveHr013SuggestionSelection(1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            moveHr013SuggestionSelection(-1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            var $active = getHr013ActiveSuggestItem();
            if ($active.length) {
                selectHr013Skill(String($active.data("code") || ""), true);
                return;
            }
            var $first = $("#hr013-skill-picker-suggest .hr013-skill-suggest-item").first();
            if ($first.length) {
                selectHr013Skill(String($first.data("code") || ""), true);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeHr013SkillPicker();
        }
    });

    $(document).on("click", "#hr013-skill-picker-suggest .hr013-skill-suggest-item", function (e) {
        e.preventDefault();
        var code = String($(this).data("code") || "");
        if (!code) {
            return;
        }
        selectHr013Skill(code, true);
    });

    $(document).on("mouseenter", "#hr013-skill-picker-suggest .hr013-skill-suggest-item", function () {
        var $items = $("#hr013-skill-picker-suggest .hr013-skill-suggest-item");
        hr013SkillSuggestActiveIndex = $items.index(this);
        syncHr013SuggestionActive();
    });

    $(document).on("mousedown", function (e) {
        if (!$(e.target).closest(".hr013-skill-picker-search-wrap").length) {
            $("#hr013-skill-picker-suggest").hide();
        }
    });
}

function openHr013SkillPicker(sourceType, row) {
    if (currentMode === "view" || window.hr010ReadOnly) {
        return;
    }
    var contextType = sourceType === "grid" ? "grid" : "modal";
    if (contextType === "grid" && (!row || typeof row.getData !== "function")) {
        return;
    }
    hr013SkillPickerContext = {
        type: contextType,
        row: contextType === "grid" ? row : null
    };

    buildHr013SkillPickerTable();
    hr013SkillPickerDraftSet = contextType === "grid"
        ? getHr013RowSelectedCodeSet(row)
        : getHr013SelectedCodeSet();
    syncHr013SkillPickerUi(true);

    var $picker = $("#hr013-skill-picker-area");
    $picker.show();
    setTimeout(function () {
        $picker.addClass("show");
    }, 0);

    $("#hr013-skill-picker-search").val("");
    renderHr013SkillSuggestions("");
    setTimeout(function () {
        $("#hr013-skill-picker-search").trigger("focus");
    }, 40);
}

function closeHr013SkillPicker(immediate) {
    var $picker = $("#hr013-skill-picker-area");
    if (!$picker.length) {
        hr013SkillPickerDraftSet = null;
        hr013SkillPickerContext = null;
        return;
    }
    $picker.removeClass("show");
    $("#hr013-skill-picker-suggest").hide().empty();
    hr013SkillSuggestActiveIndex = -1;
    if (immediate) {
        hr013SkillPickerDraftSet = null;
        hr013SkillPickerContext = null;
        $picker.hide();
        return;
    }
    setTimeout(function () {
        if (!$picker.hasClass("show")) {
            $picker.hide();
        }
    }, 180);
    hr013SkillPickerDraftSet = null;
    hr013SkillPickerContext = null;
}

function applyHr013SkillPickerSelection() {
    if (!(hr013SkillPickerDraftSet instanceof Set)) {
        closeHr013SkillPicker();
        return;
    }
    var csv = Array.from(hr013SkillPickerDraftSet).join(",");
    if (hr013SkillPickerContext && hr013SkillPickerContext.type === "grid" && hr013SkillPickerContext.row) {
        hr013SkillPickerContext.row.update({
            skl_id_lst: getHr013SkillArrayFromCsv(csv),
            stack_txt: csv,
            stack_txt_nm: getSkillLabelList(csv)
        });
        changedTabs.tab3 = true;
        closeHr013SkillPicker();
        return;
    }

    if (stackTagInput) {
        stackTagInput.setFromValue(csv);
    } else {
        $("#write_hr013_stack_txt").val(csv);
    }
    pendingStackValue = csv;
    closeHr013SkillPicker();
}

function buildHr013SkillPickerTable() {
    if (hr013SkillPickerTable || !window.Tabulator || !document.getElementById("TABLE_HR013_SKILL_PICKER")) {
        return;
    }

    hr013SkillPickerTable = new Tabulator("#TABLE_HR013_SKILL_PICKER", {
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
            { title: "기술", field: "skills", hozAlign: "left", formatter: hr013SkillFormatter, widthGrow: 3 }
        ],
        data: []
    });
    hr013SkillPickerTableReady = false;
}

function syncHr013SkillPickerUi(forceRebuild) {
    var totalCount = Array.isArray(hr013SkillOptions) ? hr013SkillOptions.length : 0;
    var selectedCount = getHr013PickerSelectedSet().size;
    $("#hr013-skill-picker-meta").text("전체 기술 " + totalCount + "개 / 선택 " + selectedCount + "개");

    if (!hr013SkillPickerTable) {
        return;
    }

    if (!forceRebuild && hr013SkillPickerTableReady) {
        syncHr013SkillPickerChipState();
        return;
    }

    var tableElement = hr013SkillPickerTable.getElement ? hr013SkillPickerTable.getElement() : null;
    var holder = tableElement ? tableElement.querySelector(".tabulator-tableHolder") : null;
    var prevTop = holder ? holder.scrollTop : 0;
    var prevLeft = holder ? holder.scrollLeft : 0;

    var afterRender = function () {
        hr013SkillPickerTableReady = true;
        syncHr013SkillPickerChipState();
        var currentElement = hr013SkillPickerTable.getElement ? hr013SkillPickerTable.getElement() : null;
        var currentHolder = currentElement ? currentElement.querySelector(".tabulator-tableHolder") : null;
        if (currentHolder) {
            currentHolder.scrollTop = prevTop;
            currentHolder.scrollLeft = prevLeft;
        }
    };

    var setResult = hr013SkillPickerTable.setData(buildHr013SkillPickerRows());
    if (setResult && typeof setResult.then === "function") {
        setResult.then(afterRender);
    } else {
        setTimeout(afterRender, 0);
    }
}

function syncHr013SkillPickerChipState() {
    var selectedCodes = getHr013PickerSelectedSet();
    $("#TABLE_HR013_SKILL_PICKER .hr013-skill-chip").each(function () {
        var code = String($(this).data("code") || "");
        $(this).toggleClass("is-selected", selectedCodes.has(code));
    });
}

function getHr013PickerSelectedSet() {
    if (hr013SkillPickerDraftSet instanceof Set) {
        return hr013SkillPickerDraftSet;
    }
    return getHr013SelectedCodeSet();
}

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

function getHr013GroupCode(skillCode) {
    var code = String(skillCode || "").trim();
    if (!code) {
        return "";
    }
    return code.substring(0, 2).toUpperCase();
}

function buildHr013GroupNameMap() {
    var groupNameMap = {};
    (hr013SkillGroupOptions || []).forEach(function (group) {
        var groupCode = String(group.cd || "").toUpperCase();
        if (!groupCode) {
            return;
        }
        groupNameMap[groupCode] = group.cd_nm || groupCode;
    });
    return groupNameMap;
}

function buildHr013SkillPickerRows() {
    var groupRows = [];
    var groupMap = {};

    (hr013SkillGroupOptions || []).forEach(function (group, idx) {
        var groupCode = String(group.cd || "").toUpperCase();
        if (!groupCode) {
            return;
        }
        var row = {
            groupCode: groupCode,
            groupName: group.cd_nm || groupCode,
            sortOrder: idx,
            skills: []
        };
        groupMap[groupCode] = row;
        groupRows.push(row);
    });

    (hr013SkillOptions || []).forEach(function (skill) {
        var code = String(skill.cd || "");
        if (!code) {
            return;
        }
        var groupCode = getHr013GroupCode(code);
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

function hr013SkillFormatter(cell) {
    var skills = cell.getValue() || [];
    if (!skills.length) {
        return "";
    }

    var selectedCodes = getHr013PickerSelectedSet();
    var html = skills.map(function (skill) {
        var code = String(skill.code || "");
        var label = String(skill.label || code);
        var selectedClass = selectedCodes.has(code) ? " is-selected" : "";
        return "<button type='button' class='hr013-skill-chip" + selectedClass +
            "' data-code='" + hr013EscapeHtmlAttr(code) + "'>" + hr013EscapeHtml(label) + "</button>";
    }).join("");

    return "<div class='hr013-skill-chip-wrap'>" + html + "</div>";
}

function hr013EscapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function hr013EscapeHtmlAttr(value) {
    return hr013EscapeHtml(value);
}

function selectHr013Skill(skillCode, fromSearch) {
    var code = String(skillCode || "").trim();
    if (!code) {
        return;
    }

    if (!(hr013SkillPickerDraftSet instanceof Set)) {
        hr013SkillPickerDraftSet = getHr013SelectedCodeSet();
    }
    hr013SkillPickerDraftSet.add(code);
    syncHr013SkillPickerUi();
    focusHr013Skill(code);

    if (fromSearch) {
        $("#hr013-skill-picker-search").val("");
        $("#hr013-skill-picker-suggest").hide().empty();
        hr013SkillSuggestActiveIndex = -1;
    }
}

function toggleHr013Skill(skillCode) {
    var code = String(skillCode || "").trim();
    if (!code) {
        return;
    }

    if (!(hr013SkillPickerDraftSet instanceof Set)) {
        hr013SkillPickerDraftSet = getHr013SelectedCodeSet();
    }

    if (hr013SkillPickerDraftSet.has(code)) {
        hr013SkillPickerDraftSet.delete(code);
    } else {
        hr013SkillPickerDraftSet.add(code);
    }
    syncHr013SkillPickerUi();
    focusHr013Skill(code);
}

function focusHr013Skill(skillCode) {
    setTimeout(function () {
        var code = String(skillCode || "");
        if (!code) {
            return;
        }
        var $chip = $("#TABLE_HR013_SKILL_PICKER .hr013-skill-chip").filter(function () {
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

function findHr013SkillMatches(keyword, limit) {
    var query = String(keyword || "").trim().toLowerCase();
    if (!query) {
        return [];
    }
    var max = limit || 20;
    var groupNameMap = buildHr013GroupNameMap();

    return (hr013SkillOptions || [])
        .map(function (skill) {
            var code = String(skill.cd || "");
            var label = String(skill.cd_nm || code);
            var groupCode = getHr013GroupCode(code);
            return {
                code: code,
                label: label,
                groupName: groupNameMap[groupCode] || groupCode || "기타"
            };
        })
        .filter(function (skill) {
            var codeMatch = skill.code.toLowerCase().indexOf(query) >= 0;
            var labelMatch = skill.label.toLowerCase().indexOf(query) >= 0;
            return codeMatch || labelMatch;
        })
        .sort(function (a, b) {
            return a.label.localeCompare(b.label, "ko");
        })
        .slice(0, max);
}

function renderHr013SkillSuggestions(keyword) {
    var $suggest = $("#hr013-skill-picker-suggest");
    var query = String(keyword || "").trim();
    if (!query) {
        hr013SkillSuggestActiveIndex = -1;
        $suggest.hide().empty();
        return;
    }

    var matches = findHr013SkillMatches(query, 20);
    if (!matches.length) {
        hr013SkillSuggestActiveIndex = -1;
        $suggest.hide().empty();
        return;
    }

    var html = matches.map(function (item) {
        return "<li class='hr013-skill-suggest-item' data-code='" + hr013EscapeHtmlAttr(item.code) + "'>" +
            "<span class='name'>" + hr013EscapeHtml(item.label) + "</span>" +
            "<span class='group'>" + hr013EscapeHtml(item.groupName) + "</span>" +
            "</li>";
    }).join("");

    $suggest.html(html).show();
    hr013SkillSuggestActiveIndex = -1;
    syncHr013SuggestionActive();
}

function moveHr013SuggestionSelection(step) {
    var $items = $("#hr013-skill-picker-suggest .hr013-skill-suggest-item");
    if (!$items.length || !$("#hr013-skill-picker-suggest").is(":visible")) {
        return;
    }
    var max = $items.length - 1;
    if (hr013SkillSuggestActiveIndex < 0) {
        hr013SkillSuggestActiveIndex = step > 0 ? 0 : max;
    } else {
        hr013SkillSuggestActiveIndex += step;
        if (hr013SkillSuggestActiveIndex < 0) {
            hr013SkillSuggestActiveIndex = 0;
        }
        if (hr013SkillSuggestActiveIndex > max) {
            hr013SkillSuggestActiveIndex = max;
        }
    }
    syncHr013SuggestionActive();
}

function syncHr013SuggestionActive() {
    var $items = $("#hr013-skill-picker-suggest .hr013-skill-suggest-item");
    $items.removeClass("is-active");
    if (!$items.length || hr013SkillSuggestActiveIndex < 0) {
        return;
    }
    var $active = $items.eq(hr013SkillSuggestActiveIndex);
    $active.addClass("is-active");
    var container = $("#hr013-skill-picker-suggest").get(0);
    var element = $active.get(0);
    if (container && element && typeof element.scrollIntoView === "function") {
        element.scrollIntoView({ block: "nearest" });
    }
}

function getHr013ActiveSuggestItem() {
    var $items = $("#hr013-skill-picker-suggest .hr013-skill-suggest-item");
    if (!$items.length || hr013SkillSuggestActiveIndex < 0) {
        return $();
    }
    return $items.eq(hr013SkillSuggestActiveIndex);
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
            text: `'당사 여부'를 선택해주세요.`
        });
        return;
    }
    if (!payload.st_dt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'시작일'을 입력해주세요.`
        });
        return;
    }
    if (!payload.ed_dt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'종료일'을 입력해주세요.`
        });
        return;
    }
    if (!payload.cust_nm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'고객사'를 입력해주세요.`
        });
        return;
    }
    if (!payload.prj_nm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'프로젝트명'을 입력해주세요.`
        });
        return;
    }
    if (!payload.rate_amt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'계약단가'를 입력해주세요.`
        });
        return;
    }
    if (!payload.job_cd) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'역할'을 선택해주세요.`
        });
        return;
    }
    if (!payload.alloc_pct) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'투입률'을 입력해주세요.`
        });
        return;
    }
    if (!payload.stack_txt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'기술스택'을 선택해주세요.`
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
        if (!row.inprj_yn || !row.st_dt || !row.ed_dt) {
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
            text: `'프로젝트' 저장 중 오류가 발생했습니다.`
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
        remark: ""
    }, true);

    changedTabs.tab3 = true;
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
    var checked = cell.getValue() ? " checked" : "";
    var disabled = window.hr010ReadOnly ? " disabled" : "";
    return "<input type='checkbox' class='row-check'" + checked + disabled + " />";
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

    if (window.hr010ReadOnly) {
        return "<span class='hr013-stack-text'>" + textHtml + "</span>";
    }
    return "<div class='hr013-stack-cell'>" +
        "<span class='hr013-stack-text'>" + textHtml + "</span>" +
        "<button type='button' class='btn btn-add-skill btn-hr013-cell-skill-picker'>기술 선택</button>" +
        "</div>";
}

function hr013TableSkillCellClick(e, cell) {
    if (!isHr013Editable()) {
        return;
    }
    var target = e && e.target ? e.target : null;
    if (!target || !$(target).closest(".btn-hr013-cell-skill-picker").length) {
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
// function skillDisplayFormatter(cell) {
//     var row = cell.getRow().getData();
//     if (row && row.stack_txt_nm != null && row.stack_txt_nm !== "") {
//         return row.stack_txt_nm;
//     }
//     var value = cell.getValue();
//     return getSkillLabelList(value);
// }

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
    if (value === null || value === undefined) return "";
    var raw = String(value).replace(/[^\d]/g, "");
    if (raw === "") return "";
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

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

$('#btnUpload').on('click', function() {
    $('#excelFile').click();
});

$('#excelFile').on('change', function(e) {
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
                hr013JobOptions.forEach(function(d) {
                    if (item.job_cd.toUpperCase() === d.cd_nm.toUpperCase())
                    {
                        item.job_cd = d.cd;
                        if (!jobcdYn) jobcdYn = true;
                    }
                });
                // 존재하지 않는 job_cd일 경우 공백처리
                if (!jobcdYn)
                    item.job_cd = null;

                var skl_lst = [];
                item.skl_id_lst?.split(',').map(x => x.trim()).forEach(function(skl_id) {
                    hr013SkillOptions.forEach(function(d) {
                        if (skl_id.toUpperCase() === d.cd_nm.toUpperCase())
                        {
                            skl_lst.push({code: d.cd, label: d.cd_nm});
                        }
                    });
                });
                item.skl_id_lst = skl_lst;

                data.push(item);
            })

            window.hr013Table.setData(data);
            changedTabs.tab3 = true;
        },
        error: function (xhr) {
            // 서버 에러도 모달로 표시
            const msg = xhr.responseText || ("HTTP " + xhr.status);
            // openModal(msg);
        }
    });
});
