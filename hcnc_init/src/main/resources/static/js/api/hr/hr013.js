// hr013.js
var stackTagInput = null;
var pendingStackValue = "";
var lastNonInprjCustNm = "";
var hr013DeletedIds = [];
var hr013SkillOptions = [];
var hr013JobOptions = [];

// 프로젝트 탭 초기화 (버튼/콤보/태그/테이블)
window.initTab3 = function () {
    if (!window.hr013Table) buildHr013Table();
    loadHr013TableData();
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
        stackTagInput.setOptions(res || []);
        stackTagInput.setFromValue(pendingStackValue || $("#write_hr013_stack_txt").val());
        if (window.hr013Table) {
            syncStackLabelsFromCodes();
            window.hr013Table.redraw(true);
        }
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
            { title: "계약단가", field: "rate_amt", hozAlign: "right", formatter: amountFormatter, editor: "input", editable: isHr013Editable, cellClick: startEditOnClick , width: 110},
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
            { title: "기술스택", field: "skl_id_lst", hozAlign: "left", editor: tagEditor, formatter: tagFormatter,
                editable: () => currentMode !== "view" },
            // { title: "기술스택", field: "stack_txt", formatter: skillDisplayFormatter, editor: stackTagEditor, editable: isHr013Editable, cellClick: startEditOnClick },
            { title: "투입률", field: "alloc_pct", hozAlign: "right", formatter: percentageFormatter, width: 90, editor: "input", editable: isHr013Editable, cellClick: startEditOnClick },
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

    if (mode === "edit") {
        var rowData = getHr013SelectedRow();

        if (!rowData) {
            alert("수정할 행을 체크해주세요.");
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
    $("#write-hr013-area").hide();
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

                row.skl_id_lst = (row.skl_id_lst !== undefined) ? JSON.parse(row.skl_id_lst) : [];
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
    $("#write_hr013_rate_amt").val(formatNumberInput(data.rate_amt));
    $("#write_hr013_job_cd").val(data.job_cd || "");
    $("#write_hr013_alloc_pct").val(formatPercentInput(data.alloc_pct));
    $("#write_hr013_remark").val(data.remark || "");
    pendingStackValue = data.stack_txt || "";
    if (stackTagInput) {
        stackTagInput.setFromValue(pendingStackValue);
    }


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
        alert("당사 여부를 선택해주세요.");
        return;
    }
    if (!payload.st_dt) {
        alert("시작일을 입력해주세요.");
        return;
    }
    if (!payload.ed_dt) {
        alert("종료일을 입력해주세요.");
        return;
    }
    if (!payload.cust_nm) {
        alert("고객사를 입력해주세요.");
        return;
    }
    if (!payload.prj_nm) {
        alert("프로젝트명을 입력해주세요.");
        return;
    }
    if (!payload.rate_amt) {
        alert("계약단가를 입력해주세요.");
        return;
    }
    if (!payload.job_cd) {
        alert("역할을 선택해주세요.");
        return;
    }
    if (!payload.alloc_pct) {
        alert("투입률을 입력해주세요.");
        return;
    }
    if (!payload.stack_txt) {
        alert("기술스택을 선택해주세요.");
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
                alert("저장에 실패했습니다.");
            }
        },
        error: function () {
            alert("저장 중 오류가 발생했습니다.");
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
function removeHr013SelectedRows() {
    if (!window.hr013Table) {
        return;
    }
    var rows = window.hr013Table.getRows().filter(function (row) {
        return row.getData()._checked;
    });
    if (!rows || rows.length === 0) {
        alert("삭제할 행을 선택해주세요.");
        return;
    }
    if (!confirm("선택한 행을 정말로 삭제하시겠습니까?")) {
        return;
    }
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

    var requests = [];

    rows.forEach(function (row) {
        const code = $(row.skl_id_lst[0]).map(x => x.code);

        if (!row.inprj_yn || !row.st_dt || !row.ed_dt) {
            return;
        }
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
                rate_amt: row.rate_amt || "",
                job_cd: row.job_cd || "",
                stack_txt: Object.values(row.skl_id_lst).map(item => item.code).toString() || "", //row.stack_txt || "",
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
        alert("프로젝트 저장 중 오류가 발생했습니다.");
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
    if (cell && typeof cell.getRow === "function") {
        return cell;
    }
    if (e && typeof e.getRow === "function") {
        return e;
    }
    return null;
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

    // 에디터 종료/저장
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
                // After adding the last tag, close and save the editor.
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
        var codes = normalizeTagValue(data.stack_txt || "");
        var nextLabel = getSkillLabelList(codes);
        if (codes && data.stack_txt_nm !== nextLabel) {
            row.update({ stack_txt: codes, stack_txt_nm: nextLabel });
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
function amountFormatter(cell) {
    if (cell.getValue() === null || cell.getValue() === undefined || cell.getValue() === "") {
        return "";
    }
    return formatNumberInput(cell.getValue());

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

    if (!file) return alert("파일을 선택하세요.");
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